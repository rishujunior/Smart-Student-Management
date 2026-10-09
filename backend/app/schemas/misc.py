from pydantic import BaseModel, ConfigDict, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum


class NotificationType(str, Enum):
    ANNOUNCEMENT = "announcement"
    EXAM = "exam"
    ASSIGNMENT = "assignment"
    ATTENDANCE = "attendance"
    RESULT = "result"
    FEE = "fee"
    GENERAL = "general"


class NotificationCreate(BaseModel):
    title: str = Field(min_length=3)
    message: str
    type: NotificationType = NotificationType.GENERAL
    target_role: Optional[str] = None  # 'all', 'student', 'teacher', specific user_id
    department_id: Optional[str] = None


class NotificationResponse(BaseModel):
    id: str
    title: str
    message: str
    type: str
    target_role: Optional[str]
    department_id: Optional[str]
    is_read: bool = False
    created_by: str
    created_at: datetime


# Fee Management
class FeeCreate(BaseModel):
    student_id: str
    amount: float = Field(gt=0)
    description: str
    due_date: datetime
    fee_type: str  # 'tuition', 'hostel', 'library', 'exam', 'other'


class FeeUpdate(BaseModel):
    amount_paid: Optional[float] = None
    payment_status: Optional[str] = None
    payment_date: Optional[datetime] = None
    transaction_id: Optional[str] = None


class FeeResponse(BaseModel):
    id: str
    student_id: str
    student_name: Optional[str] = None
    amount: float
    amount_paid: float = 0
    balance: float
    description: str
    due_date: datetime
    fee_type: str
    payment_status: str = "pending"
    payment_date: Optional[datetime] = None
    transaction_id: Optional[str] = None
    created_at: datetime


# AI Features
class AIQueryRequest(BaseModel):
    query: str = Field(min_length=1)
    context: Optional[str] = None


class AIResponse(BaseModel):
    model_config = ConfigDict(protected_namespaces=())

    response: str
    query: str
    model_used: str = "gemini-2.5-flash"


class GenerateQuestionsRequest(BaseModel):
    topic: str
    subject: str
    difficulty: str = "medium"  # easy, medium, hard
    count: int = Field(ge=1, le=20, default=5)
    question_type: str = "mixed"  # mcq, short, long, mixed


class StudyPlanRequest(BaseModel):
    student_id: str
    weak_subjects: List[str]
    exam_date: Optional[str] = None
    hours_per_day: int = Field(ge=1, le=12, default=4)


class SummarizeRequest(BaseModel):
    content: str = Field(min_length=50)
    max_length: Optional[int] = 500


class LearningRoadmapRequest(BaseModel):
    subject: str = Field(min_length=1)
    current_level: str = "beginner"
    goal: str = "job-ready"
