"""
Database seeding script - creates initial admin user and sample data.
Run: python seed.py
"""
import asyncio
import sys
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
from datetime import datetime, timezone

# Windows consoles default to a legacy codepage (cp1252) that can't encode the
# emoji used in this script's log output; force UTF-8 so `python seed.py` works
# out of the box on Windows without requiring PYTHONUTF8=1 or chcp 65001.
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

MONGODB_URL = "mongodb://localhost:27017"
DATABASE_NAME = "student_management_db"
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


async def seed():
    client = AsyncIOMotorClient(MONGODB_URL)
    db = client[DATABASE_NAME]

    print("🌱 Starting database seeding...")

    # ─── Admin User ───
    existing_admin = await db.users.find_one({"email": "admin@sms.edu"})
    if not existing_admin:
        admin_result = await db.users.insert_one({
            "email": "admin@sms.edu",
            "password_hash": pwd_context.hash("Admin@123"),
            "full_name": "System Administrator",
            "role": "admin",
            "is_active": True,
            "is_verified": True,
            "phone": "+91-9876543210",
            "avatar": None,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
        })
        admin_id = str(admin_result.inserted_id)
        print(f"✅ Admin created: admin@sms.edu / Admin@123")
    else:
        admin_id = str(existing_admin["_id"])
        print("ℹ️  Admin already exists")

    # ─── Departments ───
    departments = [
        {"name": "Computer Science Engineering", "code": "CSE", "description": "Department of Computer Science and Engineering"},
        {"name": "Electronics Engineering", "code": "ECE", "description": "Department of Electronics and Communication"},
        {"name": "Mechanical Engineering", "code": "ME", "description": "Department of Mechanical Engineering"},
        {"name": "Civil Engineering", "code": "CE", "description": "Department of Civil Engineering"},
        {"name": "Information Technology", "code": "IT", "description": "Department of Information Technology"},
    ]
    dept_ids = {}
    for dept in departments:
        existing = await db.departments.find_one({"code": dept["code"]})
        if not existing:
            result = await db.departments.insert_one({
                **dept, "created_at": datetime.now(timezone.utc), "updated_at": datetime.now(timezone.utc)
            })
            dept_ids[dept["code"]] = str(result.inserted_id)
        else:
            dept_ids[dept["code"]] = str(existing["_id"])
    print(f"✅ {len(departments)} departments seeded")

    # ─── Teacher Users ───
    teachers_data = [
        {"email": "prof.sharma@sms.edu", "full_name": "Prof. Rajesh Sharma", "employee_id": "TCH001", "dept": "CSE", "designation": "Professor"},
        {"email": "dr.patel@sms.edu", "full_name": "Dr. Priya Patel", "employee_id": "TCH002", "dept": "ECE", "designation": "Associate Professor"},
        {"email": "mr.kumar@sms.edu", "full_name": "Mr. Amit Kumar", "employee_id": "TCH003", "dept": "IT", "designation": "Assistant Professor"},
    ]
    teacher_ids = {}
    for t in teachers_data:
        existing = await db.users.find_one({"email": t["email"]})
        if not existing:
            user_result = await db.users.insert_one({
                "email": t["email"],
                "password_hash": pwd_context.hash("Teacher@123"),
                "full_name": t["full_name"],
                "role": "teacher",
                "is_active": True,
                "is_verified": True,
                "phone": None,
                "avatar": None,
                "created_at": datetime.now(timezone.utc),
                "updated_at": datetime.now(timezone.utc),
            })
            user_id = str(user_result.inserted_id)
        else:
            user_id = str(existing["_id"])

        existing_teacher = await db.teachers.find_one({"user_id": user_id})
        if not existing_teacher:
            teacher_result = await db.teachers.insert_one({
                "user_id": user_id,
                "employee_id": t["employee_id"],
                "department_id": dept_ids[t["dept"]],
                "designation": t["designation"],
                "qualification": "Ph.D" if t["designation"] == "Professor" else "M.Tech",
                "experience_years": 10,
                "specialization": "Computer Science",
                "is_active": True,
                "created_at": datetime.now(timezone.utc),
                "updated_at": datetime.now(timezone.utc),
            })
            teacher_ids[t["employee_id"]] = str(teacher_result.inserted_id)
        else:
            teacher_ids[t["employee_id"]] = str(existing_teacher["_id"])

    print(f"✅ {len(teachers_data)} teachers seeded (Password: Teacher@123)")

    # ─── Student Users ───
    students_data = [
        {"email": "alice@student.sms.edu", "full_name": "Alice Johnson", "enrollment": "CS2024001", "dept": "CSE", "sem": 3, "batch": 2024},
        {"email": "bob@student.sms.edu", "full_name": "Bob Smith", "enrollment": "CS2024002", "dept": "CSE", "sem": 3, "batch": 2024},
        {"email": "carol@student.sms.edu", "full_name": "Carol Williams", "enrollment": "IT2024001", "dept": "IT", "sem": 3, "batch": 2024},
        {"email": "david@student.sms.edu", "full_name": "David Brown", "enrollment": "EC2024001", "dept": "ECE", "sem": 3, "batch": 2024},
        {"email": "eve@student.sms.edu", "full_name": "Eve Davis", "enrollment": "CS2023001", "dept": "CSE", "sem": 5, "batch": 2023},
    ]
    for s in students_data:
        existing = await db.users.find_one({"email": s["email"]})
        if not existing:
            user_result = await db.users.insert_one({
                "email": s["email"],
                "password_hash": pwd_context.hash("Student@123"),
                "full_name": s["full_name"],
                "role": "student",
                "is_active": True,
                "is_verified": True,
                "phone": None,
                "avatar": None,
                "created_at": datetime.now(timezone.utc),
                "updated_at": datetime.now(timezone.utc),
            })
            user_id = str(user_result.inserted_id)
        else:
            user_id = str(existing["_id"])

        existing_student = await db.students.find_one({"user_id": user_id})
        if not existing_student:
            await db.students.insert_one({
                "user_id": user_id,
                "enrollment_number": s["enrollment"],
                "department_id": dept_ids[s["dept"]],
                "semester": s["sem"],
                "batch_year": s["batch"],
                "guardian_name": "Guardian Name",
                "guardian_phone": "+91-9000000000",
                "address": "123 College Road, City - 400001",
                "gender": "F" if s["full_name"].split()[0] in ["Alice", "Carol", "Eve"] else "M",
                "blood_group": "O+",
                "is_active": True,
                "created_at": datetime.now(timezone.utc),
                "updated_at": datetime.now(timezone.utc),
            })

    print(f"✅ {len(students_data)} students seeded (Password: Student@123)")

    # ─── Courses ───
    courses_data = [
        {"name": "Data Structures & Algorithms", "code": "CS301", "dept": "CSE", "credits": 4, "sem": 3, "teacher": "TCH001"},
        {"name": "Database Management Systems", "code": "CS302", "dept": "CSE", "credits": 3, "sem": 3, "teacher": "TCH001"},
        {"name": "Operating Systems", "code": "CS303", "dept": "CSE", "credits": 3, "sem": 3, "teacher": "TCH003"},
        {"name": "Computer Networks", "code": "CS401", "dept": "CSE", "credits": 3, "sem": 5, "teacher": "TCH001"},
        {"name": "Machine Learning", "code": "CS501", "dept": "CSE", "credits": 4, "sem": 5, "teacher": "TCH003"},
        {"name": "Digital Electronics", "code": "EC301", "dept": "ECE", "credits": 3, "sem": 3, "teacher": "TCH002"},
        {"name": "Web Development", "code": "IT301", "dept": "IT", "credits": 3, "sem": 3, "teacher": "TCH003"},
    ]
    for c in courses_data:
        existing = await db.courses.find_one({"code": c["code"]})
        if not existing:
            await db.courses.insert_one({
                "name": c["name"],
                "code": c["code"],
                "department_id": dept_ids[c["dept"]],
                "credits": c["credits"],
                "semester": c["sem"],
                "teacher_id": teacher_ids.get(c["teacher"]),
                "is_active": True,
                "created_at": datetime.now(timezone.utc),
                "updated_at": datetime.now(timezone.utc),
            })
    print(f"✅ {len(courses_data)} courses seeded")

    # ─── Current Semester ───
    existing_sem = await db.semesters.find_one({"is_current": True})
    if not existing_sem:
        await db.semesters.insert_one({
            "name": "Semester 5 - 2024-25",
            "start_date": datetime(2024, 8, 1, tzinfo=timezone.utc),
            "end_date": datetime(2024, 12, 31, tzinfo=timezone.utc),
            "is_current": True,
            "created_at": datetime.now(timezone.utc),
        })
        print("✅ Current semester seeded")

    # ─── Sample Notifications ───
    await db.notifications.delete_many({})
    notifications = [
        {"title": "Welcome to Smart SMS", "message": "Welcome to the Smart Student Management System. This platform helps you manage all academic activities efficiently.", "type": "announcement", "target_role": "all"},
        {"title": "Exam Schedule Released", "message": "The mid-semester examination schedule has been released. Please check the timetable section.", "type": "exam", "target_role": "student"},
        {"title": "Assignment Submission Reminder", "message": "Please ensure all pending assignments are submitted before the deadline.", "type": "assignment", "target_role": "student"},
        {"title": "Faculty Meeting", "message": "All faculty members are requested to attend the department meeting on Friday at 2 PM.", "type": "general", "target_role": "teacher"},
    ]
    for n in notifications:
        await db.notifications.insert_one({
            **n, "created_by": admin_id, "is_read": False, "created_at": datetime.now(timezone.utc)
        })
    print(f"✅ {len(notifications)} notifications seeded")

    print("\n" + "="*50)
    print("✨ Database seeding complete!")
    print("="*50)
    print("\n📋 Login Credentials:")
    print("  Admin:   admin@sms.edu          / Admin@123")
    print("  Teacher: prof.sharma@sms.edu    / Teacher@123")
    print("  Student: alice@student.sms.edu  / Student@123")
    print("\n🌐 API Docs: http://localhost:8000/api/docs")

    client.close()


if __name__ == "__main__":
    asyncio.run(seed())
