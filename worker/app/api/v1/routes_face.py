from fastapi import APIRouter, UploadFile, File, Query
from fastapi.concurrency import run_in_threadpool
from typing import List
from app.services.face_service import detect_face
from app.core.logging import logger as log

router = APIRouter()

@router.post("/detect")
async def detect(
    file: UploadFile = File(...), 
    is_static: bool = False,
    modes: List[str] = Query(["face"]),
    timestamp_ms: int = Query(None)
):
    log.info(f"Detect Request: modes={modes}, static={is_static}, ts={timestamp_ms}")
    image_bytes = await file.read()
    
    # Phase 16: Offload CPU-bound task to FastAPI's internal threadpool
    # This prevents the 10s "event loop lag"
    try:
        result = await run_in_threadpool(
            detect_face, 
            image_bytes, 
            is_static=is_static, 
            modes=modes, 
            timestamp_ms=timestamp_ms
        )
        perf = result.get("metadata", {}).get("profiling", {})
        log.info(f"Detect Success: ts={timestamp_ms}, perf={perf}")
        return {"result": result}
    except Exception as e:
        log.error(f"Detect Failed: {str(e)}")
        raise e