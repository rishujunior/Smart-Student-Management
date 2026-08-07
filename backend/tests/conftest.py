import uuid
from datetime import datetime, timezone

import pytest
from httpx import ASGITransport, AsyncClient

from app.core.database import close_mongo_connection, connect_to_mongo, get_collection
from app.core.security import get_password_hash
from app.main import app


@pytest.fixture(autouse=True)
async def _db_connection():
    # httpx's ASGITransport doesn't trigger FastAPI's lifespan startup/shutdown
    # events, so the Motor client that app.core.database relies on is
    # established explicitly here instead. Scoped per-test (function scope,
    # the pytest-asyncio default) so the client's async primitives are bound
    # to the same event loop the test itself runs on.
    await connect_to_mongo()
    yield
    await close_mongo_connection()


@pytest.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


def _unique_email(prefix: str) -> str:
    return f"{prefix}-{uuid.uuid4().hex[:10]}@test.sms.edu"


@pytest.fixture
def unique_email():
    """Factory fixture: unique_email("prefix") -> a fresh, collision-free email."""
    return _unique_email


@pytest.fixture
async def admin_token(client: AsyncClient, unique_email) -> str:
    """Admin accounts can't be created through /auth/register (by design),
    so tests seed one directly in the users collection and log in normally."""
    users_col = get_collection("users")
    email = unique_email("admin")
    now = datetime.now(timezone.utc)
    await users_col.insert_one({
        "email": email,
        "password_hash": get_password_hash("AdminTest@123"),
        "full_name": "Test Administrator",
        "role": "admin",
        "is_active": True,
        "is_verified": True,
        "phone": None,
        "avatar": None,
        "created_at": now,
        "updated_at": now,
    })

    res = await client.post("/api/v1/auth/login", json={"email": email, "password": "AdminTest@123"})
    assert res.status_code == 200, res.text
    return res.json()["access_token"]


@pytest.fixture
def auth_headers():
    def _make(token: str) -> dict:
        return {"Authorization": f"Bearer {token}"}
    return _make
