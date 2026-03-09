import asyncio
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.services.perception_service import perception_service
from app.core.logging import logger as log

router = APIRouter()

@router.websocket("/ws/perceive")
async def websocket_perceive(websocket: WebSocket):
    log.info(f"WebSocket handshake request: {websocket.url.path} from {websocket.client}")
    # log.info(f"Headers: {websocket.headers}")
    await websocket.accept()
    log.info("WebSocket connection accepted.")
    
    # Task to send aggregated state continuously (30fps)
    async def send_state():
        try:
            while True:
                state = perception_service.get_full_state()
                if state:
                    await websocket.send_json(state)
                await asyncio.sleep(0.033) # ~30fps broadcast rate
        except WebSocketDisconnect:
            pass
        except Exception as e:
            log.error(f"State sender error: {e}")

    sender_task = asyncio.create_task(send_state())

    frame_count = 0
    try:
        while True:
            # Receive frame blob
            data = await websocket.receive_bytes()
            frame_count += 1
            
            if frame_count % 30 == 0:
                log.info(f"Received frame {frame_count}, size: {len(data)} bytes")
            
            # Phase 8: Push frame to perception engine
            perception_service.ingest_frame(data, is_static=False, modes=["full"])
            
    except WebSocketDisconnect:
        log.info("WebSocket disconnected from /ws/perceive")
    finally:
        sender_task.cancel()
