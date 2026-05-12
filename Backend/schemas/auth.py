from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field, ConfigDict, field_validator

from models.user import UserRole


class RegisterRequest(BaseModel):
    name: str = Field(min_length=2, max_length=150)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    vehicle_number: str | None = Field(default=None, max_length=50)
    vehicle_type: str | None = Field(default=None, max_length=100)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    role: UserRole = UserRole.user


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    email: EmailStr
    role: UserRole
    is_email_verified: bool
    vehicle_number: str | None = None
    vehicle_type: str | None = None
    avatar: str | None = None


class RegisterResponse(BaseModel):
    message: str
    otp_sent: bool
    otp_expires_at: datetime | None = None
    otp_preview: str | None = None
    user: UserRead


class VerifyEmailOtpRequest(BaseModel):
    email: EmailStr
    otp: str = Field(min_length=6, max_length=6, pattern=r"^\d{6}$")


class ResendEmailOtpRequest(BaseModel):
    email: EmailStr


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    email: EmailStr
    token: str = Field(min_length=16, max_length=200)
    new_password: str = Field(min_length=8, max_length=128)


class ForgotPasswordResponse(BaseModel):
    message: str
    reset_email_sent: bool = True


class ResetPasswordResponse(BaseModel):
    message: str
    user: UserRead


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserRead


class VerifyEmailOtpResponse(AuthResponse):
    message: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
