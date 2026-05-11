from __future__ import annotations

from datetime import date, time, datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field, ConfigDict

from app.models.booking import BookingStatus
from app.models.parking import SlotStatus


class BookingCreate(BaseModel):
    zone_id: UUID
    slot_id: UUID
    date: date
    start_time: time
    end_time: time
    vehicle_number: str = Field(min_length=2, max_length=50)


class BookingRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID
    zone_id: UUID
    zone_name: str | None = None
    slot_id: UUID
    slot_label: str | None = None
    date: date
    start_time: time
    end_time: time
    duration: int
    total_cost: Decimal
    status: BookingStatus
    vehicle_number: str
    created_at: datetime


class BookingUpdateStatus(BaseModel):
    status: BookingStatus
