from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.core.deps import get_current_user, require_roles
from app.core.realtime import broadcast_event
from app.db.session import get_db
from app.models.notification import Notification, NotificationType
from app.models.parking import ParkingSlot, ParkingZone, SlotStatus
from app.models.user import User, UserRole
from app.schemas.parking import (
    ParkingSlotRead,
    ParkingZoneCreate,
    ParkingZoneDetail,
    ParkingZoneRead,
    ParkingZoneUpdate,
    SlotStatusUpdate,
)

router = APIRouter()


def _slot_label(prefix: str, index: int) -> str:
    return f"{prefix.upper()}{index}"


def _serialize_zone(zone: ParkingZone) -> ParkingZoneRead:
    return ParkingZoneRead.model_validate(zone, from_attributes=True)


def _serialize_zone_detail(zone: ParkingZone) -> ParkingZoneDetail:
    return ParkingZoneDetail.model_validate(zone, from_attributes=True)


def _serialize_slot(slot: ParkingSlot) -> ParkingSlotRead:
    return ParkingSlotRead.model_validate(slot, from_attributes=True)


def _recalculate_zone_availability(db: Session, zone_id: str) -> int:
    available = db.scalar(
        select(func.count(ParkingSlot.id)).where(
            ParkingSlot.zone_id == zone_id,
            ParkingSlot.status == SlotStatus.available,
        )
    )
    return int(available or 0)


@router.get("/zones", response_model=list[ParkingZoneDetail])
def list_zones(
    query: str | None = Query(default=None),
    only_available: bool = Query(default=False),
    db: Session = Depends(get_db),
) -> list[ParkingZoneDetail]:
    stmt = select(ParkingZone).options(selectinload(ParkingZone.slots))
    if query:
        like = f"%{query.strip()}%"
        stmt = stmt.where(ParkingZone.name.ilike(like) | ParkingZone.address.ilike(like))
    zones = db.scalars(stmt.order_by(ParkingZone.name.asc())).all()
    if only_available:
        zones = [zone for zone in zones if zone.available_slots > 0]
    return [_serialize_zone_detail(zone) for zone in zones]


@router.get("/zones/{zone_id}", response_model=ParkingZoneDetail)
def get_zone(zone_id: str, db: Session = Depends(get_db)) -> ParkingZoneDetail:
    zone = db.scalar(
        select(ParkingZone).where(ParkingZone.id == zone_id).options(selectinload(ParkingZone.slots))
    )
    if zone is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Parking zone not found")
    return _serialize_zone_detail(zone)


@router.get("/zones/{zone_id}/slots", response_model=list[ParkingSlotRead])
def get_zone_slots(zone_id: str, db: Session = Depends(get_db)) -> list[ParkingSlotRead]:
    slots = db.scalars(select(ParkingSlot).where(ParkingSlot.zone_id == zone_id).order_by(ParkingSlot.label.asc())).all()
    return [_serialize_slot(slot) for slot in slots]


@router.post("/zones", response_model=ParkingZoneDetail, status_code=status.HTTP_201_CREATED)
async def create_zone(
    payload: ParkingZoneCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.admin)),
) -> ParkingZoneDetail:
    if len(payload.polygon) < 3:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Polygon must contain at least 3 points")

    zone = ParkingZone(
        name=payload.name.strip(),
        address=payload.address.strip(),
        latitude=payload.latitude,
        longitude=payload.longitude,
        capacity=payload.capacity,
        available_slots=payload.capacity,
        price_per_hour=payload.price_per_hour,
        color=payload.color,
        layout_template=payload.layout_template,
        polygon=[{"lat": point.lat, "lng": point.lng} for point in payload.polygon],
    )
    db.add(zone)
    db.flush()

    slots: list[ParkingSlot] = []
    for index in range(1, payload.capacity + 1):
        slots.append(ParkingSlot(zone_id=zone.id, label=_slot_label(payload.slot_prefix, index), status=SlotStatus.available))
    db.add_all(slots)
    db.commit()
    db.refresh(zone)

    await broadcast_event(
        "parking.zone.created",
        {"zone_id": str(zone.id), "name": zone.name, "available_slots": zone.available_slots},
    )
    return _serialize_zone_detail(zone)


@router.patch("/zones/{zone_id}", response_model=ParkingZoneDetail)
async def update_zone(
    zone_id: str,
    payload: ParkingZoneUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.admin)),
) -> ParkingZoneDetail:
    zone = db.scalar(select(ParkingZone).where(ParkingZone.id == zone_id).options(selectinload(ParkingZone.slots)))
    if zone is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Parking zone not found")

    if payload.name is not None:
        zone.name = payload.name.strip()
    if payload.address is not None:
        zone.address = payload.address.strip()
    if payload.latitude is not None:
        zone.latitude = payload.latitude
    if payload.longitude is not None:
        zone.longitude = payload.longitude
    if payload.price_per_hour is not None:
        zone.price_per_hour = payload.price_per_hour
    if payload.color is not None:
        zone.color = payload.color
    if payload.layout_template is not None:
        zone.layout_template = payload.layout_template
    if payload.polygon is not None:
        if len(payload.polygon) < 3:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Polygon must contain at least 3 points")
        zone.polygon = [{"lat": point.lat, "lng": point.lng} for point in payload.polygon]

    if payload.capacity is not None:
        current_slots = len(zone.slots)
        if payload.capacity < current_slots:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Capacity cannot be smaller than the number of existing slots",
            )
        zone.capacity = payload.capacity
        if payload.capacity > current_slots:
            next_index = current_slots + 1
            prefix = zone.slots[0].label.rstrip("0123456789") if zone.slots else "A"
            for index in range(next_index, payload.capacity + 1):
                db.add(ParkingSlot(zone_id=zone.id, label=_slot_label(prefix, index), status=SlotStatus.available))

    zone.available_slots = _recalculate_zone_availability(db, zone.id)
    db.add(zone)
    db.commit()
    db.refresh(zone)

    await broadcast_event(
        "parking.zone.updated",
        {"zone_id": str(zone.id), "name": zone.name, "available_slots": zone.available_slots},
    )
    return _serialize_zone_detail(zone)


@router.delete("/zones/{zone_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_zone(
    zone_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.admin)),
) -> None:
    zone = db.scalar(select(ParkingZone).where(ParkingZone.id == zone_id))
    if zone is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Parking zone not found")
    db.delete(zone)
    db.commit()
    await broadcast_event("parking.zone.deleted", {"zone_id": zone_id})


@router.patch("/slots/{slot_id}", response_model=ParkingSlotRead)
async def update_slot_status(
    slot_id: str,
    payload: SlotStatusUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.admin)),
) -> ParkingSlotRead:
    slot = db.scalar(select(ParkingSlot).where(ParkingSlot.id == slot_id))
    if slot is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Parking slot not found")

    slot.status = payload.status
    zone = db.scalar(select(ParkingZone).where(ParkingZone.id == slot.zone_id))
    if zone is not None:
        zone.available_slots = _recalculate_zone_availability(db, zone.id)
        db.add(zone)
    db.add(slot)
    db.commit()
    db.refresh(slot)

    await broadcast_event(
        "parking.slot.updated",
        {"slot_id": str(slot.id), "zone_id": str(slot.zone_id), "status": slot.status.value},
    )
    return _serialize_slot(slot)
