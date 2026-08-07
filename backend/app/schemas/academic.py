from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class DepartmentCreate(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    code: str = Field(min_length=2, max_length=10)
    description: Optional[str] = None
    head_teacher_id: Optional[str] = None


class DepartmentResponse(BaseModel):
    id: str
    name: str
    code: str
    description: Optional[str] = None
    head_teacher_id: Optional[str] = None
    head_teacher_name: Optional[str] = None
    student_count: int = 0
    teacher_count: int = 0
    created_at: datetime


class CourseCreate(BaseModel):
    name: str = Field(min_length=2, max_length=150)
    code: str = Field(min_length=2, max_length=15)
    department_id: str
    credits: int = Field(ge=1, le=10)
    semester: int = Field(ge=1, le=10)
    description: Optional[str] = None
    teacher_id: Optional[str] = None


class CourseUpdate(BaseModel):
    name: Optional[str] = None
    credits: Optional[int] = Field(None, ge=1, le=10)
    description: Optional[str] = None
    teacher_id: Optional[str] = None
    is_active: Optional[bool] = None


class CourseResponse(BaseModel):
    id: str
    name: str
    code: str
    department_id: str
    department_name: Optional[str] = None
    credits: int
    semester: int
    description: Optional[str] = None
    teacher_id: Optional[str] = None
    teacher_name: Optional[str] = None
    is_active: bool = True
    created_at: datetime


class SemesterCreate(BaseModel):
    name: str  # e.g. "Semester 1 - 2024-25"
    start_date: datetime
    end_date: datetime
    is_current: bool = False


class SemesterResponse(BaseModel):
    id: str
    name: str
    start_date: datetime
    end_date: datetime
    is_current: bool
    created_at: datetime
