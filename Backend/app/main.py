from __future__ import annotations

import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.api import api_router
from app.core.config import settings
from app.core.logging import configure_logging
from app.db.session import SessionLocal
from app.models.user import User, UserRole
from app.core.security import get_password_hash
from sqlalchemy import select

logger = logging.getLogger(__name__)


def seed_admin_user() -> None:
    if not settings.admin_bootstrap_email or not settings.admin_bootstrap_password:
        return

    try:
        with SessionLocal() as db:
            existing = db.scalar(select(User).where(User.email == settings.admin_bootstrap_email.lower()))
            if existing is not None:
                return

        admin_user = User(
            name=settings.admin_bootstrap_name,
            email=settings.admin_bootstrap_email.lower(),
            password_hash=get_password_hash(settings.admin_bootstrap_password),
            role=UserRole.admin,
            is_email_verified=True,
        )
        db.add(admin_user)
        db.commit()
        logger.info("Seeded bootstrap admin user: %s", settings.admin_bootstrap_email)
    except Exception as exc:  # pragma: no cover - startup safety
        logger.warning("Skipped admin bootstrap because database is unavailable or not migrated: %s", exc)


def create_app() -> FastAPI:
    configure_logging()
    app = FastAPI(title=settings.app_name)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins(),
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(api_router, prefix=settings.api_v1_prefix)

    @app.on_event("startup")
    def on_startup() -> None:
        seed_admin_user()

    @app.get("/health", tags=["system"])
    def health() -> dict[str, str]:
        return {"status": "ok"}

    return app


app = create_app()
