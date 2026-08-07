from datetime import datetime, timezone
from bson import ObjectId
from typing import Optional
from app.core.database import get_collection
from app.core.security import get_password_hash, verify_password, create_access_token, create_refresh_token, verify_token
from app.schemas.auth import UserCreate, UserLogin, TokenResponse, UserResponse
from fastapi import HTTPException, status
import secrets


def serialize_user(user: dict) -> UserResponse:
    return UserResponse(
        id=str(user["_id"]),
        email=user["email"],
        full_name=user["full_name"],
        role=user["role"],
        is_active=user.get("is_active", True),
        is_verified=user.get("is_verified", False),
        avatar=user.get("avatar"),
        phone=user.get("phone"),
        created_at=user.get("created_at", datetime.now(timezone.utc)),
    )


class AuthService:
    def __init__(self):
        self.collection_name = "users"

    @property
    def collection(self):
        return get_collection(self.collection_name)

    async def register(self, data: UserCreate) -> TokenResponse:
        # Admin accounts must never be created through public self-registration
        if data.role == "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Administrator accounts cannot be self-registered. Contact an existing administrator.",
            )

        # Check existing user
        existing = await self.collection.find_one({"email": data.email})
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered",
            )

        now = datetime.now(timezone.utc)
        user_doc = {
            "email": data.email,
            "password_hash": get_password_hash(data.password),
            "full_name": data.full_name,
            "role": data.role,
            "phone": data.phone,
            "is_active": True,
            "is_verified": False,
            "verification_token": secrets.token_urlsafe(32),
            "avatar": None,
            "created_at": now,
            "updated_at": now,
        }

        result = await self.collection.insert_one(user_doc)
        user_doc["_id"] = result.inserted_id

        access_token = create_access_token({"sub": str(result.inserted_id), "role": data.role})
        refresh_token = create_refresh_token({"sub": str(result.inserted_id)})

        # Store refresh token hash
        await self.collection.update_one(
            {"_id": result.inserted_id},
            {"$set": {"refresh_token": refresh_token}},
        )

        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            user=serialize_user(user_doc),
        )

    async def login(self, data: UserLogin) -> TokenResponse:
        user = await self.collection.find_one({"email": data.email})
        if not user or not verify_password(data.password, user["password_hash"]):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password",
            )

        if not user.get("is_active", True):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account is disabled. Contact administrator.",
            )

        access_token = create_access_token({"sub": str(user["_id"]), "role": user["role"]})
        refresh_token = create_refresh_token({"sub": str(user["_id"])})

        await self.collection.update_one(
            {"_id": user["_id"]},
            {"$set": {"refresh_token": refresh_token, "last_login": datetime.now(timezone.utc)}},
        )

        # Log activity
        activity_col = get_collection("activity_logs")
        await activity_col.insert_one({
            "user_id": str(user["_id"]),
            "action": "LOGIN",
            "description": f"{user['full_name']} logged in",
            "created_at": datetime.now(timezone.utc),
        })

        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            user=serialize_user(user),
        )

    async def refresh_token(self, refresh_token: str) -> dict:
        payload = verify_token(refresh_token)
        if not payload or payload.get("type") != "refresh":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid refresh token",
            )

        user_id = payload.get("sub")
        user = await self.collection.find_one({"_id": ObjectId(user_id)})
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found",
            )

        new_access_token = create_access_token({"sub": user_id, "role": user["role"]})
        return {"access_token": new_access_token, "token_type": "bearer"}

    async def get_user_by_id(self, user_id: str) -> Optional[dict]:
        return await self.collection.find_one({"_id": ObjectId(user_id)})

    async def update_profile(self, user_id: str, updates: dict) -> dict:
        updates["updated_at"] = datetime.now(timezone.utc)
        await self.collection.update_one(
            {"_id": ObjectId(user_id)}, {"$set": updates}
        )
        return await self.collection.find_one({"_id": ObjectId(user_id)})

    async def change_password(self, user_id: str, current_password: str, new_password: str):
        user = await self.collection.find_one({"_id": ObjectId(user_id)})
        if not verify_password(current_password, user["password_hash"]):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Current password is incorrect",
            )
        await self.collection.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": {"password_hash": get_password_hash(new_password), "updated_at": datetime.now(timezone.utc)}},
        )


auth_service = AuthService()
