from __future__ import annotations

from app.db.base import Base
from app.db.session import engine
from app.models import booking, notification, parking, user  # noqa: F401


def init_db() -> None:
    """Create all database tables for local bootstrap or first-run setup."""
    Base.metadata.create_all(bind=engine)


if __name__ == "__main__":
    init_db()
