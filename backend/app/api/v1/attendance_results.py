from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from app.schemas.academic_modules import TakeAttendanceRequest, ResultCreate, ResultUpdate
from app.services.academic_service import attendance_service, result_service
from app.core.dependencies import get_current_user, get_current_teacher, get_current_admin, get_current_student
from app.core.database import get_collection
from typing import Optional

router = APIRouter(prefix="/attendance", tags=["Attendance"])


async def assert_student_can_view(student_id: str, current_user: dict) -> None:
    """Students may only read attendance attached to their own profile."""
    if current_user.get("role") != "student":
        return
    profile = await get_collection("students").find_one({"user_id": str(current_user["_id"])})
    if not profile or str(profile["_id"]) != student_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only view your own attendance")


@router.post("")
async def take_attendance(data: TakeAttendanceRequest, current_user: dict = Depends(get_current_teacher)):
    """Record or update attendance for a single course and calendar day."""
    course = await attendance_service.get_manageable_course(data.course_id, current_user)
    records = [r.model_dump() for r in data.records]
    return await attendance_service.take_attendance(
        course, data.date, records, str(current_user["_id"])
    )


@router.get("/courses")
async def get_attendance_courses(current_user: dict = Depends(get_current_teacher)):
    """List active AKTU CSE Semester III courses the user may manage."""
    return await attendance_service.get_manageable_courses(current_user)


@router.get("/student/courses")
async def get_student_attendance_courses(current_user: dict = Depends(get_current_student)):
    """Discover the authenticated student's active courses from their academic cohort."""
    if current_user.get("role") != "student":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Student access required")
    return await attendance_service.get_student_curriculum_courses(current_user)


@router.get("/student/courses/{course_id}/summary")
async def get_my_course_attendance_summary(
    course_id: str,
    current_user: dict = Depends(get_current_student),
):
    """Return the authenticated student's personal attendance totals for a course."""
    if current_user.get("role") != "student":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Student access required")
    student = await get_collection("students").find_one({"user_id": str(current_user["_id"])})
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student profile not found")
    allowed_courses = {item["id"] for item in await attendance_service.get_student_curriculum_courses(current_user)}
    if course_id not in allowed_courses:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Course is outside your academic curriculum")
    return await attendance_service.get_student_course_summary(str(student["_id"]), course_id)


@router.get("/course/{course_id}/roster")
async def get_course_attendance_roster(
    course_id: str,
    attendance_date: date = Query(alias="date"),
    current_user: dict = Depends(get_current_teacher),
):
    """Get the real course cohort and saved statuses for a calendar date."""
    course = await attendance_service.get_manageable_course(course_id, current_user)
    return await attendance_service.get_course_roster(course, attendance_date)


@router.get("/student/{student_id}")
async def get_student_attendance(
    student_id: str,
    course_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
):
    """Get attendance records for a student"""
    await assert_student_can_view(student_id, current_user)
    return await attendance_service.get_student_attendance(student_id, course_id)


@router.get("/student/{student_id}/summary")
async def get_attendance_summary(student_id: str, current_user: dict = Depends(get_current_user)):
    """Get attendance summary by course for a student"""
    await assert_student_can_view(student_id, current_user)
    return await attendance_service.get_attendance_summary(student_id)


@router.get("/course/{course_id}")
async def get_course_attendance(
    course_id: str,
    date: Optional[date] = None,
    current_user: dict = Depends(get_current_teacher),
):
    """Get attendance history, optionally limited to one date."""
    await attendance_service.get_manageable_course(course_id, current_user)
    return await attendance_service.get_course_attendance(course_id, date)


# ────────────────────── RESULTS ──────────────────────

results_router = APIRouter(prefix="/results", tags=["Results"])


async def get_results_viewer(current_user: dict = Depends(get_current_user)):
    if current_user.get("role") not in {"admin", "student"}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Results are available to administrators and students only",
        )
    return current_user


@results_router.post("", status_code=201)
async def add_result(data: ResultCreate, _=Depends(get_current_admin)):
    """Admin: Add or update a student result."""
    return await result_service.add_result(data.model_dump())


@results_router.get("/student/{student_id}")
async def get_student_results(
    student_id: str,
    semester_id: Optional[str] = None,
    _=Depends(get_results_viewer),
):
    """Get results for a student"""
    return await result_service.get_student_results(student_id, semester_id)


@results_router.get("/student/{student_id}/cgpa")
async def get_student_cgpa(student_id: str, _=Depends(get_results_viewer)):
    """Calculate CGPA for a student"""
    return await result_service.calculate_cgpa(student_id)


@results_router.get("/top-performers")
async def get_top_performers(
    department_id: Optional[str] = None,
    limit: int = Query(10, ge=1, le=50),
    _=Depends(get_results_viewer),
):
    """Get top performing students"""
    return await result_service.get_top_performers(department_id, limit)


@results_router.put("/{result_id}")
async def update_result(result_id: str, data: ResultUpdate, _=Depends(get_current_admin)):
    """Admin: Update result marks."""
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
