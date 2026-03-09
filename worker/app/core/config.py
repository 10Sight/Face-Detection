import os
from pathlib import Path

class Config:
    """Centralized configuration for the Worker."""
    
    # Base paths
    BASE_DIR = Path(__file__).resolve().parent.parent.parent
    MODELS_DIR = BASE_DIR / "models"
    
    # Model Folders
    FACE_MODELS = MODELS_DIR / "face"
    MESH_MODELS = MODELS_DIR / "mesh"
    POSE_MODELS = MODELS_DIR / "pose"
    OBJECT_MODELS = MODELS_DIR / "object"
    REID_MODELS = MODELS_DIR / "reid"
    
    # Model Paths
    AGE_PROTO = FACE_MODELS / "deploy_age.prototxt"
    AGE_MODEL = FACE_MODELS / "age_net.caffemodel"
    GENDER_PROTO = FACE_MODELS / "deploy_gender.prototxt"
    GENDER_MODEL = FACE_MODELS / "gender_net.caffemodel"
    
    # MediaPipe Tasks
    EMOTION_MODEL = MESH_MODELS / "face_landmarker.task"
    POSE_MODEL = POSE_MODELS / "pose_landmarker_lite.task"
    HAND_MODEL = MESH_MODELS / "hand_landmarker.task"
    
    # Object Detection & ReID
    OBJECT_DETECTOR = OBJECT_MODELS / "efficientdet_lite2.tflite"
    OBJECT_EMBEDDER = OBJECT_MODELS / "mobilenet_v3_small.tflite"
    YOLO_OBJ_MODEL = OBJECT_MODELS / "yolov8n.pt"
    REID_MODEL = REID_MODELS / "osnet_x0_25_market.onnx"
    
    # Download URLs
    URLS = {
        "face_landmarker.task": "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
        "pose_landmarker_lite.task": "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
        "hand_landmarker.task": "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
        "efficientdet_lite2.tflite": "https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite2/int8/1/efficientdet_lite2.tflite",
        "mobilenet_v3_small.tflite": "https://storage.googleapis.com/mediapipe-models/image_embedder/mobilenet_v3_small/float32/1/mobilenet_v3_small.tflite",
        "osnet_x0_25_market.onnx": "https://raw.githubusercontent.com/PeppermintSummer/OSNet_tensorrt/master/osnet_x0_25_market.onnx"
    }
    
    # Detection Thresholds
    DET_THRESH = float(os.getenv("DET_THRESH", 0.15))
    IOU_THRESH = float(os.getenv("IOU_THRESH", 0.3))
    
    # Server/API
    PORT = int(os.getenv("PORT", 8000))
    HOST = os.getenv("HOST", "0.0.0.0")
    SERVER_URL = os.getenv("SERVER_URL", "http://localhost:3000")


settings = Config()
