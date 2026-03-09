from pydantic import BaseModel
from typing import List, Optional, Dict

class FaceDetectionSchema(BaseModel):
    track_id: str
    bbox: Dict[str, float]
    confidence: float
    age: Optional[int]
    gender: Optional[str]
    dominant_emotion: Optional[str]

class DetectionResponseSchema(BaseModel):
    success: bool
    faces: List[FaceDetectionSchema]
    metadata: Dict[str, Any]
