from pydantic import BaseModel, Field
from typing import Optional, List, Dict
from datetime import datetime, date
from enum import Enum


class AttendanceStatus(str, Enum):
    PRESENT = "present"
    ABSENT = "absent"
    LATE = "late"
    EXCUSED = "excused"


class AttendanceRecord(BaseModel):
    student_id: str
    status: AttendanceStatus


class TakeAttendanceRequest(BaseModel):
    course_id: str
    date: datetime
    records: List[AttendanceRecord] = Field(min_length=1)


class AttendanceResponse(BaseModel):
    id: str
    student_id: str
    student_name: Optional[str] = None
    course_id: str
    course_name: Optional[str] = None
    date: datetime
    status: str
    marked_by: str
    created_at: datetime


class AttendanceSummary(BaseModel):
    student_id: str
    student_name: str
    course_id: str
    course_name: str
    total_classes: int
    present: int
    absent: int
    late: int
    percentage: float


class AttendanceCourseRoster(BaseModel):
    course_id: str
    date: datetime
    students: List[dict]
    summary: Dict


# Results
class ResultCreate(BaseModel):
    student_id: str
    course_id: str
    semester_id: str
    internal_marks: float = Field(ge=0, le=100)
    external_marks: float = Field(ge=0, le=100)
    practical_marks: Optional[float] = Field(None, ge=0, le=100)
    max_internal: float = 40
    max_external: float = 60
    max_practical: Optional[float] = None


class ResultUpdate(BaseModel):
    internal_marks: Optional[float] = Field(None, ge=0, le=100)
    external_marks: Optional[float] = Field(None, ge=0, le=100)
    practical_marks: Optional[float] = Field(None, ge=0, le=100)


class ResultResponse(BaseModel):
    id: str
    student_id: str
    student_name: Optional[str] = None
    course_id: str
    course_name: Optional[str] = None
    semester_id: str
    internal_marks: float
    external_marks: float
    practical_marks: Optional[float] = None
    total_marks: float
    max_marks: float
    percentage: float
    grade: str
    grade_point: float
    is_pass: bool
    created_at: datetime


class CGPAResponse(BaseModel):
    student_id: str
    student_name: str
    cgpa: float
    total_credits: int
    semester_results: List[Dict]


# Assignments
class AssignmentCreate(BaseModel):
    title: str = Field(min_length=3)
    description: str
    course_id: str
    due_date: datetime
    total_marks: float = Field(ge=1)
    file_url: Optional[str] = None


class AssignmentUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    due_date: Optional[datetime] = None
    total_marks: Optional[float] = None
    is_active: Optional[bool] = None


class AssignmentResponse(BaseModel):
    id: str
    title: str
    description: str
    course_id: str
    course_name: Optional[str] = None
    teacher_id: str
    teacher_name: Optional[str] = None
    due_date: datetime
    total_marks: float
    file_url: Optional[str] = None
    is_active: bool = True
    submission_count: int = 0
    created_at: datetime


class SubmissionCreate(BaseModel):
    assignment_id: str
    content: Optional[str] = None
    file_url: Optional[str] = None


class SubmissionResponse(BaseModel):
    id: str
    assignment_id: str
    assignment_title: Optional[str] = None
    student_id: str
    student_name: Optional[str] = None
    content: Optional[str] = None
    file_url: Optional[str] = None
    submitted_at: datetime
    is_late: bool
    marks_obtained: Optional[float] = None
    feedback: Optional[str] = None
    is_graded: bool = False
