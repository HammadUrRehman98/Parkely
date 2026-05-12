from __future__ import annotations

import logging
import threading
import time as time_mod
from datetime import datetime, timedelta, timezone
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.exc import ProgrammingError
from sqlalchemy.orm import selectinload

from core.config import settings
from database.session import SessionLocal
from models.booking import Booking, BookingStatus
from models.notification import Notification, NotificationType
from models.parking import ParkingSlot, SlotStatus
from models.user import User, UserRole
from services.email_service import EmailDeliveryError, send_resend_email

logger = logging.getLogger(__name__)
_disabled_due_to_schema_error = False


def _booking_start_at(booking: Booking) -> datetime:
    return datetime.combine(booking.date, booking.start_time, tzinfo=timezone.utc)


def _booking_end_at(booking: Booking) -> datetime:
    return datetime.combine(booking.date, booking.end_time, tzinfo=timezone.utc)


def _notify_user(db, user_id: UUID, title: str, message: str, type_: NotificationType = NotificationType.alert) -> None:
    db.add(Notification(user_id=user_id, title=title, message=message, type=type_))


def _notify_admins(db, title: str, message: str) -> None:
    admins = db.scalars(select(User).where(User.role == UserRole.admin)).all()
    for admin in admins:
        _notify_user(db, admin.id, title, message, NotificationType.alert)


def _send_email(to_email: str, subject: str, text: str) -> None:
    try:
        html = "<div style=\"font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto;line-height:1.6;white-space:pre-wrap\">" + text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;") + "</div>"
        send_resend_email(subject=subject, html=html, text=text, from_email=settings.resend_from_email, to_email=to_email)
    except EmailDeliveryError as exc:
        logger.warning("Failed to send email to %s: %s", to_email, exc)


def run_booking_scheduler_tick() -> None:
    global _disabled_due_to_schema_error
    if _disabled_due_to_schema_error:
        return

    now = datetime.now(timezone.utc)
    warning_at = now + timedelta(minutes=settings.booking_warning_minutes)

    with SessionLocal() as db:
        try:
            # Load upcoming bookings with related user/zone/slot for messaging.
            upcoming = db.scalars(
                select(Booking)
                .where(Booking.status == BookingStatus.upcoming)
                .options(selectinload(Booking.user), selectinload(Booking.zone), selectinload(Booking.slot))
            ).all()
        except ProgrammingError as exc:
            # Typically happens when the DB schema isn't migrated yet.
            _disabled_due_to_schema_error = True
            logger.error(
                "Booking scheduler disabled due to database schema mismatch (run alembic migrations). Error: %s",
                exc.orig if hasattr(exc, "orig") else exc,
            )
            return

        for booking in upcoming:
            start_at = _booking_start_at(booking)
            end_at = _booking_end_at(booking)
            if end_at <= now:
                continue

            # 30-min pre-warning for user
            if booking.start_warning_sent_at is None and start_at <= warning_at and start_at > now:
                booking.start_warning_sent_at = now
                if booking.user is not None:
                    _notify_user(
                        db,
                        booking.user_id,
                        "Parking starts soon",
                        f"Your parking at {booking.zone.name if booking.zone else 'your zone'} starts in {settings.booking_warning_minutes} minutes.",
                        NotificationType.alert,
                    )
                    _send_email(
                        booking.user.email,
                        "Parkely reminder: parking starts soon",
                        f"Hi {booking.user.name},\n\nYour parking starts at {booking.start_time} today.\n\n- Parkely",
                    )

            # Start-time warning if user hasn't confirmed arrival
            if booking.start_time_warning_sent_at is None and start_at <= now and booking.arrival_confirmed_at is None:
                booking.start_time_warning_sent_at = now
                zone_name = booking.zone.name if booking.zone else "your zone"
                slot_label = booking.slot.label if booking.slot else "your slot"
                _notify_user(db, booking.user_id, "Parking time started", f"Your booking for {zone_name} ({slot_label}) has started.", NotificationType.alert)
                _notify_admins(db, "Booking started (awaiting arrival)", f"Booking {booking.id} started for {zone_name} ({slot_label}) but arrival not confirmed.")

            # Overdue -> hold transition after grace period
            overdue_at = start_at + timedelta(minutes=settings.booking_overdue_grace_minutes)
            if booking.no_show_processed_at is None and overdue_at <= now and booking.arrival_confirmed_at is None:
                slot = booking.slot
                if slot is not None and slot.status == SlotStatus.booked:
                    slot.status = SlotStatus.hold
                    booking.hold_until = now + timedelta(minutes=settings.booking_hold_minutes)
                    booking.no_show_processed_at = now
                    zone_name = booking.zone.name if booking.zone else "your zone"
                    slot_label = booking.slot.label if booking.slot else "your slot"
                    _notify_user(
                        db,
                        booking.user_id,
                        "Slot on hold",
                        f"You didn't confirm arrival. Your slot {slot_label} is on hold for {settings.booking_hold_minutes} minutes. You can claim it without extra payment.",
                        NotificationType.alert,
                    )
                    if booking.user is not None:
                        _send_email(
                            booking.user.email,
                            "Parkely alert: slot on hold",
                            f"Hi {booking.user.name},\n\nYour booking started but arrival wasn't confirmed. Your slot is on hold for {settings.booking_hold_minutes} minutes. Open the app to claim it.\n\n- Parkely",
                        )
                    _notify_admins(db, "Slot moved to hold", f"Booking {booking.id} moved to hold (no arrival confirmed).")

            # Release expired holds
            if booking.hold_until is not None and booking.hold_until <= now and booking.arrival_confirmed_at is None:
                slot = booking.slot
                if slot is not None and slot.status == SlotStatus.hold:
                    slot.status = SlotStatus.available
                    booking.status = BookingStatus.cancelled
                    booking.hold_until = None
                    zone_name = booking.zone.name if booking.zone else "your zone"
                    slot_label = booking.slot.label if booking.slot else "your slot"
                    _notify_user(
                        db,
                        booking.user_id,
                        "Booking released",
                        f"Hold expired and your slot {slot_label} at {zone_name} was released.",
                        NotificationType.alert,
                    )
                    _notify_admins(db, "Hold expired", f"Released slot for booking {booking.id} after hold expired.")

        db.commit()


class BookingScheduler:
    def __init__(self, interval_seconds: int = 30) -> None:
        self._interval_seconds = interval_seconds
        self._thread: threading.Thread | None = None
        self._stop = threading.Event()

    def start(self) -> None:
        if self._thread and self._thread.is_alive():
            return

        def _run() -> None:
            while not self._stop.is_set():
                try:
                    run_booking_scheduler_tick()
                except Exception:  # pragma: no cover - guardrail for background loop
                    logger.exception("Booking scheduler tick failed")
                self._stop.wait(self._interval_seconds)

        self._thread = threading.Thread(target=_run, name="booking-scheduler", daemon=True)
        self._thread.start()

    def stop(self) -> None:
        self._stop.set()
