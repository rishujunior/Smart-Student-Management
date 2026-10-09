import asyncio

from app.core.database import connect_to_mongo, close_mongo_connection, get_collection
from seed import AKTU_CSE_SEMESTER_3_SUBJECTS, seed_database


async def _seed_and_fetch():
    await connect_to_mongo()
    try:
        await seed_database()
        await seed_database()
        departments = get_collection("departments")
        department = await departments.find_one({"code": "CSE"})
        collection = get_collection("courses")
        courses = await collection.find({
            "department_id": str(department["_id"]),
            "semester": 3,
            "is_active": {"$ne": False},
        }).to_list(length=100)
        teacher_user = await get_collection("users").find_one({"email": "prof.sharma@sms.edu"})
        teacher = await get_collection("teachers").find_one({"user_id": str(teacher_user["_id"])})
        assigned_courses = await collection.find({
            "teacher_id": str(teacher["_id"]),
            "is_active": {"$ne": False},
        }).to_list(length=100)
        aayush_user = await get_collection("users").find_one({"full_name": "Aayush_Singh", "role": "student"})
        aayush_profile = await get_collection("students").find_one({"user_id": str(aayush_user["_id"])}) if aayush_user else None
        return courses, assigned_courses, aayush_profile
    finally:
        await close_mongo_connection()


def test_seed_creates_aktu_cse_semester_3_subjects():
    courses, assigned_courses, aayush_profile = asyncio.run(_seed_and_fetch())
    actual = {course["code"]: course["name"] for course in courses}
    required = {subject["code"]: subject["name"] for subject in AKTU_CSE_SEMESTER_3_SUBJECTS}
    assert len(courses) == 10
    assert actual == required
    assert all(course["semester"] == 3 for course in courses)
    assert all(course.get("branch") in {"CSE", "Computer Science Engineering"} for course in courses)
    assert all(course.get("credits") is None for course in courses)
    assert next(course for course in courses if course["code"] == "BAS303")["faculty_name"] == "Dr. Nayan Goel Modi"
    assert next(course for course in courses if course["name"] == "Data Structure")["faculty_name"] == "Alok Kumar Srivastav"
    assert next(course for course in courses if course["name"] == "Computer Organization & Architecture")["faculty_name"] == "Sanjay Gupta"
    assert next(course for course in courses if course["name"] == "Discrete Structures & Theory of Logic")["faculty_name"] == "Amit Dubey"
    assert next(course for course in courses if course["name"] == "Python Programming")["faculty_name"] == "Jyoti Pandey"
    assert next(course for course in courses if course["name"] == "Universal Human Values & Professional Ethics")["faculty_name"] == "SK Madhesiya"
    assert all(course.get("faculty_name") is None for course in courses if course["subject_type"] in {"lab", "workshop", "project"})
    assigned = {course["code"]: (course["name"], course["semester"]) for course in assigned_courses}
    assert assigned == {
        "BAS101": ("Engineering Mathematics-I", 1),
        "BAS303": ("Mathematics-IV", 3),
    }
    assert aayush_profile is not None
    assert aayush_profile["branch"] == "CSE"
    assert aayush_profile["semester"] == 3


async def test_teacher_courses_endpoint_returns_only_seeded_assignments(client):
    login = await client.post(
        "/api/v1/auth/login",
        json={"email": "prof.sharma@sms.edu", "password": "Teacher@123"},
    )
    assert login.status_code == 200, login.text
    headers = {"Authorization": f"Bearer {login.json()['access_token']}"}

    profile = await client.get("/api/v1/teachers/me", headers=headers)
    assert profile.status_code == 200, profile.text
    courses = await client.get(
        "/api/v1/academic/courses",
        params={"teacher_id": profile.json()["id"]},
        headers=headers,
    )

    assert courses.status_code == 200, courses.text
    assert {course["code"]: (course["name"], course["semester"]) for course in courses.json()} == {
        "BAS101": ("Engineering Mathematics-I", 1),
        "BAS303": ("Mathematics-IV", 3),
    }
