from datetime import datetime, timezone
from bson import ObjectId
from typing import List, Optional
from app.core.database import get_collection
from fastapi import HTTPException
import math


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
    @property
    def col(self):
        return get_collection("attendance")

    async def take_attendance(self, course_id: str, date: datetime, records: list, marked_by: str) -> dict:
        now = datetime.now(timezone.utc)
        docs = []
        for record in records:
            docs.append({
                "student_id": record["student_id"],
                "course_id": course_id,
                "date": date,
                "status": record["status"],
                "marked_by": marked_by,
                "created_at": now,
            })

        if docs:
            # Remove existing attendance for same course+date
            await self.col.delete_many({"course_id": course_id, "date": date})
            await self.col.insert_many(docs)

        return {"message": f"Attendance taken for {len(docs)} students", "date": str(date)}

    async def get_student_attendance(self, student_id: str, course_id: Optional[str] = None) -> List[dict]:
        query = {"student_id": student_id}
        if course_id:
            query["course_id"] = course_id

        courses_col = get_collection("courses")
        records = []
        async for r in self.col.find(query).sort("date", -1):
            course = await courses_col.find_one({"_id": ObjectId(r["course_id"])}) if r.get("course_id") else None
            r["id"] = str(r.pop("_id"))
            r["course_name"] = course["name"] if course else None
            records.append(r)

        return records

    async def get_attendance_summary(self, student_id: str) -> List[dict]:
        courses_col = get_collection("courses")
        pipeline = [
            {"$match": {"student_id": student_id}},
            {"$group": {
                "_id": "$course_id",
                "total": {"$sum": 1},
                "present": {"$sum": {"$cond": [{"$eq": ["$status", "present"]}, 1, 0]}},
                "absent": {"$sum": {"$cond": [{"$eq": ["$status", "absent"]}, 1, 0]}},
                "late": {"$sum": {"$cond": [{"$eq": ["$status", "late"]}, 1, 0]}},
            }},
        ]

        summaries = []
        async for group in self.col.aggregate(pipeline):
            course = await courses_col.find_one({"_id": ObjectId(group["_id"])})
            percentage = (group["present"] / group["total"] * 100) if group["total"] > 0 else 0
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

    async def get_course_attendance(self, course_id: str, date: Optional[datetime] = None) -> List[dict]:
        query = {"course_id": course_id}
        if date:
            # Match same day
            from datetime import timedelta
            start = date.replace(hour=0, minute=0, second=0)
            end = start + timedelta(days=1)
            query["date"] = {"$gte": start, "$lt": end}

        students_col = get_collection("students")
        users_col = get_collection("users")
        records = []
        async for r in self.col.find(query).sort("date", -1):
            student = await students_col.find_one({"_id": ObjectId(r["student_id"])}) if r.get("student_id") else None
            student_name = "Unknown"
            if student:
                user = await users_col.find_one({"_id": ObjectId(student["user_id"])})
                student_name = user["full_name"] if user else "Unknown"

            r["id"] = str(r.pop("_id"))
            r["student_name"] = student_name
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
