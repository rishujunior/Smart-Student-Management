from fastapi import APIRouter
from app.api.v1 import (
    auth, students, teachers, academic,
    attendance_results, assignments, notifications_fees,
    ai_routes, admin, reports
)

api_router = APIRouter()

# Auth
api_router.include_router(auth.router)

# Users
api_router.include_router(students.router)
api_router.include_router(teachers.router)

# Academic
api_router.include_router(academic.router)
api_router.include_router(attendance_results.router)
api_router.include_router(attendance_results.results_router)
api_router.include_router(assignments.router)

# Communication
api_router.include_router(notifications_fees.router)
api_router.include_router(notifications_fees.fees_router)

# AI
api_router.include_router(ai_routes.router)

# Admin
api_router.include_router(admin.router)

# Reports
api_router.include_router(reports.router)
