import uuid
from datetime import datetime, timedelta, timezone

from httpx import AsyncClient


def unique_code(prefix: str) -> str:
    return f"{prefix}{uuid.uuid4().hex[:6].upper()}"


async def _setup_student_with_course(client: AsyncClient, admin_token: str, auth_headers, unique_email):
    headers = auth_headers(admin_token)

    dept_res = await client.post(
        "/api/v1/academic/departments",
        json={"name": "Results Test Dept", "code": unique_code("RTD")},
        headers=headers,
    )
    department_id = dept_res.json()["id"]

    course_res = await client.post(
        "/api/v1/academic/courses",
        json={
            "name": "Applied Testing",
            "code": unique_code("APT"),
            "department_id": department_id,
            "credits": 3,
            "semester": 3,
        },
        headers=headers,
    )
    course_id = course_res.json()["id"]

    now = datetime.now(timezone.utc)
    sem_res = await client.post(
        "/api/v1/academic/semesters",
        json={
            "name": f"Results Test Semester {uuid.uuid4().hex[:6]}",
            "start_date": now.isoformat(),
            "end_date": (now + timedelta(days=120)).isoformat(),
            "is_current": False,
        },
        headers=headers,
    )
    semester_id = sem_res.json()["id"]

    register_res = await client.post(
        "/api/v1/auth/register",
        json={
            "email": unique_email("resultstudent"),
            "password": "testpassword123",
            "full_name": "Results Test Student",
            "role": "student",
        },
    )
    user_id = register_res.json()["user"]["id"]

    student_res = await client.post(
        "/api/v1/students",
        json={
            "user_id": user_id,
            "enrollment_number": unique_code("RES"),
            "department_id": department_id,
            "semester": 3,
            "batch_year": 2024,
        },
        headers=headers,
    )
    student_id = student_res.json()["id"]

    return {"student_id": student_id, "course_id": course_id, "semester_id": semester_id}


class TestResults:
    async def test_teacher_is_forbidden_from_result_read_and_write_endpoints(
        self, client: AsyncClient, unique_email, auth_headers
    ):
        registration = await client.post(
            "/api/v1/auth/register",
            json={
                "email": unique_email("resultsforbiddenteacher"),
                "password": "testpassword123",
                "full_name": "Results Forbidden Teacher",
                "role": "teacher",
            },
        )
        headers = auth_headers(registration.json()["access_token"])
        result_payload = {
            "student_id": "507f1f77bcf86cd799439011",
            "course_id": "507f1f77bcf86cd799439012",
            "semester_id": "507f1f77bcf86cd799439013",
            "internal_marks": 20,
            "external_marks": 30,
        }

        reads = await client.get("/api/v1/results/student/507f1f77bcf86cd799439011", headers=headers)
        create = await client.post("/api/v1/results", json=result_payload, headers=headers)
        update = await client.put(
            "/api/v1/results/507f1f77bcf86cd799439014",
            json={"internal_marks": 25},
            headers=headers,
        )

        assert reads.status_code == 403
        assert create.status_code == 403
        assert update.status_code == 403

    async def test_student_retains_result_read_access(self, client: AsyncClient, unique_email, auth_headers):
        registration = await client.post(
            "/api/v1/auth/register",
            json={
                "email": unique_email("resultsstudentviewer"),
                "password": "testpassword123",
                "full_name": "Results Student Viewer",
                "role": "student",
            },
        )
        response = await client.get(
            "/api/v1/results/student/507f1f77bcf86cd799439011",
            headers=auth_headers(registration.json()["access_token"]),
        )

        assert response.status_code == 200

    async def test_add_result_calculates_grade_and_percentage(
        self, client: AsyncClient, admin_token: str, auth_headers, unique_email
    ):
        ctx = await _setup_student_with_course(client, admin_token, auth_headers, unique_email)

        response = await client.post(
            "/api/v1/results",
            json={
                "student_id": ctx["student_id"],
                "course_id": ctx["course_id"],
                "semester_id": ctx["semester_id"],
                "internal_marks": 35,
                "external_marks": 52,
                "max_internal": 40,
                "max_external": 60,
            },
            headers=auth_headers(admin_token),
        )
        assert response.status_code == 201
        data = response.json()
        assert data["total_marks"] == 87
        assert data["max_marks"] == 100
        assert data["percentage"] == 87.0
        assert data["grade"] == "A+"
        assert data["grade_point"] == 9.0
        assert data["is_pass"] is True

    async def test_failing_result_marked_correctly(
        self, client: AsyncClient, admin_token: str, auth_headers, unique_email
    ):
        ctx = await _setup_student_with_course(client, admin_token, auth_headers, unique_email)

        response = await client.post(
            "/api/v1/results",
            json={
                "student_id": ctx["student_id"],
                "course_id": ctx["course_id"],
                "semester_id": ctx["semester_id"],
                "internal_marks": 10,
                "external_marks": 15,
                "max_internal": 40,
                "max_external": 60,
            },
            headers=auth_headers(admin_token),
        )
        assert response.status_code == 201
        data = response.json()
        assert data["percentage"] == 25.0
        assert data["grade"] == "F"
        assert data["is_pass"] is False

    async def test_cgpa_reflects_recorded_results(
        self, client: AsyncClient, admin_token: str, auth_headers, unique_email
    ):
        ctx = await _setup_student_with_course(client, admin_token, auth_headers, unique_email)

        await client.post(
            "/api/v1/results",
            json={
                "student_id": ctx["student_id"],
                "course_id": ctx["course_id"],
                "semester_id": ctx["semester_id"],
                "internal_marks": 35,
                "external_marks": 52,
                "max_internal": 40,
                "max_external": 60,
            },
            headers=auth_headers(admin_token),
        )

        response = await client.get(
            f"/api/v1/results/student/{ctx['student_id']}/cgpa",
            headers=auth_headers(admin_token),
        )
        assert response.status_code == 200
        data = response.json()
        assert data["cgpa"] == 9.0
        assert data["total_credits"] == 3

    async def test_cgpa_is_zero_with_no_results(self, client: AsyncClient, admin_token: str, auth_headers, unique_email):
        register_res = await client.post(
            "/api/v1/auth/register",
            json={
                "email": unique_email("noresults"),
                "password": "testpassword123",
                "full_name": "No Results Student",
                "role": "student",
            },
        )
        user_id = register_res.json()["user"]["id"]

        dept_res = await client.post(
            "/api/v1/academic/departments",
            json={"name": "Empty Results Dept", "code": unique_code("ERD")},
            headers=auth_headers(admin_token),
        )
        student_res = await client.post(
            "/api/v1/students",
            json={
                "user_id": user_id,
                "enrollment_number": unique_code("EMPTY"),
                "department_id": dept_res.json()["id"],
                "semester": 1,
                "batch_year": 2025,
            },
            headers=auth_headers(admin_token),
        )
        student_id = student_res.json()["id"]

        response = await client.get(
            f"/api/v1/results/student/{student_id}/cgpa",
            headers=auth_headers(admin_token),
        )
        assert response.status_code == 200
        assert response.json()["cgpa"] == 0
