from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
from app.core.config import settings
from app.core.database import connect_to_mongo, close_mongo_connection
from app.api.router import api_router
from loguru import logger
import os
import time


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info(f"🚀 Starting {settings.APP_NAME} v{settings.APP_VERSION}")
    await connect_to_mongo()
    
    # Create upload directories
    os.makedirs(os.path.join(settings.UPLOAD_DIR, "submissions"), exist_ok=True)
    os.makedirs(os.path.join(settings.UPLOAD_DIR, "notes"), exist_ok=True)
    os.makedirs(os.path.join(settings.UPLOAD_DIR, "avatars"), exist_ok=True)
    
    yield
    
    # Shutdown
    await close_mongo_connection()
    logger.info("Application shutdown complete")


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="""
## Smart Student Management System API

A comprehensive, AI-powered student management system with:
- **JWT Authentication** with role-based access (Admin, Teacher, Student)
- **Academic Management** (courses, departments, semesters)
- **Attendance Tracking** with analytics
- **Result Management** with CGPA calculation
- **Assignment System** with file upload and grading
- **AI Features** powered by Google Gemini
- **PDF/Excel Reports** generation
- **Real-time Notifications**

### Roles
- **Admin**: Full system access
- **Teacher**: Academic operations, grading, attendance
- **Student**: View own data, submit assignments
    """,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
    lifespan=lifespan,
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Request timing middleware
@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    response.headers["X-Process-Time"] = str(round(process_time * 1000, 2)) + "ms"
    return response


# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {exc}")
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error. Please try again later."},
    )


# Include API router
app.include_router(api_router, prefix=settings.API_V1_STR)


# Static files for uploads
if os.path.exists(settings.UPLOAD_DIR):
    app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")


@app.get("/", tags=["Health"])
async def root():
    return {
        "message": f"Welcome to {settings.APP_NAME}",
        "version": settings.APP_VERSION,
        "docs": "/api/docs",
        "status": "operational",
    }


@app.get("/health", tags=["Health"])
async def health_check():
    from app.core.database import client
    try:
        await client.admin.command("ping")
        db_status = "connected"
    except Exception:
        db_status = "disconnected"
    
    return {
        "status": "healthy",
        "database": db_status,
        "version": settings.APP_VERSION,
    }
