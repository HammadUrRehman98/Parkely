from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        # `core/config.py` lives in `Backend/core/`, so `.env` is one directory up.
        env_file=str(Path(__file__).resolve().parents[1] / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "Parkely API"
    api_v1_prefix: str = "/api/v1"
    database_url: str = Field(default="postgresql+psycopg2://parkely_user:1234@localhost:5432/parkely_db")
    jwt_secret_key: str = Field(default="change-me-in-production")
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24
    backend_cors_origins: str = "http://localhost:5173,http://localhost:3000,http://localhost:4173"
    resend_api_key: str | None = None
    resend_from_email: str | None = None
    frontend_app_url: str = "http://localhost:5173"
    email_otp_expire_minutes: int = 10
    email_otp_resend_cooldown_seconds: int = 60
    admin_bootstrap_email: str | None = None
    admin_bootstrap_password: str | None = None
    admin_bootstrap_name: str = "Admin User"
    booking_warning_minutes: int = 30
    booking_overdue_grace_minutes: int = 30
    booking_hold_minutes: int = 10
    booking_scheduler_enabled: bool = True

    def cors_origins(self) -> list[str]:
        raw = [origin.strip() for origin in self.backend_cors_origins.split(",") if origin.strip()]
        if raw == ["*"]:
            return ["*"]
        return raw


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
