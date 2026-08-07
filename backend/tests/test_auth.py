from httpx import AsyncClient


class TestAuth:
    async def test_register_user(self, client: AsyncClient, unique_email):
        response = await client.post(
            "/api/v1/auth/register",
            json={
                "email": unique_email("register"),
                "password": "testpassword123",
                "full_name": "Test User",
                "role": "student",
            },
        )
        assert response.status_code == 201
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["user"]["role"] == "student"

    async def test_register_rejects_duplicate_email(self, client: AsyncClient, unique_email):
        email = unique_email("dup")
        payload = {
            "email": email,
            "password": "testpassword123",
            "full_name": "Duplicate User",
            "role": "student",
        }
        first = await client.post("/api/v1/auth/register", json=payload)
        assert first.status_code == 201

        second = await client.post("/api/v1/auth/register", json=payload)
        assert second.status_code == 400
        assert "already registered" in second.json()["detail"].lower()

    async def test_register_rejects_admin_role(self, client: AsyncClient, unique_email):
        response = await client.post(
            "/api/v1/auth/register",
            json={
                "email": unique_email("wannabe-admin"),
                "password": "testpassword123",
                "full_name": "Sneaky User",
                "role": "admin",
            },
        )
        assert response.status_code == 403

    async def test_login_with_wrong_password_fails(self, client: AsyncClient, unique_email):
        email = unique_email("login")
        await client.post(
            "/api/v1/auth/register",
            json={
                "email": email,
                "password": "correct-password",
                "full_name": "Login Test User",
                "role": "student",
            },
        )

        response = await client.post(
            "/api/v1/auth/login",
            json={"email": email, "password": "wrong-password"},
        )
        assert response.status_code == 401

    async def test_login_then_fetch_profile(self, client: AsyncClient, unique_email):
        email = unique_email("profile")
        register_res = await client.post(
            "/api/v1/auth/register",
            json={
                "email": email,
                "password": "testpassword123",
                "full_name": "Profile Test User",
                "role": "teacher",
            },
        )
        token = register_res.json()["access_token"]

        me_res = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
        assert me_res.status_code == 200
        assert me_res.json()["email"] == email
        assert me_res.json()["role"] == "teacher"

    async def test_me_requires_authentication(self, client: AsyncClient):
        response = await client.get("/api/v1/auth/me")
        assert response.status_code in (401, 403)

    async def test_health_check(self, client: AsyncClient):
        response = await client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["database"] == "connected"
