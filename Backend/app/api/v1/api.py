from fastapi import APIRouter

from app.api.v1.routes.auth import router as auth_router
from app.api.v1.routes.bookings import router as bookings_router
from app.api.v1.routes.notifications import router as notifications_router
from app.api.v1.routes.parking import router as parking_router
from app.api.v1.routes.ws import router as ws_router

api_router = APIRouter()
api_router.include_router(auth_router, prefix="/auth", tags=["auth"])
api_router.include_router(parking_router, prefix="/parking", tags=["parking"])
api_router.include_router(bookings_router, prefix="/bookings", tags=["bookings"])
api_router.include_router(notifications_router, prefix="/notifications", tags=["notifications"])
api_router.include_router(ws_router, tags=["realtime"])
