from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from app.schemas.academic_modules import AssignmentCreate, AssignmentUpdate, SubmissionCreate
from app.services.academic_service import assignment_service
from app.services.user_service import teacher_service
from app.core.dependencies import get_current_user, get_current_teacher
from app.core.config import settings
from typing import Optional
import aiofiles
import os
import uuid

router = APIRouter(prefix="/assignments", tags=["Assignments"])


@router.post("", status_code=201)
async def create_assignment(data: AssignmentCreate, current_user: dict = Depends(get_current_teacher)):
    """Teacher: Create a new assignment"""
    return await assignment_service.create_assignment(data.model_dump(), current_user)


@router.get("")
async def list_assignments(
    course_id: Optional[str] = None,
    teacher_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
):
    """List assignments with optional filters"""
    return await assignment_service.list_assignments(course_id, teacher_id, current_user)


@router.get("/{assignment_id}")
async def get_assignment(assignment_id: str, current_user: dict = Depends(get_current_user)):
    """Get assignment details"""
    return await assignment_service.get_assignment(assignment_id, current_user)


@router.put("/{assignment_id}")
async def update_assignment(
    assignment_id: str,
    data: AssignmentUpdate,
    current_user: dict = Depends(get_current_teacher),
):
    """Teacher: Update assignment"""
    return await assignment_service.update_assignment(
        assignment_id, data.model_dump(exclude_none=True), current_user
    )


@router.post("/{assignment_id}/submit")
async def submit_assignment(
    assignment_id: str,
    content: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
    current_user: dict = Depends(get_current_user),
):
    """Student: Submit an assignment"""
    from app.services.user_service import student_service
    student = await student_service.get_student_by_user_id(str(current_user["_id"]))
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")

    file_url = None
    if file:
        upload_dir = os.path.join(settings.UPLOAD_DIR, "submissions")
        os.makedirs(upload_dir, exist_ok=True)
        ext = os.path.splitext(file.filename)[1]
        filename = f"{uuid.uuid4()}{ext}"
        file_path = os.path.join(upload_dir, filename)
        async with aiofiles.open(file_path, "wb") as f:
            content_bytes = await file.read()
            await f.write(content_bytes)
        file_url = f"/uploads/submissions/{filename}"

    return await assignment_service.submit_assignment(
        assignment_id, student["id"], content, file_url
    )


@router.post("/submissions/{submission_id}/grade")
async def grade_submission(
    submission_id: str,
    marks: float = Form(...),
    feedback: str = Form(""),
    _=Depends(get_current_teacher),
):
    """Teacher: Grade a student submission"""
    return await assignment_service.grade_submission(submission_id, marks, feedback)


@router.get("/submissions/student")
async def get_my_submissions(current_user: dict = Depends(get_current_user)):
    """Student: Get all my submissions"""
    from app.services.user_service import student_service
    student = await student_service.get_student_by_user_id(str(current_user["_id"]))
    if not student:
        return []
    return await assignment_service.get_student_submissions(student["id"])


@router.get("/{assignment_id}/submissions")
async def get_assignment_submissions(assignment_id: str, _=Depends(get_current_teacher)):
    """Teacher: Get all submissions for an assignment"""
    from app.core.database import get_collection
    from bson import ObjectId
    sub_col = get_collection("submissions")
    students_col = get_collection("students")
    users_col = get_collection("users")

    submissions = []
    async for s in sub_col.find({"assignment_id": assignment_id}):
        student = await students_col.find_one({"_id": ObjectId(s["student_id"])}) if s.get("student_id") else None
        student_name = "Unknown"
        if student:
            user = await users_col.find_one({"_id": ObjectId(student["user_id"])})
            student_name = user["full_name"] if user else "Unknown"
        s["id"] = str(s.pop("_id"))
        s["student_name"] = student_name
        submissions.append(s)

    return submissions
