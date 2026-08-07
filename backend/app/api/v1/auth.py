from fastapi import APIRouter, Depends, HTTPException, status
from app.schemas.auth import (
    UserCreate, UserLogin, TokenResponse, RefreshTokenRequest,
    ForgotPasswordRequest, ResetPasswordRequest, ChangePasswordRequest, UpdateProfileRequest
)
from app.services.auth_service import auth_service, serialize_user
from app.core.dependencies import get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(data: UserCreate):
    """Register a new user account"""
    return await auth_service.register(data)


@router.post("/login", response_model=TokenResponse)
async def login(data: UserLogin):
    """Authenticate and get access tokens"""
    return await auth_service.login(data)


@router.post("/refresh")
async def refresh_token(data: RefreshTokenRequest):
    """Get a new access token using refresh token"""
    return await auth_service.refresh_token(data.refresh_token)


@router.get("/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    """Get current user profile"""
    return serialize_user(current_user)


@router.put("/me")
async def update_profile(
    data: UpdateProfileRequest,
    current_user: dict = Depends(get_current_user),
):
    """Update current user profile"""
    updates = data.model_dump(exclude_none=True)
    updated_user = await auth_service.update_profile(str(current_user["_id"]), updates)
    return serialize_user(updated_user)


@router.post("/change-password")
async def change_password(
    data: ChangePasswordRequest,
    current_user: dict = Depends(get_current_user),
):
    """Change current user password"""
    await auth_service.change_password(
        str(current_user["_id"]),
        data.current_password,
        data.new_password,
    )
    return {"message": "Password changed successfully"}


@router.post("/forgot-password")
async def forgot_password(data: ForgotPasswordRequest):
    """Request password reset link (email-based)"""
    # In production, send email with reset token
    # For demo, return a mock token
    return {"message": "If this email exists, a reset link has been sent"}


@router.post("/verify-email/{token}")
async def verify_email(token: str):
    """Verify email address with token"""
    from app.core.database import get_collection
    users_col = get_collection("users")
    user = await users_col.find_one({"verification_token": token})
    if not user:
        raise HTTPException(status_code=400, detail="Invalid verification token")
    await users_col.update_one(
        {"_id": user["_id"]},
        {"$set": {"is_verified": True, "verification_token": None}},
    )
    return {"message": "Email verified successfully"}
