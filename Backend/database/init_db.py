from __future__ import annotations

from database.base import Base
from database.session import engine
from models import booking, notification, parking, user  # noqa: F401


def init_db() -> None:
    """Create all database tables for local bootstrap or first-run setup."""
    Base.metadata.create_all(bind=engine)


if __name__ == "__main__":
    init_db()
