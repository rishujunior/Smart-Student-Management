from datetime import datetime, timezone, timedelta
from bson import ObjectId
import pytest
from httpx import AsyncClient

from app.core.database import get_collection
from app.core.security import get_password_hash
from seed import seed_database


@pytest.fixture
async def seeded_env(client: AsyncClient):
    """Ensure database has the standard AKTU CSE Semester III dataset."""
    await seed_database(demo_data=False)


@pytest.fixture
async def teacher_token(client: AsyncClient, seeded_env) -> str:
    """Log in as Prof. Rajesh Sharma."""
    res = await client.post(
        "/api/v1/auth/login",
        json={"email": "prof.sharma@sms.edu", "password": "Teacher@123"},
    )
    assert res.status_code == 200, res.text
    return res.json()["access_token"]


@pytest.fixture
async def rishu_token(client: AsyncClient, seeded_env) -> str:
    """Log in as student Aayush_Singh."""
    # Ensure student user has a known password
    users_col = get_collection("users")
    user = await users_col.find_one({"full_name": "Aayush_Singh", "role": "student"})
    assert user is not None, "Aayush_Singh user not found"
    await users_col.update_one(
        {"_id": user["_id"]},
        {"$set": {"password_hash": get_password_hash("Student@123")}},
    )
    res = await client.post(
        "/api/v1/auth/login",
        json={"email": user["email"], "password": "Student@123"},
    )
    assert res.status_code == 200, res.text
    return res.json()["access_token"]


@pytest.fixture
async def other_semester_student_token(client: AsyncClient, seeded_env, unique_email) -> tuple[str, str]:
    """Create a student in Semester 1 (e.g. Mechanical/CSE Sem 1) to test isolation."""
    users_col = get_collection("users")
    students_col = get_collection("students")
    depts_col = get_collection("departments")
    cse_dept = await depts_col.find_one({"code": "CSE"})

    email = unique_email("sem1student")
    now = datetime.now(timezone.utc)
    u_res = await users_col.insert_one({
        "email": email,
        "password_hash": get_password_hash("Sem1Student@123"),
        "full_name": "Semester One Student",
        "role": "student",
        "is_active": True,
        "is_verified": True,
        "created_at": now,
        "updated_at": now,
    })
    s_user_id = str(u_res.inserted_id)

    await students_col.insert_one({
        "user_id": s_user_id,
        "enrollment_number": f"CSE1-{s_user_id[-6:].upper()}",
        "department_id": str(cse_dept["_id"]),
        "branch": "CSE",
        "semester": 1,
        "batch_year": 2026,
        "is_active": True,
        "created_at": now,
    })

    res = await client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": "Sem1Student@123"},
    )
    assert res.status_code == 200, res.text
    return res.json()["access_token"], s_user_id


async def test_teacher_course_authorization(client: AsyncClient, teacher_token: str, auth_headers):
    """Prof. Sharma can only publish assignments for courses assigned to him."""
    courses_col = get_collection("courses")
    bas303 = await courses_col.find_one({"code": "BAS303"})
    bcs301 = await courses_col.find_one({"code": "BCS301"})  # Not assigned to Prof. Sharma

    assert bas303 is not None
    assert bcs301 is not None

    due_date = (datetime.now(timezone.utc) + timedelta(days=7)).isoformat()

    # 1. Attempt creating for unassigned course BCS301 -> Must be 403 Forbidden
    res_forbidden = await client.post(
        "/api/v1/assignments",
        headers=auth_headers(teacher_token),
        json={
            "title": "Data Structures Assignment",
            "description": "Unauthorized attempt",
            "course_id": str(bcs301["_id"]),
            "due_date": due_date,
            "total_marks": 25.0,
        },
    )
    assert res_forbidden.status_code == 403
    assert "only permitted to create assignments for courses assigned to you" in res_forbidden.text

    # 2. Creating for assigned course BAS303 -> Must succeed 201 Created
    res_success = await client.post(
        "/api/v1/assignments",
        headers=auth_headers(teacher_token),
        json={
            "title": "Mathematics Unit 1 Assignment",
            "description": "Complete the Unit 1 practice questions.",
            "course_id": str(bas303["_id"]),
            "due_date": "2026-10-15T23:59:59Z",
            "total_marks": 20.0,
        },
    )
    assert res_success.status_code == 201
    data = res_success.json()
    assert data["title"] == "Mathematics Unit 1 Assignment"
    assert data["course_name"] == "Mathematics-IV"


async def test_targeted_student_notification(
    client: AsyncClient,
    teacher_token: str,
    rishu_token: str,
    other_semester_student_token: tuple[str, str],
    auth_headers,
):
    """Publishing BAS303 notifies Aayush_Singh (Semester 3) and NOT Semester 1 student."""
    courses_col = get_collection("courses")
    users_col = get_collection("users")
    notifications_col = get_collection("notifications")

    bas303 = await courses_col.find_one({"code": "BAS303"})
    rishu_user = await users_col.find_one({"full_name": "Aayush_Singh"})
    other_token, other_user_id = other_semester_student_token

    # Clear prior assignment notifications for clean assertion
    await notifications_col.delete_many({"type": "assignment"})

    # Teacher publishes assignment
    res = await client.post(
        "/api/v1/assignments",
        headers=auth_headers(teacher_token),
        json={
            "title": "Mathematics Unit 1 Assignment",
            "description": "Complete the Unit 1 practice questions.",
            "course_id": str(bas303["_id"]),
            "due_date": "2026-10-15T23:59:59Z",
            "total_marks": 20.0,
            "is_active": True,
        },
    )
    assert res.status_code == 201
    assignment_id = res.json()["id"]

    # Verify notification exists in MongoDB for Aayush_Singh
    rishu_notif = await notifications_col.find_one({
        "assignment_id": assignment_id,
        "target_user_id": str(rishu_user["_id"]),
    })
    assert rishu_notif is not None
    assert rishu_notif["title"] == "New Assignment"
    assert "Mathematics Unit 1 Assignment" in rishu_notif["message"]
    assert "Mathematics-IV" in rishu_notif["message"]
    assert rishu_notif["is_read"] is False

    # Verify other student (Sem 1) got NO notification
    other_notif = await notifications_col.find_one({
        "assignment_id": assignment_id,
        "target_user_id": other_user_id,
    })
    assert other_notif is None

    # Verify Aayush_Singh retrieves this notification via GET /notifications
    notif_res = await client.get("/api/v1/notifications", headers=auth_headers(rishu_token))
    assert notif_res.status_code == 200
    rishu_notifs = notif_res.json()
    matching = [n for n in rishu_notifs if n.get("assignment_id") == assignment_id]
    assert len(matching) == 1
    assert matching[0]["assignment_id"] == assignment_id
    assert matching[0]["course_id"] == str(bas303["_id"])

    # Verify other student retrieves NO assignment notification
    other_notif_res = await client.get("/api/v1/notifications", headers=auth_headers(other_token))
    assert other_notif_res.status_code == 200
    other_notifs = other_notif_res.json()
    assert not any(n.get("assignment_id") == assignment_id for n in other_notifs)


async def test_student_assignment_visibility_and_curriculum_consistency(
    client: AsyncClient,
    teacher_token: str,
    rishu_token: str,
    other_semester_student_token: tuple[str, str],
    auth_headers,
):
    """Students only see assignments for courses in their curriculum in Student -> Assignments."""
    courses_col = get_collection("courses")
    bas303 = await courses_col.find_one({"code": "BAS303"})
    other_token, _ = other_semester_student_token

    # Teacher publishes assignment
    res = await client.post(
        "/api/v1/assignments",
        headers=auth_headers(teacher_token),
        json={
            "title": "Mathematics Unit 1 Assignment",
            "description": "Complete the Unit 1 practice questions.",
            "course_id": str(bas303["_id"]),
            "due_date": "2026-10-15T23:59:59Z",
            "total_marks": 20.0,
        },
    )
    assert res.status_code == 201
    assignment_id = res.json()["id"]

    # 1. Aayush_Singh (Semester 3) lists assignments -> Must see it
    rishu_list = await client.get("/api/v1/assignments", headers=auth_headers(rishu_token))
    assert rishu_list.status_code == 200
    rishu_assignments = rishu_list.json()
    assert any(a["id"] == assignment_id for a in rishu_assignments)

    # 2. Semester 1 student lists assignments -> Must NOT see it
    other_list = await client.get("/api/v1/assignments", headers=auth_headers(other_token))
    assert other_list.status_code == 200
    other_assignments = other_list.json()
    assert not any(a["id"] == assignment_id for a in other_assignments)


async def test_draft_does_not_notify_until_published(
    client: AsyncClient,
    teacher_token: str,
    rishu_token: str,
    auth_headers,
):
    """Draft assignments (is_active: False) do not notify; publish transition does."""
    courses_col = get_collection("courses")
    notifications_col = get_collection("notifications")
    users_col = get_collection("users")

    bas303 = await courses_col.find_one({"code": "BAS303"})
    rishu_user = await users_col.find_one({"full_name": "Aayush_Singh"})

    # 1. Create draft assignment (is_active: False)
    draft_res = await client.post(
        "/api/v1/assignments",
        headers=auth_headers(teacher_token),
        json={
            "title": "Mathematics Draft Assignment",
            "description": "Draft questions.",
            "course_id": str(bas303["_id"]),
            "due_date": "2026-10-20T23:59:59Z",
            "total_marks": 15.0,
            "is_active": False,
        },
    )
    assert draft_res.status_code == 201
    assignment_id = draft_res.json()["id"]

    # Verify no notification created
    notif = await notifications_col.find_one({
        "assignment_id": assignment_id,
        "target_user_id": str(rishu_user["_id"]),
    })
    assert notif is None

    # 2. Publish the draft assignment (is_active: True)
    pub_res = await client.put(
        f"/api/v1/assignments/{assignment_id}",
        headers=auth_headers(teacher_token),
        json={"is_active": True},
    )
    assert pub_res.status_code == 200

    # Verify notification now created
    notif_published = await notifications_col.find_one({
        "assignment_id": assignment_id,
        "target_user_id": str(rishu_user["_id"]),
    })
    assert notif_published is not None
    assert notif_published["title"] == "New Assignment"


async def test_republishing_does_not_duplicate_student_notifications(
    client: AsyncClient, teacher_token: str, auth_headers,
):
    """Only the draft-to-published transition can dispatch assignment notices."""
    courses_col = get_collection("courses")
    notifications_col = get_collection("notifications")
    bas303 = await courses_col.find_one({"code": "BAS303"})

    draft = await _publish(
        client, teacher_token, auth_headers, str(bas303["_id"]), "Publish Once Only", _due(7), is_active=False,
    )
    assignment_id = draft["id"]

    first_publish = await client.put(
        f"/api/v1/assignments/{assignment_id}", headers=auth_headers(teacher_token), json={"is_active": True},
    )
    assert first_publish.status_code == 200
    retry_publish = await client.put(
        f"/api/v1/assignments/{assignment_id}", headers=auth_headers(teacher_token), json={"is_active": True},
    )
    assert retry_publish.status_code == 200

    count = await notifications_col.count_documents({"assignment_id": assignment_id})
    eligible_students = await get_collection("students").count_documents({
        "department_id": str(bas303["department_id"]),
        "semester": bas303["semester"],
        "branch": bas303["branch"],
        "is_active": {"$ne": False},
    })
    assert count == eligible_students


def _due(days: int) -> str:
    return (datetime.now(timezone.utc) + timedelta(days=days)).isoformat()


async def _publish(client: AsyncClient, token: str, auth_headers, course_id: str, title: str, due_date: str, is_active: bool = True, marks: float = 20.0):
    res = await client.post(
        "/api/v1/assignments",
        headers=auth_headers(token),
        json={
            "title": title,
            "description": f"Instructions for {title}",
            "course_id": course_id,
            "due_date": due_date,
            "total_marks": marks,
            "is_active": is_active,
        },
    )
    assert res.status_code == 201, res.text
    return res.json()


@pytest.fixture
async def peer_semester_student(client: AsyncClient, seeded_env, unique_email) -> tuple[str, str]:
    """Another CSE Semester 3 student used for isolation checks."""
    users_col = get_collection("users")
    students_col = get_collection("students")
    depts_col = get_collection("departments")
    cse_dept = await depts_col.find_one({"code": "CSE"})
    email = unique_email("sem3peer")
    now = datetime.now(timezone.utc)
    u_res = await users_col.insert_one({
        "email": email,
        "password_hash": get_password_hash("PeerStudent@123"),
        "full_name": "Semester Three Peer",
        "role": "student",
        "is_active": True,
        "is_verified": True,
        "created_at": now,
        "updated_at": now,
    })
    user_id = str(u_res.inserted_id)
    await students_col.insert_one({
        "user_id": user_id,
        "enrollment_number": f"CSE3-{user_id[-6:].upper()}",
        "department_id": str(cse_dept["_id"]),
        "branch": "CSE",
        "semester": 3,
        "batch_year": 2024,
        "is_active": True,
        "created_at": now,
    })
    res = await client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": "PeerStudent@123"},
    )
    assert res.status_code == 200, res.text
    return res.json()["access_token"], user_id


async def test_published_assignment_appears_for_correct_student(
    client: AsyncClient, teacher_token: str, rishu_token: str, auth_headers,
):
    courses_col = get_collection("courses")
    bas303 = await courses_col.find_one({"code": "BAS303"})
    created = await _publish(client, teacher_token, auth_headers, str(bas303["_id"]), "Visible Maths Assignment", _due(5))

    listed = await client.get("/api/v1/assignments", headers=auth_headers(rishu_token))
    assert listed.status_code == 200
    match = next(a for a in listed.json() if a["id"] == created["id"])
    assert match["student_status"] == "pending"
    assert match["has_submitted"] is False
    assert match["course_code"] == "BAS303"
    assert match["course_name"] == "Mathematics-IV"
    assert match["is_active"] is True


async def test_draft_assignment_does_not_appear_for_student(
    client: AsyncClient, teacher_token: str, rishu_token: str, auth_headers,
):
    courses_col = get_collection("courses")
    bas303 = await courses_col.find_one({"code": "BAS303"})
    created = await _publish(
        client, teacher_token, auth_headers, str(bas303["_id"]), "Hidden Draft Assignment", _due(5), is_active=False,
    )

    listed = await client.get("/api/v1/assignments", headers=auth_headers(rishu_token))
    assert listed.status_code == 200
    assert not any(a["id"] == created["id"] for a in listed.json())

    detail = await client.get(f"/api/v1/assignments/{created['id']}", headers=auth_headers(rishu_token))
    assert detail.status_code == 404


async def test_assignment_for_another_course_does_not_appear(
    client: AsyncClient, teacher_token: str, rishu_token: str, auth_headers,
):
    courses_col = get_collection("courses")
    bas101 = await courses_col.find_one({"code": "BAS101"})
    created = await _publish(client, teacher_token, auth_headers, str(bas101["_id"]), "Semester I Maths", _due(4))

    listed = await client.get(
        "/api/v1/assignments",
        headers=auth_headers(rishu_token),
        params={"course_id": str(bas101["_id"])},
    )
    assert listed.status_code == 200
    assert not any(a["id"] == created["id"] for a in listed.json())

    detail = await client.get(f"/api/v1/assignments/{created['id']}", headers=auth_headers(rishu_token))
    assert detail.status_code == 404


async def test_unsubmitted_future_assignment_is_pending(
    client: AsyncClient, teacher_token: str, rishu_token: str, auth_headers,
):
    courses_col = get_collection("courses")
    bas303 = await courses_col.find_one({"code": "BAS303"})
    created = await _publish(client, teacher_token, auth_headers, str(bas303["_id"]), "Future Pending Work", _due(10))
    listed = await client.get("/api/v1/assignments", headers=auth_headers(rishu_token))
    match = next(a for a in listed.json() if a["id"] == created["id"])
    assert match["student_status"] == "pending"
    assert match["has_submitted"] is False


async def test_unsubmitted_past_due_assignment_is_overdue(
    client: AsyncClient, teacher_token: str, rishu_token: str, auth_headers,
):
    courses_col = get_collection("courses")
    bas303 = await courses_col.find_one({"code": "BAS303"})
    created = await _publish(client, teacher_token, auth_headers, str(bas303["_id"]), "Overdue Work", _due(-3))
    listed = await client.get("/api/v1/assignments", headers=auth_headers(rishu_token))
    match = next(a for a in listed.json() if a["id"] == created["id"])
    assert match["student_status"] == "overdue"
    assert match["has_submitted"] is False


async def test_submitted_assignment_is_not_pending(
    client: AsyncClient, teacher_token: str, rishu_token: str, auth_headers,
):
    courses_col = get_collection("courses")
    bas303 = await courses_col.find_one({"code": "BAS303"})
    created = await _publish(client, teacher_token, auth_headers, str(bas303["_id"]), "Submit Then Hide", _due(6))

    submit = await client.post(
        f"/api/v1/assignments/{created['id']}/submit",
        headers=auth_headers(rishu_token),
        data={"content": "My answers"},
    )
    assert submit.status_code == 200, submit.text

    listed = await client.get("/api/v1/assignments", headers=auth_headers(rishu_token))
    match = next(a for a in listed.json() if a["id"] == created["id"])
    assert match["student_status"] == "submitted"
    assert match["has_submitted"] is True
    pending = [a for a in listed.json() if a["student_status"] in {"pending", "overdue"}]
    assert not any(a["id"] == created["id"] for a in pending)


async def test_multiple_pending_assignments_are_all_returned_and_ordered(
    client: AsyncClient, teacher_token: str, rishu_token: str, admin_token: str, auth_headers,
):
    courses_col = get_collection("courses")
    bas303 = await courses_col.find_one({"code": "BAS303"})
    bcs301 = await courses_col.find_one({"code": "BCS301"})
    assert bcs301 is not None

    later = await _publish(client, teacher_token, auth_headers, str(bas303["_id"]), "Later Pending", _due(12))
    overdue = await _publish(client, teacher_token, auth_headers, str(bas303["_id"]), "Already Overdue", _due(-2))
    soon = await _publish(client, teacher_token, auth_headers, str(bas303["_id"]), "Soon Pending", _due(2))
    other_course = await _publish(client, admin_token, auth_headers, str(bcs301["_id"]), "DS Pending", _due(5))

    listed = await client.get("/api/v1/assignments", headers=auth_headers(rishu_token))
    assert listed.status_code == 200
    items = listed.json()
    wanted = {overdue["id"], soon["id"], other_course["id"], later["id"]}
    returned_ids = {a["id"] for a in items}
    assert wanted.issubset(returned_ids)

    pending = [a for a in items if a["student_status"] in {"pending", "overdue"}]
    pending_ids = [a["id"] for a in pending]
    assert pending_ids.index(overdue["id"]) < pending_ids.index(soon["id"])
    assert pending_ids.index(soon["id"]) < pending_ids.index(other_course["id"])
    assert pending_ids.index(other_course["id"]) < pending_ids.index(later["id"])
    assert pending[0]["student_status"] == "overdue"


async def test_unauthorized_student_cannot_access_other_student_submission_data(
    client: AsyncClient,
    teacher_token: str,
    rishu_token: str,
    peer_semester_student: tuple[str, str],
    other_semester_student_token: tuple[str, str],
    auth_headers,
):
    courses_col = get_collection("courses")
    bas303 = await courses_col.find_one({"code": "BAS303"})
    created = await _publish(client, teacher_token, auth_headers, str(bas303["_id"]), "Private Submission Work", _due(8))

    submit = await client.post(
        f"/api/v1/assignments/{created['id']}/submit",
        headers=auth_headers(rishu_token),
        data={"content": "Rishu private answers"},
    )
    assert submit.status_code == 200
    submission_id = submit.json()["id"]

    peer_token, _ = peer_semester_student
    peer_subs = await client.get("/api/v1/assignments/submissions/student", headers=auth_headers(peer_token))
    assert peer_subs.status_code == 200
    assert not any(s["id"] == submission_id for s in peer_subs.json())
    assert not any("Rishu private answers" in (s.get("content") or "") for s in peer_subs.json())

    other_token, _ = other_semester_student_token
    other_detail = await client.get(f"/api/v1/assignments/{created['id']}", headers=auth_headers(other_token))
    assert other_detail.status_code == 404

    other_submit = await client.post(
        f"/api/v1/assignments/{created['id']}/submit",
        headers=auth_headers(other_token),
        data={"content": "Should not be allowed"},
    )
    assert other_submit.status_code == 404

    teacher_only = await client.get(
        f"/api/v1/assignments/{created['id']}/submissions",
        headers=auth_headers(rishu_token),
    )
    assert teacher_only.status_code == 403
