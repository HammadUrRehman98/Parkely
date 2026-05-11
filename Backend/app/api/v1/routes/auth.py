from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, require_roles
from app.core.security import create_access_token, get_password_hash, verify_password
from app.core.config import settings
from app.db.session import get_db
from app.models.user import User, UserRole
from app.schemas.auth import (
    AuthResponse,
    ForgotPasswordRequest,
    ForgotPasswordResponse,
    LoginRequest,
    RegisterRequest,
    RegisterResponse,
    ResetPasswordRequest,
    ResetPasswordResponse,
    ResendEmailOtpRequest,
    UserRead,
    VerifyEmailOtpRequest,
    VerifyEmailOtpResponse,
)
from app.services.email_service import (
    build_email_otp_html,
    build_email_otp_text,
    build_password_reset_email_html,
    build_password_reset_email_text,
    send_resend_email,
)
from app.services.otp_service import generate_email_otp, hash_otp, otp_cooldown_until, otp_expires_at, verify_otp
from app.services.token_service import generate_reset_token, hash_secret_token, reset_token_expires_at, verify_secret_token

router = APIRouter()


def _serialize_user(user: User) -> UserRead:
    return UserRead.model_validate(user, from_attributes=True)


def _issue_otp_for_user(user: User, db: Session) -> tuple[str, datetime]:
    otp = generate_email_otp()
    expires_at = otp_expires_at()
    now = datetime.now(timezone.utc)

    user.email_otp_hash = hash_otp(otp)
    user.email_otp_expires_at = expires_at
    user.email_otp_sent_at = now
    db.add(user)
    db.commit()
    db.refresh(user)
    return otp, expires_at


def _send_otp_email(user: User, otp: str) -> bool:
    subject = "Verify your Parkely account"
    html = build_email_otp_html(user.name, otp)
    text = build_email_otp_text(user.name, otp)
    send_resend_email(user.email, subject, html, text)
    return True


def _send_password_reset_email(user: User, token: str) -> None:
    reset_url = f"{settings.frontend_app_url.rstrip('/')}/reset-password?email={user.email}&token={token}"
    subject = "Reset your Parkely password"
    html = build_password_reset_email_html(user.name, reset_url)
    text = build_password_reset_email_text(user.name, reset_url)
    send_resend_email(user.email, subject, html, text)


@router.post("/register", response_model=RegisterResponse, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, db: Session = Depends(get_db)) -> RegisterResponse:
    email = payload.email.lower().strip()
    existing_user = db.scalar(select(User).where(User.email == email))
    if existing_user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email is already registered")

    user = User(
        name=payload.name.strip(),
        email=email,
        password_hash=get_password_hash(payload.password),
        role=UserRole.user,
        is_email_verified=False,
        vehicle_number=payload.vehicle_number.strip() if payload.vehicle_number else None,
        vehicle_type=payload.vehicle_type.strip() if payload.vehicle_type else None,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    otp, expires_at = _issue_otp_for_user(user, db)
    otp_sent = True
    try:
        _send_otp_email(user, otp)
    except RuntimeError:
        otp_sent = False

    return RegisterResponse(
        message="Account created. Please verify your email using the OTP sent to you.",
        otp_sent=otp_sent,
        otp_expires_at=expires_at,
        user=_serialize_user(user),
    )


@router.post("/verify-email-otp", response_model=VerifyEmailOtpResponse)
def verify_email_otp(payload: VerifyEmailOtpRequest, db: Session = Depends(get_db)) -> VerifyEmailOtpResponse:
    email = payload.email.lower().strip()
    user = db.scalar(select(User).where(User.email == email))
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No account found for this email")

    if user.is_email_verified:
        token = create_access_token(subject=str(user.id), role=user.role.value)
        return VerifyEmailOtpResponse(
            message="Email is already verified.",
            access_token=token,
            token_type="bearer",
            user=_serialize_user(user),
        )

    if user.email_otp_hash is None or user.email_otp_expires_at is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Verification code is missing. Please request a new one.")

    now = datetime.now(timezone.utc)
    if user.email_otp_expires_at < now:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Verification code has expired. Please request a new one.")

    if not verify_otp(payload.otp, user.email_otp_hash):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid verification code")

    user.is_email_verified = True
    user.email_otp_hash = None
    user.email_otp_expires_at = None
    user.email_otp_sent_at = None
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token(subject=str(user.id), role=user.role.value)
    return VerifyEmailOtpResponse(
        message="Email verified successfully.",
        access_token=token,
        token_type="bearer",
        user=_serialize_user(user),
    )


@router.post("/resend-email-otp", status_code=status.HTTP_200_OK)
def resend_email_otp(payload: ResendEmailOtpRequest, db: Session = Depends(get_db)) -> dict[str, object]:
    email = payload.email.lower().strip()
    user = db.scalar(select(User).where(User.email == email))
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No account found for this email")

    if user.is_email_verified:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email is already verified")

    now = datetime.now(timezone.utc)
    if user.email_otp_sent_at is not None:
        cooldown_until = otp_cooldown_until(user.email_otp_sent_at)
        if cooldown_until > now:
            wait_seconds = int((cooldown_until - now).total_seconds())
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Please wait {wait_seconds} seconds before requesting another code",
            )

    otp, expires_at = _issue_otp_for_user(user, db)
    try:
        _send_otp_email(user, otp)
    except RuntimeError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Verification email could not be sent. Please try again later.",
        ) from exc

    return {
        "message": "A new verification code has been sent.",
        "otp_expires_at": expires_at,
        "email": user.email,
    }


@router.post("/forgot-password", response_model=ForgotPasswordResponse)
def forgot_password(payload: ForgotPasswordRequest, db: Session = Depends(get_db)) -> ForgotPasswordResponse:
    email = payload.email.lower().strip()
    user = db.scalar(select(User).where(User.email == email))
    if user is None:
        return ForgotPasswordResponse(message="If an account exists for that email, a reset link has been sent.")

    token = generate_reset_token()
    token_hash = hash_secret_token(token)
    expires_at = reset_token_expires_at(30)
    user.password_reset_token_hash = token_hash
    user.password_reset_expires_at = expires_at
    user.password_reset_sent_at = datetime.now(timezone.utc)
    db.add(user)
    db.commit()
    db.refresh(user)

    try:
        _send_password_reset_email(user, token)
    except RuntimeError:
        return ForgotPasswordResponse(message="If an account exists for that email, a reset link has been sent.")

    return ForgotPasswordResponse(message="If an account exists for that email, a reset link has been sent.")


@router.post("/reset-password", response_model=ResetPasswordResponse)
def reset_password(payload: ResetPasswordRequest, db: Session = Depends(get_db)) -> ResetPasswordResponse:
    email = payload.email.lower().strip()
    user = db.scalar(select(User).where(User.email == email))
    if user is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid password reset request")

    if not user.password_reset_token_hash or not user.password_reset_expires_at:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Password reset token is missing or expired")

    now = datetime.now(timezone.utc)
    if user.password_reset_expires_at < now:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Password reset token has expired")

    if not verify_secret_token(payload.token, user.password_reset_token_hash):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid password reset token")

    user.password_hash = get_password_hash(payload.new_password)
    user.password_reset_token_hash = None
    user.password_reset_expires_at = None
    user.password_reset_sent_at = None
    db.add(user)
    db.commit()
    db.refresh(user)

    return ResetPasswordResponse(message="Password reset successfully.", user=_serialize_user(user))


@router.post("/login", response_model=AuthResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> AuthResponse:
    email = payload.email.lower().strip()
    user = db.scalar(select(User).where(User.email == email))
    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")

    if user.role.value != payload.role.value:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have access to this account role")

    if not user.is_email_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "code": "EMAIL_NOT_VERIFIED",
                "message": "Email is not verified. Please enter the OTP sent to your email.",
                "email": user.email,
            },
        )

    token = create_access_token(subject=str(user.id), role=user.role.value)
    return AuthResponse(access_token=token, token_type="bearer", user=_serialize_user(user))


@router.get("/me", response_model=UserRead)
def me(current_user: User = Depends(get_current_user)) -> UserRead:
    return _serialize_user(current_user)


@router.get("/admin-check", response_model=dict)
def admin_check(current_user: User = Depends(require_roles(UserRole.admin))) -> dict:
    return {"message": f"Hello, {current_user.name}. You are authorized as admin."}
