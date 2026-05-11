from __future__ import annotations

from datetime import datetime, timedelta, timezone
import secrets

from app.core.config import settings
from app.core.security import get_password_hash, verify_password


def generate_email_otp(length: int = 6) -> str:
    upper_bound = 10**length
    return f"{secrets.randbelow(upper_bound):0{length}d}"


def hash_otp(otp: str) -> str:
    return get_password_hash(otp)


def verify_otp(plain_otp: str, otp_hash: str) -> bool:
    return verify_password(plain_otp, otp_hash)


def otp_expires_at() -> datetime:
    return datetime.now(timezone.utc) + timedelta(minutes=settings.email_otp_expire_minutes)


def otp_cooldown_until(sent_at: datetime) -> datetime:
    return sent_at + timedelta(seconds=settings.email_otp_resend_cooldown_seconds)
