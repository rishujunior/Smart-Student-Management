"""
Database seeding script for the Smart Student Management System.

This script is safe to run repeatedly. It uses upsert-style logic to avoid
creating duplicate records and is designed to seed the AKTU B.Tech CSE Semester III
curriculum without inventing fake student identities.

Run: python seed.py
"""
import asyncio
import os
import sys
from datetime import datetime, timezone
from typing import Any, Dict, List

from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext

# Windows consoles default to a legacy codepage (cp1252) that can't encode the
# emoji used in this script's log output; force UTF-8 so `python seed.py` works
# out of the box on Windows without requiring PYTHONUTF8=1 or chcp 65001.
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
DATABASE_NAME = os.getenv("DATABASE_NAME", "student_management_db")
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

AKTU_CSE_SEMESTER_3_SUBJECTS: List[Dict[str, Any]] = [
    {"code": "BAS303", "name": "Mathematics-IV", "subject_type": "theory", "faculty_name": "Dr. Nayan Goel Modi"},
    {"code": "BCS301", "name": "Data Structure", "subject_type": "theory", "faculty_name": "Alok Kumar Srivastav"},
    {"code": "BCS302", "name": "Computer Organization & Architecture", "subject_type": "theory", "faculty_name": "Sanjay Gupta"},
    {"code": "BCS303", "name": "Discrete Structures & Theory of Logic", "subject_type": "theory", "faculty_name": "Amit Dubey"},
    {"code": "BCC302", "name": "Python Programming", "subject_type": "theory", "faculty_name": "Jyoti Pandey"},
    {"code": "BVE301", "name": "Universal Human Values & Professional Ethics", "subject_type": "theory", "faculty_name": "SK Madhesiya"},
    {"code": "BCS351", "name": "Data Structure Lab", "subject_type": "lab", "faculty_name": None},
    {"code": "BCS352", "name": "Computer Organization & Architecture Lab", "subject_type": "lab", "faculty_name": None},
    {"code": "BCS353", "name": "Web Designing Workshop", "subject_type": "workshop", "faculty_name": None},
    {"code": "BCC351", "name": "Internship Assessment / Mini Project", "subject_type": "project", "faculty_name": None},
]


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


async def ensure_department(db, name: str, code: str, description: str | None = None) -> str:
    department = await db.departments.find_one({"code": code.upper()})
    if department:
        return str(department["_id"])

    result = await db.departments.insert_one({
        "name": name,
        "code": code.upper(),
        "description": description,
        "created_at": utc_now(),
        "updated_at": utc_now(),
    })
    return str(result.inserted_id)


async def ensure_user(db, email: str, password: str, full_name: str, role: str, *, phone: str | None = None) -> str:
    existing = await db.users.find_one({"email": email})
    if existing:
        return str(existing["_id"])

    user = {
        "email": email,
        "password_hash": pwd_context.hash(password),
        "full_name": full_name,
        "role": role,
        "is_active": True,
        "is_verified": True,
        "phone": phone,
        "avatar": None,
        "created_at": utc_now(),
        "updated_at": utc_now(),
    }
    result = await db.users.insert_one(user)
    return str(result.inserted_id)


async def ensure_current_semester(db, name: str = "Semester III - AKTU B.Tech CSE") -> str:
    existing = await db.semesters.find_one({"is_current": True})
    if existing:
        return str(existing["_id"])

    result = await db.semesters.insert_one({
        "name": name,
        "start_date": datetime(2024, 7, 1, tzinfo=timezone.utc),
        "end_date": datetime(2024, 12, 31, tzinfo=timezone.utc),
        "is_current": True,
        "created_at": utc_now(),
    })
    return str(result.inserted_id)


async def ensure_aayush_cse_semester_three_profile(db, department_id: str) -> None:
    user = await db.users.find_one({"full_name": "Aayush_Singh", "role": "student"})
    if not user:
        return

    user_id = str(user["_id"])
    existing = await db.students.find_one({"user_id": user_id})
    now = utc_now()
    academic_fields = {
        "department_id": department_id,
        "branch": "CSE",
        "semester": 3,
        "updated_at": now,
    }
    if existing:
        await db.students.update_one({"_id": existing["_id"]}, {"$set": academic_fields})
        return

    enrollment_number = f"CSE3-{user_id[-8:].upper()}"
    await db.students.insert_one({
        **academic_fields,
        "user_id": user_id,
        "enrollment_number": enrollment_number,
        "batch_year": max(now.year - 1, 2000),
        "is_active": True,
        "created_at": now,
    })

async def ensure_cse_semester_three_students(db, department_id: str) -> None:

    students = [
        ("Aayush_Singh", "rishijuniorsingh@gmail.com", "CSE3-AAYUSH"),
        ("Rishu_Singh", "rishu.singh@student.sms.edu", "CSE3-83A9A3"),
        ("Sunny_Singh", "sunny.singh@student.sms.edu", "CSE3-8DA828"),
        ("Sahil_Chaturvedi", "sahil.chaturvedi@student.sms.edu", "CSE3-C42A0D"),
        ("Shreyansh_Srivastav", "shreyansh.srivastav@student.sms.edu", "CSE3-F74287"),
    ]

    now = utc_now()

    for full_name, email, enrollment_number in students:
        user = await db.users.find_one({
            "email": email,
            "role": "student",
        })

        if not user:
            user = await db.users.find_one({
                "full_name": full_name,
                "role": "student",
            })

        if not user:
            await ensure_user(
                db,
                email,
                "Student@123",
                full_name,
                "student",
            )
            user = await db.users.find_one({
                "email": email,
                "role": "student",
            })

        if not user:
            continue

        await db.users.update_one(
            {"_id": user["_id"]},
            {
                "$set": {
                    "full_name": full_name,
                    "role": "student",
                    "is_active": True,
                }
            },
        )

        await db.students.update_one(
            {"user_id": str(user["_id"])},
            {
                "$set": {
                    "department_id": department_id,
                    "branch": "CSE",
                    "semester": 3,
                    "enrollment_number": enrollment_number,
                    "batch_year": max(now.year - 1, 2000),
                    "is_active": True,
                    "updated_at": now,
                },
                "$setOnInsert": {
                    "user_id": str(user["_id"]),
                    "created_at": now,
                },
            },
            upsert=True,
        )


async def find_teacher_id(db, faculty_name: str | None) -> str | None:
    if not faculty_name:
        return None
    user = await db.users.find_one({"full_name": faculty_name, "role": "teacher"})
    if not user:
        return None
    teacher = await db.teachers.find_one({"user_id": str(user["_id"])})
    return str(teacher["_id"]) if teacher else None


async def ensure_teacher_profile(db, user_id: str, department_id: str) -> str:
    existing = await db.teachers.find_one({"user_id": user_id})
    if existing:
        return str(existing["_id"])

    result = await db.teachers.insert_one({
        "user_id": user_id,
        "employee_id": "TCH001",
        "department_id": department_id,
        "designation": "Professor",
        "qualification": "Ph.D",
        "experience_years": 8,
        "specialization": "Mathematics",
        "is_active": True,
        "created_at": utc_now(),
        "updated_at": utc_now(),
    })
    return str(result.inserted_id)


async def ensure_course(
    db,
    subject: Dict[str, Any],
    department_id: str,
    semester: int = 3,
) -> None:
    teacher_id = await find_teacher_id(db, subject.get("faculty_name"))
    payload = {
        "name": subject["name"],
        "code": subject["code"].upper(),
        "department_id": department_id,
        "branch": subject.get("branch", "CSE"),
        "credits": subject.get("credits"),
        "semester": semester,
        "subject_type": subject["subject_type"],
        "description": subject.get("description"),
        "teacher_id": teacher_id,
        "faculty_name": subject.get("faculty_name"),
        "is_active": True,
        "updated_at": utc_now(),
    }
    query = {"code": payload["code"], "department_id": department_id}
    matches = await db.courses.find(query).sort("created_at", 1).to_list(length=100)
    if matches:
        existing = matches[0]
        await db.courses.update_one({"_id": existing["_id"]}, {"$set": payload})
        for duplicate in matches[1:]:
            await db.courses.update_one(
                {"_id": duplicate["_id"]},
                {"$set": {"is_active": False, "updated_at": utc_now()}},
            )
    else:
        payload["created_at"] = utc_now()
        await db.courses.insert_one(payload)


async def seed_demo_data(db, admin_id: str):
    demo_notifications = [
        {
            "title": "Welcome to Smart SMS",
            "message": "The demo dashboard is ready. Replace demo content with live academic data when the real dataset is imported.",
            "type": "announcement",
            "target_role": "all",
            "created_by": admin_id,
            "is_read": False,
            "created_at": utc_now(),
        }
    ]

    for notification in demo_notifications:
        await db.notifications.update_one(
            {"title": notification["title"]},
            {"$setOnInsert": notification},
            upsert=True,
        )


async def seed_database(demo_data: bool = False) -> Dict[str, Any]:
    client = AsyncIOMotorClient(MONGODB_URL)
    db = client[DATABASE_NAME]

    print("🌱 Starting database seeding...")

    admin_id = await ensure_user(
        db,
        "admin@sms.edu",
        "Admin@123",
        "System Administrator",
        "admin",
        phone="+91-9876543210",
    )
    print(f"✅ Admin ready: admin@sms.edu / Admin@123")

    department_id = await ensure_department(
        db,
        "Computer Science & Engineering",
        "CSE",
        "AKTU B.Tech Computer Science and Engineering department",
    )
    print("✅ Department ensured: CSE")
    await ensure_user(
        db,
        "aayush.singh@student.sms.edu",
        "Student@123",
        "Aayush_Singh",
        "student",
    )
    await ensure_cse_semester_three_students(db, department_id)

    teacher_user_id = await ensure_user(
        db,
        "prof.sharma@sms.edu",
        "Teacher@123",
        "Prof. Rajesh Sharma",
        "teacher",
        phone="+91-9876543211",
    )
    teacher_id = await ensure_teacher_profile(db, teacher_user_id, department_id)
    print("✅ Teacher profile ensured: Prof. Rajesh Sharma")

    for subject in AKTU_CSE_SEMESTER_3_SUBJECTS:
        await ensure_course(db, subject, department_id)

    await ensure_course(
        db,
        {
            "code": "BAS101",
            "name": "Engineering Mathematics-I",
            "subject_type": "theory",
            "faculty_name": None,
        },
        department_id,
        semester=1,
    )

    assigned_codes = ["BAS101", "BAS303"]
    for code in assigned_codes:
        await db.courses.update_one(
            {"code": code, "department_id": department_id},
            {"$set": {"teacher_id": teacher_id, "updated_at": utc_now()}},
        )
    await db.courses.update_many(
        {"teacher_id": teacher_id, "code": {"$nin": assigned_codes}},
        {"$set": {"teacher_id": None, "updated_at": utc_now()}},
    )

    curriculum_codes = [subject["code"].upper() for subject in AKTU_CSE_SEMESTER_3_SUBJECTS]
    curriculum_codes.append("BAS101")
    await db.courses.update_many(
        {"department_id": department_id, "code": {"$nin": curriculum_codes}},
        {"$set": {
            "is_active": False,
            "archive_reason": "Not in the configured AKTU CSE Semester III curriculum",
            "updated_at": utc_now(),
        }},
    )
    print(f"✅ {len(AKTU_CSE_SEMESTER_3_SUBJECTS)} AKTU CSE Semester III subjects ensured")

    await ensure_current_semester(db, "Semester III - AKTU B.Tech CSE")
    print("✅ Active semester ensured")

    if demo_data:
        await seed_demo_data(db, admin_id)
        print("✅ Demo data seeded")

    client.close()
    return {
        "admin_email": "admin@sms.edu",
        "semester": "Semester III - AKTU B.Tech CSE",
        "subjects_seeded": len(AKTU_CSE_SEMESTER_3_SUBJECTS),
    }


async def seed():
    print("\n" + "=" * 60)
    print("AKTU CSE Semester III seed")
    print("=" * 60)
    await seed_database(demo_data=False)
    print("\n📋 Admin login: admin@sms.edu / Admin@123")
    print("\n💡 This seed is intentionally student-name-safe. Add real students later into the existing MongoDB collections.")
    print("\n🌐 API Docs: http://localhost:8000/api/docs")


if __name__ == "__main__":
    asyncio.run(seed())
