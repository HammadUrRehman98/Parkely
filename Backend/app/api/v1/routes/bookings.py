from __future__ import annotations

import math
from datetime import datetime, time, timezone
from decimal import Decimal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import and_, func, or_, select
from sqlalchemy.orm import Session, selectinload

from app.core.deps import get_current_user, require_roles
from app.core.realtime import broadcast_event
from app.db.session import get_db
from app.models.booking import Booking, BookingStatus
from app.models.notification import Notification, NotificationType
from app.models.parking import ParkingSlot, ParkingZone, SlotStatus
from app.models.user import User, UserRole
from app.schemas.booking import BookingCreate, BookingRead, BookingUpdateStatus

router = APIRouter()


def _serialize_booking(booking: Booking) -> BookingRead:
    data = BookingRead.model_validate(booking, from_attributes=True).model_dump()
    zone = booking.zone
    slot = booking.slot
    data["zone_name"] = zone.name if zone is not None else None
    data["slot_label"] = slot.label if slot is not None else None
    return BookingRead.model_validate(data)


def _booking_duration(start_time: time, end_time: time) -> int:
    start_minutes = start_time.hour * 60 + start_time.minute
    end_minutes = end_time.hour * 60 + end_time.minute
    duration = end_minutes - start_minutes
    if duration <= 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="End time must be after start time")
    return max(1, math.ceil(duration / 60))


def _has_overlapping_booking(db: Session, slot_id: UUID, booking_date, start_time: time, end_time: time) -> bool:
    existing = db.scalar(
        select(Booking).where(
            Booking.slot_id == slot_id,
            Booking.date == booking_date,
            Booking.status.in_([BookingStatus.active, BookingStatus.upcoming]),
            Booking.start_time < end_time,
            Booking.end_time > start_time,
        )
    )
    return existing is not None


def _recalculate_zone_availability(db: Session, zone_id: UUID) -> int:
    available = db.scalar(
        select(func.count(ParkingSlot.id)).where(ParkingSlot.zone_id == zone_id, ParkingSlot.status == SlotStatus.available)
    )
    return int(available or 0)


@router.get("/mine", response_model=list[BookingRead])
def my_bookings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[BookingRead]:
    bookings = db.scalars(
        select(Booking)
        .where(Booking.user_id == current_user.id)
        .options(selectinload(Booking.zone), selectinload(Booking.slot))
        .order_by(Booking.created_at.desc())
    ).all()
    return [_serialize_booking(booking) for booking in bookings]


@router.get("", response_model=list[BookingRead])
def list_bookings(
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.admin)),
) -> list[BookingRead]:
    bookings = db.scalars(select(Booking).options(selectinload(Booking.zone), selectinload(Booking.slot)).order_by(Booking.created_at.desc())).all()
    return [_serialize_booking(booking) for booking in bookings]


@router.post("/reserve", response_model=BookingRead, status_code=status.HTTP_201_CREATED)
async def reserve_booking(
    payload: BookingCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> BookingRead:
    zone = db.scalar(select(ParkingZone).where(ParkingZone.id == payload.zone_id))
    if zone is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Parking zone not found")

    slot = db.scalar(
        select(ParkingSlot).where(ParkingSlot.id == payload.slot_id, ParkingSlot.zone_id == payload.zone_id).with_for_update()
    )
    if slot is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Parking slot not found")
    if slot.status != SlotStatus.available:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Selected slot is not available")

    if _has_overlapping_booking(db, slot.id, payload.date, payload.start_time, payload.end_time):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This slot is already booked for the selected time")

    duration = _booking_duration(payload.start_time, payload.end_time)
    total_cost = Decimal(zone.price_per_hour) * Decimal(duration)

    booking = Booking(
        user_id=current_user.id,
        zone_id=zone.id,
        slot_id=slot.id,
        date=payload.date,
        start_time=payload.start_time,
        end_time=payload.end_time,
        duration=duration,
        total_cost=total_cost,
        status=BookingStatus.upcoming,
        vehicle_number=payload.vehicle_number,
    )
    slot.status = SlotStatus.booked
    zone.available_slots = _recalculate_zone_availability(db, zone.id)

    db.add(booking)
    db.add(slot)
    db.add(zone)
    notification = Notification(
        user_id=current_user.id,
        title="Parking slot reserved",
        message=f"Your slot {slot.label} in {zone.name} has been reserved.",
        type=NotificationType.booking,
    )
    db.add(notification)
    db.commit()
    db.refresh(booking)

    await broadcast_event(
        "booking.reserved",
        {"booking_id": str(booking.id), "zone_id": str(zone.id), "slot_id": str(slot.id), "user_id": str(current_user.id)},
    )
    return _serialize_booking(booking)


@router.post("/{booking_id}/confirm", response_model=BookingRead)
async def confirm_booking(
    booking_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> BookingRead:
    booking = db.scalar(select(Booking).where(Booking.id == booking_id))
    if booking is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found")
    if booking.user_id != current_user.id and current_user.role != UserRole.admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed")

    booking.status = BookingStatus.active
    slot = db.scalar(select(ParkingSlot).where(ParkingSlot.id == booking.slot_id))
    if slot is not None:
        slot.status = SlotStatus.booked
        db.add(slot)
    db.add(booking)
    db.commit()
    db.refresh(booking)

    await broadcast_event("booking.confirmed", {"booking_id": str(booking.id), "status": booking.status.value})
    return _serialize_booking(booking)


@router.post("/{booking_id}/cancel", response_model=BookingRead)
async def cancel_booking(
    booking_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> BookingRead:
    booking = db.scalar(select(Booking).where(Booking.id == booking_id))
    if booking is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found")
    if booking.user_id != current_user.id and current_user.role != UserRole.admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed")

    booking.status = BookingStatus.cancelled
    slot = db.scalar(select(ParkingSlot).where(ParkingSlot.id == booking.slot_id))
    zone = db.scalar(select(ParkingZone).where(ParkingZone.id == booking.zone_id))
    if slot is not None:
        slot.status = SlotStatus.available
        db.add(slot)
    if zone is not None:
        zone.available_slots = _recalculate_zone_availability(db, zone.id)
        db.add(zone)
    db.add(booking)
    db.commit()
    db.refresh(booking)

    await broadcast_event("booking.cancelled", {"booking_id": str(booking.id), "status": booking.status.value})
    return _serialize_booking(booking)


@router.patch("/{booking_id}/status", response_model=BookingRead)
async def update_booking_status(
    booking_id: UUID,
    payload: BookingUpdateStatus,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.admin)),
) -> BookingRead:
    booking = db.scalar(select(Booking).where(Booking.id == booking_id))
    if booking is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found")

    booking.status = payload.status
    db.add(booking)
    db.commit()
    db.refresh(booking)
    await broadcast_event("booking.updated", {"booking_id": str(booking.id), "status": booking.status.value})
    return _serialize_booking(booking)
