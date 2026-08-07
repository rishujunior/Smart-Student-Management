import uuid

from httpx import AsyncClient


def unique_code(prefix: str) -> str:
    return f"{prefix}{uuid.uuid4().hex[:6].upper()}"


async def _register_user(client: AsyncClient, unique_email, prefix: str, role: str = "student") -> str:
    res = await client.post(
        "/api/v1/auth/register",
        json={
            "email": unique_email(prefix),
            "password": "testpassword123",
            "full_name": f"{prefix.title()} Test User",
            "role": role,
        },
    )
    assert res.status_code == 201, res.text
    return res.json()["user"]["id"]


async def _create_department(client: AsyncClient, admin_token: str, auth_headers) -> str:
    res = await client.post(
        "/api/v1/academic/departments",
        json={"name": "Student Test Dept", "code": unique_code("STD")},
        headers=auth_headers(admin_token),
    )
    assert res.status_code == 201, res.text
    return res.json()["id"]


class TestStudents:
    async def test_admin_creates_student_profile(self, client: AsyncClient, admin_token: str, auth_headers, unique_email):
        user_id = await _register_user(client, unique_email, "studentprofile")
        department_id = await _create_department(client, admin_token, auth_headers)

        response = await client.post(
            "/api/v1/students",
            json={
                "user_id": user_id,
                "enrollment_number": unique_code("ENR"),
                "department_id": department_id,
                "semester": 3,
                "batch_year": 2024,
            },
            headers=auth_headers(admin_token),
        )
        assert response.status_code == 201
        data = response.json()
        assert data["user_id"] == user_id
        assert data["semester"] == 3
        assert data["department_name"] == "Student Test Dept"

    async def test_duplicate_enrollment_number_rejected(self, client: AsyncClient, admin_token: str, auth_headers, unique_email):
        department_id = await _create_department(client, admin_token, auth_headers)
        enrollment_number = unique_code("DUPENR")

        user_id_1 = await _register_user(client, unique_email, "dup1")
        first = await client.post(
            "/api/v1/students",
            json={
                "user_id": user_id_1,
                "enrollment_number": enrollment_number,
                "department_id": department_id,
                "semester": 1,
                "batch_year": 2024,
            },
            headers=auth_headers(admin_token),
        )
        assert first.status_code == 201

        user_id_2 = await _register_user(client, unique_email, "dup2")
        second = await client.post(
            "/api/v1/students",
            json={
                "user_id": user_id_2,
                "enrollment_number": enrollment_number,
                "department_id": department_id,
                "semester": 1,
                "batch_year": 2024,
            },
            headers=auth_headers(admin_token),
        )
        assert second.status_code == 400

    async def test_student_can_view_own_profile(self, client: AsyncClient, admin_token: str, auth_headers, unique_email):
        email = unique_email("selfview")
        register_res = await client.post(
            "/api/v1/auth/register",
            json={
                "email": email,
                "password": "testpassword123",
                "full_name": "Self View Student",
                "role": "student",
            },
        )
        student_token = register_res.json()["access_token"]
        user_id = register_res.json()["user"]["id"]

        department_id = await _create_department(client, admin_token, auth_headers)
        await client.post(
            "/api/v1/students",
            json={
                "user_id": user_id,
                "enrollment_number": unique_code("SELF"),
                "department_id": department_id,
                "semester": 2,
                "batch_year": 2025,
            },
            headers=auth_headers(admin_token),
        )

        response = await client.get("/api/v1/students/me", headers=auth_headers(student_token))
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == email
        assert "cgpa" in data
        assert "attendance_percentage" in data

    async def test_non_admin_cannot_create_student(self, client: AsyncClient, admin_token: str, auth_headers, unique_email):
        department_id = await _create_department(client, admin_token, auth_headers)
        teacher_user_id = await _register_user(client, unique_email, "teachernoperm", role="teacher")

        register_res = await client.post(
            "/api/v1/auth/register",
            json={"email": unique_email("bystander"), "password": "testpassword123", "full_name": "Bystander", "role": "teacher"},
        )
        teacher_token = register_res.json()["access_token"]

        response = await client.post(
            "/api/v1/students",
            json={
                "user_id": teacher_user_id,
                "enrollment_number": unique_code("NOPE"),
                "department_id": department_id,
                "semester": 1,
                "batch_year": 2024,
            },
            headers={"Authorization": f"Bearer {teacher_token}"},
        )
        assert response.status_code == 403
