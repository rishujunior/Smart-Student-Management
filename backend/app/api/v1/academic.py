from fastapi import APIRouter, Depends, HTTPException
from app.schemas.academic import DepartmentCreate, CourseCreate, CourseUpdate, SemesterCreate
from app.core.dependencies import get_current_admin, get_current_user
from app.core.database import get_collection
from bson import ObjectId
from datetime import datetime, timezone
from typing import Optional

router = APIRouter(prefix="/academic", tags=["Academic"])


# ────────────────────── DEPARTMENTS ──────────────────────

@router.post("/departments", status_code=201)
async def create_department(data: DepartmentCreate, _=Depends(get_current_admin)):
    col = get_collection("departments")
    existing = await col.find_one({"code": data.code.upper()})
    if existing:
        raise HTTPException(status_code=400, detail="Department code already exists")

    now = datetime.now(timezone.utc)
    doc = {**data.model_dump(), "code": data.code.upper(), "created_at": now, "updated_at": now}
    result = await col.insert_one(doc)
    doc["id"] = str(result.inserted_id)
    doc.pop("_id", None)
    return doc


@router.get("/departments")
async def list_departments(_=Depends(get_current_user)):
    col = get_collection("departments")
    students_col = get_collection("students")
    teachers_col = get_collection("teachers")

    departments = []
    async for dept in col.find():
        dept_id = str(dept["_id"])
        student_count = await students_col.count_documents({"department_id": dept_id})
        teacher_count = await teachers_col.count_documents({"department_id": dept_id})
        dept["id"] = dept_id
        dept.pop("_id")
        dept["student_count"] = student_count
        dept["teacher_count"] = teacher_count
        departments.append(dept)

    return departments


@router.get("/departments/{dept_id}")
async def get_department(dept_id: str, _=Depends(get_current_user)):
    col = get_collection("departments")
    dept = await col.find_one({"_id": ObjectId(dept_id)})
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")
    dept["id"] = str(dept.pop("_id"))
    return dept


@router.put("/departments/{dept_id}")
async def update_department(dept_id: str, data: dict, _=Depends(get_current_admin)):
    col = get_collection("departments")
    data["updated_at"] = datetime.now(timezone.utc)
    await col.update_one({"_id": ObjectId(dept_id)}, {"$set": data})
    dept = await col.find_one({"_id": ObjectId(dept_id)})
    dept["id"] = str(dept.pop("_id"))
    return dept


# ────────────────────── COURSES ──────────────────────

@router.post("/courses", status_code=201)
async def create_course(data: CourseCreate, _=Depends(get_current_admin)):
    col = get_collection("courses")
    existing = await col.find_one({"code": data.code.upper(), "department_id": data.department_id})
    if existing:
        raise HTTPException(status_code=400, detail="Course code already exists in this department")

    now = datetime.now(timezone.utc)
    doc = {**data.model_dump(), "code": data.code.upper(), "is_active": True, "created_at": now, "updated_at": now}
    result = await col.insert_one(doc)
    return await _enrich_course(str(result.inserted_id))


async def _enrich_course(course_id: str) -> dict:
    col = get_collection("courses")
    depts_col = get_collection("departments")
    teachers_col = get_collection("teachers")
    users_col = get_collection("users")

    course = await col.find_one({"_id": ObjectId(course_id)})
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    dept = await depts_col.find_one({"_id": ObjectId(course["department_id"])}) if course.get("department_id") else None
    teacher_name = course.get("faculty_name")
    if course.get("teacher_id"):
        teacher = await teachers_col.find_one({"_id": ObjectId(course["teacher_id"])})
        if teacher:
            user = await users_col.find_one({"_id": ObjectId(teacher["user_id"])})
            teacher_name = user["full_name"] if user else teacher_name

    course["id"] = str(course.pop("_id"))
    course["department_name"] = dept["name"] if dept else None
    course["teacher_name"] = teacher_name
    return course


@router.get("/courses")
async def list_courses(
    department_id: Optional[str] = None,
    semester: Optional[int] = None,
    teacher_id: Optional[str] = None,
    include_inactive: bool = False,
    _=Depends(get_current_user),
):
    col = get_collection("courses")
    query = {} if include_inactive else {"is_active": {"$ne": False}}
    if department_id:
        query["department_id"] = department_id
    if semester:
        query["semester"] = semester
    if teacher_id:
        query["teacher_id"] = teacher_id

    courses = []
    async for c in col.find(query):
        enriched = await _enrich_course(str(c["_id"]))
        courses.append(enriched)

    return courses


@router.get("/courses/{course_id}")
async def get_course(course_id: str, _=Depends(get_current_user)):
    return await _enrich_course(course_id)


@router.put("/courses/{course_id}")
async def update_course(course_id: str, data: CourseUpdate, _=Depends(get_current_admin)):
    col = get_collection("courses")
    updates = data.model_dump(exclude_none=True)
    updates["updated_at"] = datetime.now(timezone.utc)
    await col.update_one({"_id": ObjectId(course_id)}, {"$set": updates})
    return await _enrich_course(course_id)


# ────────────────────── SEMESTERS ──────────────────────

@router.post("/semesters", status_code=201)
async def create_semester(data: SemesterCreate, _=Depends(get_current_admin)):
    col = get_collection("semesters")
    if data.is_current:
        # Deactivate other current semesters
        await col.update_many({}, {"$set": {"is_current": False}})

    now = datetime.now(timezone.utc)
    doc = {**data.model_dump(), "created_at": now}
    result = await col.insert_one(doc)
    doc["id"] = str(result.inserted_id)
    doc.pop("_id", None)
    return doc


@router.get("/semesters")
async def list_semesters(_=Depends(get_current_user)):
    col = get_collection("semesters")
    semesters = []
    async for s in col.find().sort("start_date", -1):
        s["id"] = str(s.pop("_id"))
        semesters.append(s)
    return semesters


@router.get("/semesters/current")
async def get_current_semester(_=Depends(get_current_user)):
    col = get_collection("semesters")
    semester = await col.find_one({"is_current": True})
    if not semester:
        raise HTTPException(status_code=404, detail="No active semester found")
    semester["id"] = str(semester.pop("_id"))
    return semester
