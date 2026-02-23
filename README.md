# 10Sight Neural Face Detection System

A premium, enterprise-grade AI surveillance and biometric auditing platform. This project integrates high-performance face detection, real-time recognition, and neural forensic search capabilities into a unified mission control dashboard.

## 🏗 System Architecture

The project is divided into three core microservices:

- **[Client](./client)**: A futuristic React/Vite frontend using Framer Motion and Lucide React.
- **[Server](./server)**: A Node.js/Express backend responsible for identity management, audit logging, and orchestration.
- **[Worker](./worker)**: A high-performance Python FastAPI service powered by InsightFace for neural embedding extraction and face detection.

## 🚀 Quick Start

### Prerequisites
- Node.js (v18+)
- Python (v3.9+)
- MongoDB Atlas or Local Instance
- Docker & Docker Compose (optional)

### Running with Docker
```bash
docker-compose up --build
```

### Manual Setup
1. **Worker**: `cd worker && python -m venv venv && source venv/bin/activate && pip install -r requirements.txt && python -m uvicorn app.main:app --reload`
2. **Server**: `cd server && npm install && npm run dev`
3. **Client**: `cd client && npm install && npm run dev`

## 🛡 Features
- **Mission Control**: Multi-stream surveillance grid with remote WebRTC camera uplink.
- **Neural Forensics**: Forensic search using 512-dimensional vector fingerprints and "Generative Reconstruction" visuals.
- **Intelligence Reports**: Paginated biometric audit logs with high-confidence signature extraction.
- **Remote Uplink**: Connect secondary devices as remote cameras via QR Code or Bluetooth.

## 📄 License
Proprietary - 10Sight Technologies
