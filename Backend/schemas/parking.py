from __future__ import annotations

from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field, ConfigDict

from models.parking import LayoutTemplate, SlotStatus


class CoordinatePoint(BaseModel):
    lat: float
    lng: float


class ParkingZoneBase(BaseModel):
    name: str = Field(min_length=2, max_length=200)
    address: str = Field(min_length=2, max_length=500)
    latitude: float
    longitude: float
    entrance_latitude: float | None = None
    entrance_longitude: float | None = None
    exit_latitude: float | None = None
    exit_longitude: float | None = None
    capacity: int = Field(gt=0, le=10000)
    price_per_hour: Decimal = Field(gt=0)
    color: str = Field(default="#3b82f6", max_length=32)
    layout_template: LayoutTemplate = LayoutTemplate.grid
    polygon: list[CoordinatePoint]


class ParkingZoneCreate(ParkingZoneBase):
    slot_prefix: str = Field(default="A", min_length=1, max_length=5)


class ParkingZoneUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=200)
    address: str | None = Field(default=None, min_length=2, max_length=500)
    latitude: float | None = None
    longitude: float | None = None
    entrance_latitude: float | None = None
    entrance_longitude: float | None = None
    exit_latitude: float | None = None
    exit_longitude: float | None = None
    capacity: int | None = Field(default=None, gt=0, le=10000)
    price_per_hour: Decimal | None = Field(default=None, gt=0)
    color: str | None = Field(default=None, max_length=32)
    layout_template: LayoutTemplate | None = None
    polygon: list[CoordinatePoint] | None = None


class ParkingSlotRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    zone_id: UUID
    label: str
    status: SlotStatus


class ParkingZoneRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    address: str
    latitude: float
    longitude: float
    entrance_latitude: float | None = None
    entrance_longitude: float | None = None
    exit_latitude: float | None = None
    exit_longitude: float | None = None
    capacity: int
    available_slots: int
    price_per_hour: Decimal
    color: str
    layout_template: LayoutTemplate
    polygon: list[CoordinatePoint]


class ParkingZoneDetail(ParkingZoneRead):
    slots: list[ParkingSlotRead]


class SlotStatusUpdate(BaseModel):
    status: SlotStatus
