from datetime import date, datetime, time, timedelta, timezone
from bson import ObjectId
from typing import List, Optional
from app.core.database import get_collection
from fastapi import HTTPException, status


def calc_grade(percentage: float) -> tuple:
    """Returns (grade, grade_point)"""
    if percentage >= 90:
        return "O", 10.0
    elif percentage >= 80:
        return "A+", 9.0
    elif percentage >= 70:
        return "A", 8.0
    elif percentage >= 60:
        return "B+", 7.0
    elif percentage >= 50:
        return "B", 6.0
    elif percentage >= 40:
        return "C", 5.0
    else:
        return "F", 0.0


class AttendanceService:
    _student_course_order = (
        "BAS303",
        "BVE301",
        "BCS301",
        "BCS302",
        "BCS303",
        "BCC302",
        "BCS351",
        "BCS352",
        "BCS353",
        "BCC351",
    )
    _course_order = (
        "BCS301",
        "BCS302",
        "BCS303",
        "BAS303",
        "BVE301",
        "BCC302",
        "BCS351",
        "BCS352",
        "BCS353",
        "BCC351",
    )

    def __init__(self):
        self._index_ready = False

    @property
    def col(self):
        return get_collection("attendance")

    @staticmethod
    def normalize_date(value: date | datetime | str) -> datetime:
        if isinstance(value, str):
            value = datetime.fromisoformat(value.replace("Z", "+00:00"))
        if isinstance(value, datetime):
            day = value.date()
        else:
            day = value
        return datetime.combine(day, time.min, tzinfo=timezone.utc)

    async def ensure_indexes(self):
        if self._index_ready:
            return

        duplicates: dict[tuple[str, str, datetime], list[dict]] = {}
        async for record in self.col.find({"date": {"$exists": True}}):
            normalized_date = self.normalize_date(record["date"])
            student_id = record.get("student_id")
            course_id = record.get("course_id")
            if not isinstance(student_id, str) or not isinstance(course_id, str):
                await self.col.update_one({"_id": record["_id"]}, {"$set": {"date": normalized_date}})
                continue
            key = (student_id, course_id, normalized_date)
            duplicates.setdefault(key, []).append(record)

        for (_, _, normalized_date), records in duplicates.items():
            def updated_timestamp(record):
                value = record.get("updated_at") or record.get("created_at")
                if not isinstance(value, datetime):
                    return 0.0
                if value.tzinfo is None:
                    value = value.replace(tzinfo=timezone.utc)
                return value.timestamp()

            records.sort(
                key=lambda record: (updated_timestamp(record), str(record["_id"])),
                reverse=True,
            )
            keep = records[0]
            await self.col.update_one(
                {"_id": keep["_id"]},
                {"$set": {"date": normalized_date}},
            )
            if len(records) > 1:
                await self.col.delete_many({"_id": {"$in": [record["_id"] for record in records[1:]]}})

        index_name = "uniq_attendance_student_course_date"
        expected_key = [("student_id", 1), ("course_id", 1), ("date", 1)]
        indexes = await self.col.index_information()
        existing_index = indexes.get(index_name)
        if existing_index:
            if existing_index.get("key") != expected_key or not existing_index.get("unique"):
                raise RuntimeError("Attendance unique index exists with an incompatible definition")
        else:
            await self.col.create_index(
                expected_key,
                unique=True,
                partialFilterExpression={
                    "student_id": {"$type": "string"},
                    "course_id": {"$type": "string"},
                    "date": {"$type": "date"},
                },
                name=index_name,
            )
        self._index_ready = True

    async def get_manageable_courses(self, current_user: dict) -> List[dict]:
        courses_col = get_collection("courses")
        departments_col = get_collection("departments")
        if current_user.get("role") not in {"teacher", "admin"}:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Teacher or Admin access required")
        query = {"semester": 3, "is_active": {"$ne": False}}

        courses = []
        async for course in courses_col.find(query):
            department = await departments_col.find_one({"_id": ObjectId(course["department_id"])}) if course.get("department_id") else None
            if not department or department.get("code", "").upper() != "CSE":
                continue
            course = dict(course)
            course["id"] = str(course.pop("_id"))
            course.pop("faculty_name", None)
            course.pop("teacher_name", None)
            courses.append(course)
        order = {code: index for index, code in enumerate(self._course_order)}
        courses.sort(key=lambda course: (order.get(course["code"], len(order)), course["code"]))
        return courses

    async def get_student_curriculum_courses(self, current_user: dict) -> List[dict]:
        student = await get_collection("students").find_one({"user_id": str(current_user["_id"])})
        if not student or student.get("semester") is None or not student.get("department_id"):
            return []

        department = await get_collection("departments").find_one({"_id": ObjectId(student["department_id"])})
        student_branch = str(student.get("branch") or (department or {}).get("code", "")).upper()
        if not department or department.get("code", "").upper() != "CSE" or student_branch != "CSE":
            return []

        query = {
            "department_id": str(department["_id"]),
            "semester": student["semester"],
            "is_active": {"$ne": False},
            "branch": "CSE",
            "code": {"$in": list(self._student_course_order)},
        }
        courses = []
        async for course in get_collection("courses").find(query):
            courses.append({
                "id": str(course["_id"]),
                "name": course["name"],
                "code": course["code"],
                "department_id": course["department_id"],
                "semester": course["semester"],
                "branch": course.get("branch"),
                "credits": course.get("credits"),
                "subject_type": course.get("subject_type"),
                "is_active": course.get("is_active", True),
            })
        order = {code: index for index, code in enumerate(self._student_course_order)}
        courses.sort(key=lambda course: (order.get(course["code"], len(order)), course["code"]))
        return courses

    async def _enrich_course(self, course: dict) -> dict:
        course = dict(course)
        teacher_name = course.get("faculty_name")
        if course.get("teacher_id"):
            teacher = await get_collection("teachers").find_one({"_id": ObjectId(course["teacher_id"])})
            if teacher:
                user = await get_collection("users").find_one({"_id": ObjectId(teacher["user_id"])})
                teacher_name = user.get("full_name") if user else teacher_name
        course["id"] = str(course.pop("_id"))
        course["teacher_name"] = teacher_name
        return course

    async def get_manageable_course(self, course_id: str, current_user: dict) -> dict:
        if not ObjectId.is_valid(course_id):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")

        course = await get_collection("courses").find_one({"_id": ObjectId(course_id), "is_active": {"$ne": False}})
        if not course or course.get("semester") != 3:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Semester III course not found")

        department = await get_collection("departments").find_one({"_id": ObjectId(course["department_id"])}) if course.get("department_id") else None
        if not department or department.get("code", "").upper() != "CSE":
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Semester III CSE course not found")

        if current_user.get("role") not in {"teacher", "admin"}:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Teacher or Admin access required")

        return course

    async def get_course_roster(self, course: dict, attendance_date: date | datetime | str) -> dict:
        day = self.normalize_date(attendance_date)
        query = {
            "department_id": course["department_id"],
            "semester": course["semester"],
            "is_active": {"$ne": False},
        }
        courses_col = get_collection("courses")
        students_col = get_collection("students")
        users_col = get_collection("users")
        roster = []
        student_ids = []
        async for student in students_col.find(query).sort("enrollment_number", 1):
            if not ObjectId.is_valid(str(student.get("user_id", ""))):
                continue
            user = await users_col.find_one({"_id": ObjectId(student["user_id"])})
            if not user or user.get("role") != "student" or not user.get("is_active", True):
                continue
            student_id = str(student["_id"])
            student_ids.append(student_id)
            roster.append({
                "id": student_id,
                "student_id": student_id,
                "full_name": user.get("full_name", "Unknown"),
                "enrollment_number": student.get("enrollment_number"),
                "attendance_status": None,
                "attendance_percentage": 0.0,
            })

        records = await self.col.find({
            "course_id": str(course["_id"]),
            "date": day,
            "student_id": {"$in": student_ids},
        }).to_list(length=None) if student_ids else []
        status_by_student = {record["student_id"]: record["status"] for record in records}
        history: dict[str, dict[str, int]] = {}
        if student_ids:
            async for record in self.col.find({"course_id": str(course["_id"]), "student_id": {"$in": student_ids}}):
                counts = history.setdefault(record["student_id"], {"attended": 0, "total": 0})
                counts["total"] += 1
                if record.get("status") in {"present", "late"}:
                    counts["attended"] += 1

        for student in roster:
            student_id = student["id"]
            student["attendance_status"] = status_by_student.get(student_id)
            counts = history.get(student_id, {"attended": 0, "total": 0})
            student["attendance_percentage"] = round(counts["attended"] / counts["total"] * 100, 2) if counts["total"] else 0.0

        present = sum(1 for record in records if record.get("status") == "present")
        absent = sum(1 for record in records if record.get("status") == "absent")
        late = sum(1 for record in records if record.get("status") == "late")
        marked = min(len(records), len(roster))
        summary = {
            "present": present,
            "absent": absent,
            "late": late,
            "marked": marked,
            "total_students": len(roster),
            "coverage": round(marked / len(roster) * 100, 2) if roster else 0.0,
        }
        return {"course_id": str(course["_id"]), "date": day, "students": roster, "summary": summary}

    async def take_attendance(self, course: dict, attendance_date: date | datetime | str, records: list, recorded_by: str) -> dict:
        await self.ensure_indexes()
        day = self.normalize_date(attendance_date)
        roster = await self.get_course_roster(course, day)
        roster_ids = {student["id"] for student in roster["students"]}
        seen = set()
        now = datetime.now(timezone.utc)
        updated_count = 0

        for record in records:
            student_id = str(record["student_id"])
            if student_id not in roster_ids:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Attendance includes a student outside this course roster")
            if student_id in seen:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Attendance contains duplicate student entries")
            seen.add(student_id)
            await self.col.update_one(
                {"student_id": student_id, "course_id": str(course["_id"]), "date": day},
                {
                    "$set": {
                        "status": record["status"],
                        "marked_by": recorded_by,
                        "recorded_by": recorded_by,
                        "updated_at": now,
                    },
                    "$setOnInsert": {
                        "student_id": student_id,
                        "course_id": str(course["_id"]),
                        "date": day,
                        "created_at": now,
                    },
                },
                upsert=True,
            )
            updated_count += 1

        return {
            "message": "Attendance saved successfully",
            "updated_count": updated_count,
            "date": day,
            "summary": (await self.get_course_roster(course, day))["summary"],
        }

    async def get_student_attendance(self, student_id: str, course_id: Optional[str] = None) -> List[dict]:
        query = {"student_id": student_id}
        if course_id:
            query["course_id"] = course_id

        courses_col = get_collection("courses")
        records = []
        async for r in self.col.find(query).sort("date", -1):
            course = await courses_col.find_one({"_id": ObjectId(r["course_id"])}) if r.get("course_id") and ObjectId.is_valid(r["course_id"]) else None
            r["id"] = str(r.pop("_id"))
            r["course_name"] = course["name"] if course else None
            records.append(r)

        return records

    async def get_student_course_summary(self, student_id: str, course_id: str) -> dict:
        courses_col = get_collection("courses")
        course = await courses_col.find_one({"_id": ObjectId(course_id)}) if ObjectId.is_valid(course_id) else None
        if not course or course.get("is_active") is False:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")

        records = await self.col.find({"student_id": student_id, "course_id": course_id}).to_list(length=None)
        present = sum(1 for record in records if record.get("status") == "present")
        absent = sum(1 for record in records if record.get("status") == "absent")
        late = sum(1 for record in records if record.get("status") == "late")
        total = len(records)
        return {
            "course_id": course_id,
            "course_code": course["code"],
            "course_name": course["name"],
            "present": present,
            "absent": absent,
            "late": late,
            "total_classes": total,
            "attendance_percentage": round((present + late) / total * 100, 2) if total else 0.0,
            "has_records": total > 0,
        }

    async def get_attendance_summary(self, student_id: str) -> List[dict]:
        courses_col = get_collection("courses")
        pipeline = [
            {"$match": {"student_id": student_id}},
            {"$group": {
                "_id": "$course_id",
                "total": {"$sum": 1},
                "present": {"$sum": {"$cond": [{"$eq": ["$status", "present"]}, 1, 0]}},
                "late": {"$sum": {"$cond": [{"$eq": ["$status", "late"]}, 1, 0]}},
                "absent": {"$sum": {"$cond": [{"$eq": ["$status", "absent"]}, 1, 0]}},
            }},
        ]

        summaries = []
        async for group in self.col.aggregate(pipeline):
            course = await courses_col.find_one({"_id": ObjectId(group["_id"])}) if ObjectId.is_valid(group["_id"]) else None
            percentage = ((group["present"] + group["late"]) / group["total"] * 100) if group["total"] > 0 else 0
            summaries.append({
                "course_id": group["_id"],
                "course_name": course["name"] if course else "Unknown",
                "total": group["total"],
                "present": group["present"],
                "absent": group["absent"],
                "late": group["late"],
                "percentage": round(percentage, 2),
            })

        return summaries

    async def get_course_attendance(
        self,
        course_id: str,
        attendance_date: Optional[date | datetime | str] = None,
        from_date: Optional[date | datetime | str] = None,
        to_date: Optional[date | datetime | str] = None,
    ) -> List[dict]:
        query = {"course_id": course_id}
        if attendance_date:
            day = self.normalize_date(attendance_date)
            query["date"] = day
        elif from_date or to_date:
            bounds = {}
            if from_date:
                bounds["$gte"] = self.normalize_date(from_date)
            if to_date:
                bounds["$lt"] = self.normalize_date(to_date) + timedelta(days=1)
            query["date"] = bounds

        courses_col = get_collection("courses")
        students_col = get_collection("students")
        users_col = get_collection("users")
        users_cache = {}
        course_doc = await courses_col.find_one({"_id": ObjectId(course_id)}) if ObjectId.is_valid(course_id) else None
        records = []
        async for r in self.col.find(query).sort("date", -1):
            student = await students_col.find_one({"_id": ObjectId(r["student_id"])}) if r.get("student_id") and ObjectId.is_valid(r["student_id"]) else None
            student_name = "Unknown"
            enrollment_number = ""
            if student:
                enrollment_number = student.get("enrollment_number", "")
                user_id = student.get("user_id")
                user = users_cache.get(user_id)
                if user is None and user_id and ObjectId.is_valid(user_id):
                    user = await users_col.find_one({"_id": ObjectId(user_id)})
                    users_cache[user_id] = user
                student_name = user["full_name"] if user else "Unknown"

            r["id"] = str(r.pop("_id"))
            r["student_name"] = student_name
            r["enrollment_number"] = enrollment_number
            r["course_name"] = course_doc.get("name") if course_doc else None
            records.append(r)

        return records


class ResultService:
    @property
    def col(self):
        return get_collection("results")

    async def add_result(self, data: dict) -> dict:
        now = datetime.now(timezone.utc)
        total = data["internal_marks"] + data["external_marks"] + (data.get("practical_marks") or 0)
        max_total = data["max_internal"] + data["max_external"] + (data.get("max_practical") or 0)
        percentage = (total / max_total * 100) if max_total > 0 else 0
        grade, grade_point = calc_grade(percentage)

        doc = {
            **data,
            "total_marks": total,
            "max_marks": max_total,
            "percentage": round(percentage, 2),
            "grade": grade,
            "grade_point": grade_point,
            "is_pass": grade != "F",
            "credits": 3,  # default
            "created_at": now,
            "updated_at": now,
        }

        # Check if result already exists
        existing = await self.col.find_one({
            "student_id": data["student_id"],
            "course_id": data["course_id"],
            "semester_id": data["semester_id"],
        })

        if existing:
            await self.col.update_one({"_id": existing["_id"]}, {"$set": doc})
            doc["_id"] = existing["_id"]
        else:
            result = await self.col.insert_one(doc)
            doc["_id"] = result.inserted_id

        return await self._enrich_result(doc)

    async def _enrich_result(self, result: dict) -> dict:
        courses_col = get_collection("courses")
        students_col = get_collection("students")
        users_col = get_collection("users")

        course = await courses_col.find_one({"_id": ObjectId(result["course_id"])}) if result.get("course_id") else None
        student = await students_col.find_one({"_id": ObjectId(result["student_id"])}) if result.get("student_id") else None

        student_name = "Unknown"
        if student:
            user = await users_col.find_one({"_id": ObjectId(student["user_id"])})
            student_name = user["full_name"] if user else "Unknown"

        result["id"] = str(result.pop("_id"))
        result["course_name"] = course["name"] if course else None
        result["student_name"] = student_name
        return result

    async def get_student_results(self, student_id: str, semester_id: Optional[str] = None) -> List[dict]:
        query = {"student_id": student_id}
        if semester_id:
            query["semester_id"] = semester_id

        results = []
        async for r in self.col.find(query):
            enriched = await self._enrich_result(r)
            results.append(enriched)

        return results

    async def calculate_cgpa(self, student_id: str) -> dict:
        students_col = get_collection("students")
        users_col = get_collection("users")
        student = await students_col.find_one({"_id": ObjectId(student_id)})
        user = await users_col.find_one({"_id": ObjectId(student["user_id"])}) if student else None

        results = []
        async for r in self.col.find({"student_id": student_id}):
            results.append(r)

        if not results:
            return {"student_id": student_id, "cgpa": 0, "total_credits": 0, "semester_results": []}

        total_gp = sum(r.get("grade_point", 0) * r.get("credits", 3) for r in results)
        total_credits = sum(r.get("credits", 3) for r in results)
        cgpa = round(total_gp / total_credits, 2) if total_credits > 0 else 0

        # Group by semester
        semester_map = {}
        for r in results:
            sem = r.get("semester_id", "unknown")
            if sem not in semester_map:
                semester_map[sem] = []
            semester_map[sem].append(r)

        semester_results = []
        for sem_id, sem_results in semester_map.items():
            sem_gp = sum(r.get("grade_point", 0) * r.get("credits", 3) for r in sem_results)
            sem_credits = sum(r.get("credits", 3) for r in sem_results)
            sem_gpa = round(sem_gp / sem_credits, 2) if sem_credits > 0 else 0
            semester_results.append({"semester_id": sem_id, "gpa": sem_gpa, "credits": sem_credits, "subjects": len(sem_results)})

        return {
            "student_id": student_id,
            "student_name": user["full_name"] if user else "Unknown",
            "cgpa": cgpa,
            "total_credits": total_credits,
            "semester_results": semester_results,
        }

    async def get_top_performers(self, department_id: Optional[str] = None, limit: int = 10) -> List[dict]:
        pipeline = [
            {"$group": {
                "_id": "$student_id",
                "avg_grade_point": {"$avg": "$grade_point"},
                "total_subjects": {"$sum": 1},
            }},
            {"$sort": {"avg_grade_point": -1}},
            {"$limit": limit},
        ]

        performers = []
        students_col = get_collection("students")
        users_col = get_collection("users")

        async for p in self.col.aggregate(pipeline):
            student = await students_col.find_one({"_id": ObjectId(p["_id"])})
            if student:
                if department_id and student.get("department_id") != department_id:
                    continue
                user = await users_col.find_one({"_id": ObjectId(student["user_id"])})
                performers.append({
                    "student_id": p["_id"],
                    "student_name": user["full_name"] if user else "Unknown",
                    "cgpa": round(p["avg_grade_point"], 2),
                    "total_subjects": p["total_subjects"],
                    "enrollment_number": student.get("enrollment_number", ""),
                })

        return performers


class AssignmentService:
    @property
    def assignments_col(self):
        return get_collection("assignments")

    @property
    def submissions_col(self):
        return get_collection("submissions")

    async def create_assignment(self, data: dict, teacher_id: str) -> dict:
        now = datetime.now(timezone.utc)
        doc = {**data, "teacher_id": teacher_id, "is_active": True, "created_at": now, "updated_at": now}
        result = await self.assignments_col.insert_one(doc)
        doc["_id"] = result.inserted_id
        return await self._enrich_assignment(doc)

    async def _enrich_assignment(self, assignment: dict) -> dict:
        courses_col = get_collection("courses")
        teachers_col = get_collection("teachers")
        users_col = get_collection("users")

        course = await courses_col.find_one({"_id": ObjectId(assignment["course_id"])}) if assignment.get("course_id") else None
        teacher = await teachers_col.find_one({"_id": ObjectId(assignment["teacher_id"])}) if assignment.get("teacher_id") else None
        teacher_name = "Unknown"
        if teacher:
            user = await users_col.find_one({"_id": ObjectId(teacher["user_id"])})
            teacher_name = user["full_name"] if user else "Unknown"

        sub_count = await self.submissions_col.count_documents({"assignment_id": str(assignment.get("_id", assignment.get("id", "")))})

        assignment["id"] = str(assignment.pop("_id")) if "_id" in assignment else assignment.get("id", "")
        assignment["course_name"] = course["name"] if course else None
        assignment["teacher_name"] = teacher_name
        assignment["submission_count"] = sub_count
        return assignment

    async def list_assignments(self, course_id: Optional[str] = None, teacher_id: Optional[str] = None) -> List[dict]:
        query = {"is_active": True}
        if course_id:
            query["course_id"] = course_id
        if teacher_id:
            query["teacher_id"] = teacher_id

        assignments = []
        async for a in self.assignments_col.find(query).sort("created_at", -1):
            enriched = await self._enrich_assignment(a)
            assignments.append(enriched)

        return assignments

    async def submit_assignment(self, assignment_id: str, student_id: str, content: str, file_url: str) -> dict:
        assignment = await self.assignments_col.find_one({"_id": ObjectId(assignment_id)})
        if not assignment:
            raise HTTPException(status_code=404, detail="Assignment not found")

        now = datetime.now(timezone.utc)
        is_late = now > assignment["due_date"]

        # Check if already submitted
        existing = await self.submissions_col.find_one({
            "assignment_id": assignment_id,
            "student_id": student_id,
        })

        doc = {
            "assignment_id": assignment_id,
            "student_id": student_id,
            "content": content,
            "file_url": file_url,
            "submitted_at": now,
            "is_late": is_late,
            "is_graded": False,
            "marks_obtained": None,
            "feedback": None,
        }

        if existing:
            await self.submissions_col.update_one({"_id": existing["_id"]}, {"$set": doc})
            doc["_id"] = existing["_id"]
        else:
            result = await self.submissions_col.insert_one(doc)
            doc["_id"] = result.inserted_id

        doc["id"] = str(doc.pop("_id"))
        return doc

    async def grade_submission(self, submission_id: str, marks: float, feedback: str) -> dict:
        await self.submissions_col.update_one(
            {"_id": ObjectId(submission_id)},
            {"$set": {"marks_obtained": marks, "feedback": feedback, "is_graded": True}},
        )
        sub = await self.submissions_col.find_one({"_id": ObjectId(submission_id)})
        sub["id"] = str(sub.pop("_id"))
        return sub

    async def get_student_submissions(self, student_id: str) -> List[dict]:
        submissions = []
        async for s in self.submissions_col.find({"student_id": student_id}):
            assignment = await self.assignments_col.find_one({"_id": ObjectId(s["assignment_id"])}) if s.get("assignment_id") else None
            s["id"] = str(s.pop("_id"))
            s["assignment_title"] = assignment["title"] if assignment else None
            submissions.append(s)
        return submissions


attendance_service = AttendanceService()
result_service = ResultService()
assignment_service = AssignmentService()
