from __future__ import annotations

import enum
from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import DateTime, Enum as SQLEnum, Float, ForeignKey, Integer, Numeric, String, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database.base import Base


class SlotStatus(str, enum.Enum):
    available = "available"
    booked = "booked"
    occupied = "occupied"
    hold = "hold"
    unavailable = "unavailable"


class LayoutTemplate(str, enum.Enum):
    two_row = "2-row"
    four_row = "4-row"
    l_shaped = "l-shaped"
    grid = "grid"


class ParkingZone(Base):
    __tablename__ = "parking_zones"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    address: Mapped[str] = mapped_column(String(500), nullable=False)
    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)
    entrance_latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    entrance_longitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    exit_latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    exit_longitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    capacity: Mapped[int] = mapped_column(Integer, nullable=False)
    available_slots: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    price_per_hour: Mapped[float] = mapped_column(Numeric(10, 2), default=0, nullable=False)
    color: Mapped[str] = mapped_column(String(32), default="#3b82f6", nullable=False)
    layout_template: Mapped[LayoutTemplate] = mapped_column(
        SQLEnum(LayoutTemplate, name="layouttemplate"),
        default=LayoutTemplate.grid,
        nullable=False,
    )
    polygon: Mapped[list[list[float]]] = mapped_column(JSONB, default=list, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    slots = relationship("ParkingSlot", back_populates="zone", cascade="all, delete-orphan")
    bookings = relationship("Booking", back_populates="zone")


class ParkingSlot(Base):
    __tablename__ = "parking_slots"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    zone_id: Mapped[UUID] = mapped_column(ForeignKey("parking_zones.id", ondelete="CASCADE"), nullable=False)
    label: Mapped[str] = mapped_column(String(50), nullable=False)
    status: Mapped[SlotStatus] = mapped_column(SQLEnum(SlotStatus, name="slotstatus"), default=SlotStatus.available, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    zone = relationship("ParkingZone", back_populates="slots")
    bookings = relationship("Booking", back_populates="slot")
