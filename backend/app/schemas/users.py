from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List
from datetime import datetime
from enum import Enum


class StudentCreate(BaseModel):
    user_id: str
    enrollment_number: str = Field(min_length=5)
    department_id: str
    semester: int = Field(ge=1, le=10)
    batch_year: int
    guardian_name: Optional[str] = None
    guardian_phone: Optional[str] = None
    address: Optional[str] = None
    date_of_birth: Optional[datetime] = None
    gender: Optional[str] = None
    blood_group: Optional[str] = None


class StudentUpdate(BaseModel):
    department_id: Optional[str] = None
    semester: Optional[int] = Field(None, ge=1, le=10)
    guardian_name: Optional[str] = None
    guardian_phone: Optional[str] = None
    address: Optional[str] = None
    blood_group: Optional[str] = None
    is_active: Optional[bool] = None


class StudentResponse(BaseModel):
    id: str
    user_id: str
    enrollment_number: str
    full_name: str
    email: str
    department_id: str
    department_name: Optional[str] = None
    semester: int
    batch_year: int
    guardian_name: Optional[str] = None
    guardian_phone: Optional[str] = None
    address: Optional[str] = None
    date_of_birth: Optional[datetime] = None
    gender: Optional[str] = None
    blood_group: Optional[str] = None
    avatar: Optional[str] = None
    is_active: bool = True
    cgpa: Optional[float] = None
    attendance_percentage: Optional[float] = None
    created_at: datetime


class TeacherCreate(BaseModel):
    user_id: str
    employee_id: str = Field(min_length=3)
    department_id: str
    designation: str
    qualification: Optional[str] = None
    experience_years: Optional[int] = None
    specialization: Optional[str] = None
    joining_date: Optional[datetime] = None


class TeacherUpdate(BaseModel):
    department_id: Optional[str] = None
    designation: Optional[str] = None
    qualification: Optional[str] = None
    experience_years: Optional[int] = None
    specialization: Optional[str] = None
    is_active: Optional[bool] = None


class TeacherResponse(BaseModel):
    id: str
    user_id: str
    employee_id: str
    full_name: str
    email: str
    department_id: str
    department_name: Optional[str] = None
    designation: str
    qualification: Optional[str] = None
    experience_years: Optional[int] = None
    specialization: Optional[str] = None
    joining_date: Optional[datetime] = None
    avatar: Optional[str] = None
    is_active: bool = True
    created_at: datetime
