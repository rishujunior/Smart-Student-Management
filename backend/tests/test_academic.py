import uuid

from httpx import AsyncClient


def unique_code(prefix: str) -> str:
    return f"{prefix}{uuid.uuid4().hex[:6].upper()}"


class TestDepartments:
    async def test_admin_can_create_department(self, client: AsyncClient, admin_token: str, auth_headers):
        code = unique_code("DEP")
        response = await client.post(
            "/api/v1/academic/departments",
            json={"name": "Test Department", "code": code, "description": "A department for tests"},
            headers=auth_headers(admin_token),
        )
        assert response.status_code == 201
        data = response.json()
        assert data["code"] == code
        assert data["name"] == "Test Department"

    async def test_duplicate_department_code_rejected(self, client: AsyncClient, admin_token: str, auth_headers):
        code = unique_code("DUP")
        payload = {"name": "First Dept", "code": code}
        first = await client.post("/api/v1/academic/departments", json=payload, headers=auth_headers(admin_token))
        assert first.status_code == 201

        second = await client.post("/api/v1/academic/departments", json=payload, headers=auth_headers(admin_token))
        assert second.status_code == 400

    async def test_non_admin_cannot_create_department(self, client: AsyncClient, unique_email):
        register_res = await client.post(
            "/api/v1/auth/register",
            json={
                "email": unique_email("student"),
                "password": "testpassword123",
                "full_name": "Regular Student",
                "role": "student",
            },
        )
        token = register_res.json()["access_token"]

        response = await client.post(
            "/api/v1/academic/departments",
            json={"name": "Unauthorized Dept", "code": unique_code("UNAUTH")},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 403

    async def test_list_departments_includes_counts(self, client: AsyncClient, admin_token: str, auth_headers):
        code = unique_code("LST")
        await client.post(
            "/api/v1/academic/departments",
            json={"name": "Listable Department", "code": code},
            headers=auth_headers(admin_token),
        )

        response = await client.get("/api/v1/academic/departments", headers=auth_headers(admin_token))
        assert response.status_code == 200
        departments = response.json()
        match = next((d for d in departments if d["code"] == code), None)
        assert match is not None
        assert "student_count" in match
        assert "teacher_count" in match


class TestCourses:
    async def test_create_and_fetch_course(self, client: AsyncClient, admin_token: str, auth_headers):
        dept_res = await client.post(
            "/api/v1/academic/departments",
            json={"name": "Course Test Dept", "code": unique_code("CTD")},
            headers=auth_headers(admin_token),
        )
        department_id = dept_res.json()["id"]

        course_code = unique_code("CRS")
        course_res = await client.post(
            "/api/v1/academic/courses",
            json={
                "name": "Intro to Testing",
                "code": course_code,
                "department_id": department_id,
                "credits": 3,
                "semester": 1,
            },
            headers=auth_headers(admin_token),
        )
        assert course_res.status_code == 201
        course = course_res.json()
        assert course["code"] == course_code
        assert course["department_name"] == "Course Test Dept"

        fetch_res = await client.get(f"/api/v1/academic/courses/{course['id']}", headers=auth_headers(admin_token))
        assert fetch_res.status_code == 200
        assert fetch_res.json()["name"] == "Intro to Testing"

    async def test_list_courses_filters_by_semester(self, client: AsyncClient, admin_token: str, auth_headers):
        dept_res = await client.post(
            "/api/v1/academic/departments",
            json={"name": "Semester Filter Dept", "code": unique_code("SFD")},
            headers=auth_headers(admin_token),
        )
        department_id = dept_res.json()["id"]

        await client.post(
            "/api/v1/academic/courses",
            json={
                "name": "Semester Two Course",
                "code": unique_code("SEM2"),
                "department_id": department_id,
                "credits": 4,
                "semester": 2,
            },
            headers=auth_headers(admin_token),
        )

        response = await client.get(
            "/api/v1/academic/courses",
            params={"semester": 2, "department_id": department_id},
            headers=auth_headers(admin_token),
        )
        assert response.status_code == 200
        assert all(c["semester"] == 2 for c in response.json())
