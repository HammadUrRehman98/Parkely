from __future__ import annotations

from datetime import datetime, timedelta, timezone
import secrets

from core.security import get_password_hash, verify_password


def generate_reset_token() -> str:
    return secrets.token_urlsafe(32)


def hash_secret_token(token: str) -> str:
    return get_password_hash(token)


def verify_secret_token(token: str, token_hash: str) -> bool:
    return verify_password(token, token_hash)


def reset_token_expires_at(minutes: int) -> datetime:
    return datetime.now(timezone.utc) + timedelta(minutes=minutes)
