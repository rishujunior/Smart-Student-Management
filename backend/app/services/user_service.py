from datetime import datetime, timezone
from bson import ObjectId
from typing import List, Optional, Tuple
from app.core.database import get_collection
from fastapi import HTTPException, status


def parse_id(doc: dict) -> dict:
    doc["id"] = str(doc.pop("_id"))
    return doc


class StudentService:
    @property
    def students_col(self):
        return get_collection("students")

    @property
    def users_col(self):
        return get_collection("users")

    @property
    def departments_col(self):
        return get_collection("departments")

    async def create_student(self, data: dict) -> dict:
        # Verify user exists
        user = await self.users_col.find_one({"_id": ObjectId(data["user_id"])})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        # Check enrollment number uniqueness
        existing = await self.students_col.find_one({"enrollment_number": data["enrollment_number"]})
        if existing:
            raise HTTPException(status_code=400, detail="Enrollment number already exists")

        now = datetime.now(timezone.utc)
        student_doc = {**data, "created_at": now, "updated_at": now, "is_active": True}
        if "user_id" in student_doc:
            student_doc["user_id"] = data["user_id"]

        result = await self.students_col.insert_one(student_doc)
        
        # Update user role
        await self.users_col.update_one(
            {"_id": ObjectId(data["user_id"])},
            {"$set": {"role": "student"}},
        )

        return await self._get_student_with_details(str(result.inserted_id))

    async def _get_student_with_details(self, student_id: str) -> Optional[dict]:
        student = await self.students_col.find_one({"_id": ObjectId(student_id)})
        if not student:
            return None

        user = await self.users_col.find_one({"_id": ObjectId(student["user_id"])})
        dept = await self.departments_col.find_one({"_id": ObjectId(student["department_id"])}) if student.get("department_id") else None

        result = parse_id(student)
        result["full_name"] = user["full_name"] if user else "Unknown"
        result["email"] = user["email"] if user else ""
        result["avatar"] = user.get("avatar") if user else None
        result["department_name"] = dept["name"] if dept else None
        result["branch"] = student.get("branch") or (dept.get("code") if dept else None)
        return result

    async def get_student_by_user_id(self, user_id: str) -> Optional[dict]:
        student = await self.students_col.find_one({"user_id": user_id})
        if not student:
            return None
        return await self._get_student_with_details(str(student["_id"]))

    async def list_students(self, department_id: Optional[str] = None, semester: Optional[int] = None, skip: int = 0, limit: int = 50) -> Tuple[List[dict], int]:
        query = {}
        if department_id:
            query["department_id"] = department_id
        if semester:
            query["semester"] = semester

        total = await self.students_col.count_documents(query)
        cursor = self.students_col.find(query).skip(skip).limit(limit)
        students = []
        async for s in cursor:
            details = await self._get_student_with_details(str(s["_id"]))
            if details:
                students.append(details)

        return students, total

    async def update_student(self, student_id: str, updates: dict) -> dict:
        updates["updated_at"] = datetime.now(timezone.utc)
        await self.students_col.update_one(
            {"_id": ObjectId(student_id)}, {"$set": updates}
        )
        return await self._get_student_with_details(student_id)

    async def get_student_stats(self, student_id: str) -> dict:
        """Get attendance and result stats for a student"""
        attendance_col = get_collection("attendance")
        results_col = get_collection("results")

        # Attendance stats
        total_attendance = await attendance_col.count_documents({"student_id": student_id})
        attended_count = await attendance_col.count_documents({"student_id": student_id, "status": {"$in": ["present", "late"]}})
        attendance_pct = (attended_count / total_attendance * 100) if total_attendance > 0 else 0

        # Results stats
        results = []
        async for r in results_col.find({"student_id": student_id}):
            results.append(r)

        cgpa = 0
        if results:
            total_gp = sum(r.get("grade_point", 0) * r.get("credits", 3) for r in results)
            total_credits = sum(r.get("credits", 3) for r in results)
            cgpa = round(total_gp / total_credits, 2) if total_credits > 0 else 0

        return {
            "attendance_percentage": round(attendance_pct, 2),
            "cgpa": cgpa,
            "total_courses": len(set(r["course_id"] for r in results)),
            "total_attendance_classes": total_attendance,
        }


class TeacherService:
    @property
    def teachers_col(self):
        return get_collection("teachers")

    @property
    def users_col(self):
        return get_collection("users")

    @property
    def departments_col(self):
        return get_collection("departments")

    async def create_teacher(self, data: dict) -> dict:
        user = await self.users_col.find_one({"_id": ObjectId(data["user_id"])})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        existing = await self.teachers_col.find_one({"employee_id": data["employee_id"]})
        if existing:
            raise HTTPException(status_code=400, detail="Employee ID already exists")

        now = datetime.now(timezone.utc)
        teacher_doc = {**data, "created_at": now, "updated_at": now, "is_active": True}
        result = await self.teachers_col.insert_one(teacher_doc)

        await self.users_col.update_one(
            {"_id": ObjectId(data["user_id"])},
            {"$set": {"role": "teacher"}},
        )

        return await self._get_teacher_with_details(str(result.inserted_id))

    async def _get_teacher_with_details(self, teacher_id: str) -> Optional[dict]:
        teacher = await self.teachers_col.find_one({"_id": ObjectId(teacher_id)})
        if not teacher:
            return None

        user = await self.users_col.find_one({"_id": ObjectId(teacher["user_id"])})
        dept = await self.departments_col.find_one({"_id": ObjectId(teacher["department_id"])}) if teacher.get("department_id") else None

        result = parse_id(teacher)
        result["full_name"] = user["full_name"] if user else "Unknown"
        result["email"] = user["email"] if user else ""
        result["avatar"] = user.get("avatar") if user else None
        result["department_name"] = dept["name"] if dept else None
        return result

    async def get_teacher_by_user_id(self, user_id: str) -> Optional[dict]:
        teacher = await self.teachers_col.find_one({"user_id": user_id})
        if not teacher:
            return None
        return await self._get_teacher_with_details(str(teacher["_id"]))

    async def list_teachers(self, department_id: Optional[str] = None, skip: int = 0, limit: int = 50) -> Tuple[List[dict], int]:
        query = {}
        if department_id:
            query["department_id"] = department_id

        total = await self.teachers_col.count_documents(query)
        cursor = self.teachers_col.find(query).skip(skip).limit(limit)
        teachers = []
        async for t in cursor:
            details = await self._get_teacher_with_details(str(t["_id"]))
            if details:
                teachers.append(details)

        return teachers, total


student_service = StudentService()
teacher_service = TeacherService()
