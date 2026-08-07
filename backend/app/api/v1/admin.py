from fastapi import APIRouter, Depends
from app.core.dependencies import get_current_admin, get_current_user
from app.core.database import get_collection
from datetime import datetime, timezone

router = APIRouter(prefix="/admin", tags=["Admin Dashboard"])


@router.get("/dashboard")
async def get_dashboard_stats(_=Depends(get_current_admin)):
    """Get comprehensive admin dashboard statistics"""
    users_col = get_collection("users")
    students_col = get_collection("students")
    teachers_col = get_collection("teachers")
    departments_col = get_collection("departments")
    courses_col = get_collection("courses")
    attendance_col = get_collection("attendance")
    assignments_col = get_collection("assignments")
    fees_col = get_collection("fees")
    activity_col = get_collection("activity_logs")

    # Core counts
    total_students = await students_col.count_documents({})
    total_teachers = await teachers_col.count_documents({})
    total_departments = await departments_col.count_documents({})
    total_courses = await courses_col.count_documents({})

    # Attendance stats (this month)
    from datetime import timedelta
    now = datetime.now(timezone.utc)
    month_start = now.replace(day=1, hour=0, minute=0, second=0)
    total_att = await attendance_col.count_documents({"date": {"$gte": month_start}})
    present_att = await attendance_col.count_documents({"date": {"$gte": month_start}, "status": "present"})
    attendance_rate = round((present_att / total_att * 100), 2) if total_att > 0 else 0

    # Fee stats
    pending_fees = await fees_col.count_documents({"payment_status": "pending"})

    # Recent activity
    recent_activities = []
    async for log in activity_col.find().sort("created_at", -1).limit(10):
        log["id"] = str(log.pop("_id"))
        recent_activities.append(log)

    # Department-wise student distribution
    dept_distribution = []
    async for dept in departments_col.find():
        dept_id = str(dept["_id"])
        count = await students_col.count_documents({"department_id": dept_id})
        dept_distribution.append({"department": dept["name"], "count": count, "code": dept["code"]})

    # Monthly enrollment trend (last 6 months)
    enrollment_trend = []
    for i in range(5, -1, -1):
        month_offset = now.month - i
        year = now.year
        if month_offset <= 0:
            month_offset += 12
            year -= 1
        month_start_loop = datetime(year, month_offset, 1, tzinfo=timezone.utc)
        if month_offset == 12:
            month_end_loop = datetime(year + 1, 1, 1, tzinfo=timezone.utc)
        else:
            month_end_loop = datetime(year, month_offset + 1, 1, tzinfo=timezone.utc)
        
        count = await students_col.count_documents({
            "created_at": {"$gte": month_start_loop, "$lt": month_end_loop}
        })
        enrollment_trend.append({
            "month": month_start_loop.strftime("%b %Y"),
            "count": count,
        })

    return {
        "overview": {
            "total_students": total_students,
            "total_teachers": total_teachers,
            "total_departments": total_departments,
            "total_courses": total_courses,
            "attendance_rate": attendance_rate,
            "pending_fees": pending_fees,
        },
        "department_distribution": dept_distribution,
        "enrollment_trend": enrollment_trend,
        "recent_activities": recent_activities,
    }


@router.get("/analytics")
async def get_analytics(_=Depends(get_current_admin)):
    """Advanced analytics data"""
    results_col = get_collection("results")
    attendance_col = get_collection("attendance")
    students_col = get_collection("students")

    # Grade distribution
    pipeline = [
        {"$group": {"_id": "$grade", "count": {"$sum": 1}}},
        {"$sort": {"_id": 1}}
    ]
    grade_dist = []
    async for g in results_col.aggregate(pipeline):
        grade_dist.append({"grade": g["_id"], "count": g["count"]})

    # Attendance by department
    dept_attendance = []
    async for dept in get_collection("departments").find():
        dept_id = str(dept["_id"])
        dept_students = []
        async for s in students_col.find({"department_id": dept_id}):
            dept_students.append(str(s["_id"]))
        
        if dept_students:
            total = await attendance_col.count_documents({"student_id": {"$in": dept_students}})
            present = await attendance_col.count_documents({"student_id": {"$in": dept_students}, "status": "present"})
            pct = round((present / total * 100), 2) if total > 0 else 0
            dept_attendance.append({"department": dept["name"], "attendance_rate": pct})

    return {
        "grade_distribution": grade_dist,
        "department_attendance": dept_attendance,
    }


@router.get("/activity-logs")
async def get_activity_logs(skip: int = 0, limit: int = 50, _=Depends(get_current_admin)):
    col = get_collection("activity_logs")
    logs = []
    async for log in col.find().sort("created_at", -1).skip(skip).limit(limit):
        log["id"] = str(log.pop("_id"))
        logs.append(log)
    total = await col.count_documents({})
    return {"logs": logs, "total": total}
