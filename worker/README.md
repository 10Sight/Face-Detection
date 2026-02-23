# 10Sight Neural Worker

The AI engine of the system. A high-performance Python service that performs heavy-lift biometric processing.

## 🧠 AI Capabilities
- **Neural Extraction**: Extracts 512-dim face embeddings using the InsightFace 'buffalo_l' model.
- **Detection Optimization**: Dynamic resolution scaling (640x640) for high-fidelity static image analysis.
- **Tracking**: Real-time face tracking for living video streams.
- **Sentiment Analysis**: Emotion classification (Happy, Neutral, Sad, etc.) and demographic estimation (Age, Gender).

## 🛠 Tech Stack
- **Framework**: FastAPI (Requires Python 3.10+)
- **Engines**: InsightFace, OpenCV
- **Inference**: ONNX Runtime (CPU/GPU) / TensorFlow Lite
- **Models**: Buffalo_L, MediaPipe Face Landmarker.

## 📡 API v1
- `POST /api/v1/detect`: Main endpoint for face analysis. Supports `is_static=true` for forensic-grade extraction.

## 🚀 Setup
Ensure you have the model files `.tflite` and `.task` in the root of the worker folder.

```bash
python -m venv venv
venv\Scripts\activate.bat
pip install -r requirements.txt
python -m uvicorn app.main:app --reload
```
