from fastapi import APIRouter, Depends, Query
from app.schemas.academic_modules import TakeAttendanceRequest, ResultCreate, ResultUpdate
from app.services.academic_service import attendance_service, result_service
from app.core.dependencies import get_current_user, get_current_teacher, get_current_admin
from typing import Optional

router = APIRouter(prefix="/attendance", tags=["Attendance"])


@router.post("")
async def take_attendance(data: TakeAttendanceRequest, current_user: dict = Depends(get_current_teacher)):
    """Teacher: Take attendance for a class"""
    records = [r.model_dump() for r in data.records]
    return await attendance_service.take_attendance(
        data.course_id, data.date, records, str(current_user["_id"])
    )


@router.get("/student/{student_id}")
async def get_student_attendance(
    student_id: str,
    course_id: Optional[str] = None,
    _=Depends(get_current_user),
):
    """Get attendance records for a student"""
    return await attendance_service.get_student_attendance(student_id, course_id)


@router.get("/student/{student_id}/summary")
async def get_attendance_summary(student_id: str, _=Depends(get_current_user)):
    """Get attendance summary by course for a student"""
    return await attendance_service.get_attendance_summary(student_id)


@router.get("/course/{course_id}")
async def get_course_attendance(
    course_id: str,
    date: Optional[str] = None,
    _=Depends(get_current_teacher),
):
    """Teacher: Get attendance records for a course"""
    date_obj = None
    if date:
        from datetime import datetime
        date_obj = datetime.fromisoformat(date)
    return await attendance_service.get_course_attendance(course_id, date_obj)


# ────────────────────── RESULTS ──────────────────────

results_router = APIRouter(prefix="/results", tags=["Results"])


@results_router.post("", status_code=201)
async def add_result(data: ResultCreate, _=Depends(get_current_teacher)):
    """Teacher: Add/update student result"""
    return await result_service.add_result(data.model_dump())


@results_router.get("/student/{student_id}")
async def get_student_results(
    student_id: str,
    semester_id: Optional[str] = None,
    _=Depends(get_current_user),
):
    """Get results for a student"""
    return await result_service.get_student_results(student_id, semester_id)


@results_router.get("/student/{student_id}/cgpa")
async def get_student_cgpa(student_id: str, _=Depends(get_current_user)):
    """Calculate CGPA for a student"""
    return await result_service.calculate_cgpa(student_id)


@results_router.get("/top-performers")
async def get_top_performers(
    department_id: Optional[str] = None,
    limit: int = Query(10, ge=1, le=50),
    _=Depends(get_current_user),
):
    """Get top performing students"""
    return await result_service.get_top_performers(department_id, limit)


@results_router.put("/{result_id}")
async def update_result(result_id: str, data: ResultUpdate, _=Depends(get_current_teacher)):
    """Teacher: Update result marks"""
    from app.core.database import get_collection
    from bson import ObjectId
    from datetime import datetime, timezone
    col = get_collection("results")
    updates = data.model_dump(exclude_none=True)
    updates["updated_at"] = datetime.now(timezone.utc)
    
    # Recalculate grade
    result = await col.find_one({"_id": ObjectId(result_id)})
    if result:
        new_internal = updates.get("internal_marks", result.get("internal_marks", 0))
        new_external = updates.get("external_marks", result.get("external_marks", 0))
        new_practical = updates.get("practical_marks", result.get("practical_marks", 0))
        total = new_internal + new_external + (new_practical or 0)
        max_total = result.get("max_marks", 100)
        pct = (total / max_total * 100) if max_total > 0 else 0
        from app.services.academic_service import calc_grade
        grade, gp = calc_grade(pct)
        updates.update({"total_marks": total, "percentage": round(pct, 2), "grade": grade, "grade_point": gp, "is_pass": grade != "F"})
    
    await col.update_one({"_id": ObjectId(result_id)}, {"$set": updates})
    result = await col.find_one({"_id": ObjectId(result_id)})
    result["id"] = str(result.pop("_id"))
    return result
