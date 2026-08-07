from fastapi import APIRouter, Depends, Query
from app.schemas.users import StudentCreate, StudentUpdate, TeacherCreate, TeacherUpdate
from app.services.user_service import student_service, teacher_service
from app.core.dependencies import get_current_admin, get_current_user
from typing import Optional

router = APIRouter(prefix="/students", tags=["Students"])


@router.post("", status_code=201)
async def create_student(data: StudentCreate, _=Depends(get_current_admin)):
    """Admin: Create a new student profile"""
    return await student_service.create_student(data.model_dump())


@router.get("")
async def list_students(
    department_id: Optional[str] = None,
    semester: Optional[int] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    _=Depends(get_current_admin),
):
    """Admin: List all students with optional filters"""
    students, total = await student_service.list_students(department_id, semester, skip, limit)
    return {"students": students, "total": total, "skip": skip, "limit": limit}


@router.get("/me")
async def get_my_profile(current_user: dict = Depends(get_current_user)):
    """Student: Get own profile"""
    student = await student_service.get_student_by_user_id(str(current_user["_id"]))
    if not student:
        return {"message": "Student profile not found"}
    stats = await student_service.get_student_stats(student["id"])
    student.update(stats)
    return student


@router.get("/{student_id}")
async def get_student(student_id: str, current_user: dict = Depends(get_current_user)):
    """Get student details by ID"""
    from app.services.user_service import parse_id
    from app.core.database import get_collection
    from bson import ObjectId
    col = get_collection("students")
    student = await col.find_one({"_id": ObjectId(student_id)})
    if not student:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Student not found")
    return await student_service._get_student_with_details(student_id)


@router.put("/{student_id}")
async def update_student(student_id: str, data: StudentUpdate, _=Depends(get_current_admin)):
    """Admin: Update student information"""
    return await student_service.update_student(student_id, data.model_dump(exclude_none=True))


@router.get("/{student_id}/stats")
async def get_student_stats(student_id: str, _=Depends(get_current_user)):
    """Get student academic statistics"""
    return await student_service.get_student_stats(student_id)
