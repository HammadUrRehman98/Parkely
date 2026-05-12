from fastapi import APIRouter

from routers.auth import router as auth_router
from routers.bookings import router as bookings_router
from routers.notifications import router as notifications_router
from routers.parking import router as parking_router
from routers.ws import router as ws_router

api_router = APIRouter()
api_router.include_router(auth_router, prefix="/auth", tags=["auth"])
api_router.include_router(parking_router, prefix="/parking", tags=["parking"])
api_router.include_router(bookings_router, prefix="/bookings", tags=["bookings"])
api_router.include_router(notifications_router, prefix="/notifications", tags=["notifications"])
api_router.include_router(ws_router, tags=["realtime"])
