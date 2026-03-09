from fastapi import APIRouter
from app.api.v1.routes_face import router as face_router
from app.api.v1.routes_stream import router as stream_router
from app.api.v1.routes_telemetry import router as telemetry_router

# Phase 27: Centralized API v1 Router
router = APIRouter()

router.include_router(face_router, prefix="/face", tags=["Detection"])
router.include_router(stream_router, prefix="/stream", tags=["Streaming"])
router.include_router(telemetry_router, prefix="/telemetry", tags=["System"])
