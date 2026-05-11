"""password reset and parking enhancements

Revision ID: 0003_password_reset_and_performance
Revises: 0002_email_verification
Create Date: 2026-05-10
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op


revision = "0003_password_reset_and_performance"
down_revision = "0002_email_verification"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("password_reset_token_hash", sa.String(length=255), nullable=True))
    op.add_column("users", sa.Column("password_reset_expires_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("users", sa.Column("password_reset_sent_at", sa.DateTime(timezone=True), nullable=True))

    op.create_index("ix_bookings_user_date", "bookings", ["user_id", "date"], unique=False)
    op.create_index("ix_bookings_slot_date", "bookings", ["slot_id", "date"], unique=False)
    op.create_index("ix_parking_zones_name", "parking_zones", ["name"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_parking_zones_name", table_name="parking_zones")
    op.drop_index("ix_bookings_slot_date", table_name="bookings")
    op.drop_index("ix_bookings_user_date", table_name="bookings")

    op.drop_column("users", "password_reset_sent_at")
    op.drop_column("users", "password_reset_expires_at")
    op.drop_column("users", "password_reset_token_hash")
