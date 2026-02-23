from fastapi import APIRouter, UploadFile, File
from app.services.face_detection_service import detect_face

router = APIRouter()

@router.post("/detect")
async def detect(file: UploadFile = File(...), is_static: bool = False):
    image_bytes = await file.read()
    result = detect_face(image_bytes, is_static=is_static)
    return {"result": result}