from fastapi import APIRouter
from app.services.perception_service import perception_service

router = APIRouter()

@router.get("/")
async def get_telemetry():
    return perception_service.get_telemetry()

