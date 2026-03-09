# 10Sight Neural Worker

The high-performance AI perception engine for the 10Sight system. This worker is responsible for real-time face detection, recognition, 3D mesh reconstruction, pose estimation, and multi-object tracking using specialized neural engines.

## 🏗️ Technical Architecture

The worker is built on a modular, asynchronous architecture designed for low-latency inference:

```text
worker/
├── app/
│   ├── api/v1/                # REST and WebSocket endpoints
│   ├── core/                  # Lifecycle, config, and Model Registry
│   ├── engines/               # Single-responsibility AI Inference Engines
│   ├── pipeline/              # High-throughput data flow (FrameBus, FrameScheduler)
│   ├── services/              # High-level orchestration (PerceptionService, FaceService)
│   ├── tracking/              # Spatial-temporal tracking (SORT/ByteTrack variants)
│   ├── schemas/               # Type-safe validation (Pydantic)
│   ├── utils/                 # Image processing and profiling
│   └── main.py                # FastAPI entry point
├── models/                    # Automated weight storage
└── requirements.txt           # Dependency manifest
```

## 🧠 Neural Engines & Model Mapping

The worker utilizes a suite of specialized models, each mapped to specific functions for high-accuracy perception.

| Engine | Core Function | Neural Model / Framework | Primary Use Case |
| :--- | :--- | :--- | :--- |
| **Face Engine** | `analyze()` | **InsightFace (buffalo_s)** | 512-D identity embedding & detection |
| **Mesh Engine** | `analyze()` | **MediaPipe FaceMesh** | 468-point 3D geometry & Head Pose |
| **Pose Engine** | `analyze()` | **MediaPipe Pose (Heavy)** | 33-point body tracking & motion metrics |
| **Hand Engine** | `analyze()` | **MediaPipe Hands** | 21-point tracking & Gesture recognition |
| **Object Engine** | `detect()` | **EfficientDet-Lite2** | 80+ COCO class detection & tracking |
| **YOLO Engine** | `detect()` | **YOLOv8 Nano** | High-speed spatial localization |
| **ReID Engine** | `extract_embedding()` | **OSNet (Market1501)** | Cross-camera person re-identification |
| **Demographics** | `analyze()` | **Caffe (AgeNet / GenderNet)** | Stable Age/Gender classification |
| **Emotion** | `detect_emotion()` | **MediaPipe Blendshapes** | Facial expression & sentiment analysis |

## 🛠️ Tech Stack

- **Core**: FastAPI (Python 3.10+) - Asynchronous web framework.
- **Inference**: ONNX Runtime - High-performance engine for CPU/GPU.
- **Vision**: OpenCV - Image processing and frame manipulation.
- **Pipelines**: `FrameBus` - A custom Pub/Sub mechanism for zero-copy frame sharing between engines.

## 🚀 Getting Started

### Installation
```bash
python -m venv venv
# Windows:
venv\Scripts\activate
# Linux:
source venv/bin/activate
pip install -r requirements.txt
```

### Running the Service
```bash
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

## 📡 API v1 Endpoints

- `POST /api/v1/face/detect`: Multi-engine face analysis.
- `GET /api/v1/telemetry/`: Real-time performance metrics (FPS, Latency).
- `WS /api/v1/stream/ws/perceive`: Bidirectional high-speed perception stream.

---
© 2026 10Sight Technologies - Proprietary
