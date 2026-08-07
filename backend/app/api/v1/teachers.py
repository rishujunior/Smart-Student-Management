from fastapi import APIRouter, Depends, Query
from app.schemas.users import TeacherCreate, TeacherUpdate
from app.services.user_service import teacher_service
from app.core.dependencies import get_current_admin, get_current_user
from typing import Optional

router = APIRouter(prefix="/teachers", tags=["Teachers"])


@router.post("", status_code=201)
async def create_teacher(data: TeacherCreate, _=Depends(get_current_admin)):
    """Admin: Create a new teacher profile"""
    return await teacher_service.create_teacher(data.model_dump())


@router.get("")
async def list_teachers(
    department_id: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    _=Depends(get_current_user),
):
    """List all teachers"""
    teachers, total = await teacher_service.list_teachers(department_id, skip, limit)
    return {"teachers": teachers, "total": total}


@router.get("/me")
async def get_my_profile(current_user: dict = Depends(get_current_user)):
    """Teacher: Get own profile"""
    teacher = await teacher_service.get_teacher_by_user_id(str(current_user["_id"]))
    if not teacher:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Teacher profile not found")
    return teacher


@router.get("/{teacher_id}")
async def get_teacher(teacher_id: str, _=Depends(get_current_user)):
    """Get teacher details by ID"""
    return await teacher_service._get_teacher_with_details(teacher_id)


@router.put("/{teacher_id}")
async def update_teacher(teacher_id: str, data: TeacherUpdate, _=Depends(get_current_admin)):
    """Admin: Update teacher information"""
    from app.core.database import get_collection
    from bson import ObjectId
    from datetime import datetime, timezone
    col = get_collection("teachers")
    updates = data.model_dump(exclude_none=True)
    updates["updated_at"] = datetime.now(timezone.utc)
    await col.update_one({"_id": ObjectId(teacher_id)}, {"$set": updates})
    return await teacher_service._get_teacher_with_details(teacher_id)
