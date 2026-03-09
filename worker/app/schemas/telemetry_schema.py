from pydantic import BaseModel
from typing import Dict

class TelemetrySchema(BaseModel):
    fps: float
    cpu_usage: float
    gpu_usage: Optional[float]
    active_tracks: int
    worker_latency_ms: Dict[str, float]
