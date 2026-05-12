from __future__ import annotations

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from jose import JWTError
from sqlalchemy import select

from core.config import settings
from core.realtime import manager
from core.security import decode_access_token
from database.session import SessionLocal
from models.user import User

router = APIRouter()


@router.websocket("/ws/updates")
async def websocket_updates(websocket: WebSocket) -> None:
    token = websocket.query_params.get("token")
    if token:
        try:
            token_data = decode_access_token(token)
            if token_data.subject is None:
                await websocket.close(code=1008)
                return
            with SessionLocal() as db:
                user = db.scalar(select(User).where(User.id == token_data.subject))
                if user is None or not user.is_email_verified:
                    await websocket.close(code=1008)
                    return
        except JWTError:
            await websocket.close(code=1008)
            return

    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
