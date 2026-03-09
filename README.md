# 10Sight Neural Face Detection System

A premium, enterprise-grade AI surveillance and biometric auditing platform. This project integrates high-performance face detection, real-time recognition, 3D body tracking, and neural forensic search capabilities into a unified mission control dashboard.

## 🏗 System Architecture

The project is architected as a high-throughput microservices ecosystem:

- **[Client](./client)**: A futuristic React 19 / Vite frontend leveraging **Framer Motion** for liquid animations and **Redux Toolkit** for unified state management.
- **[Server](./server)**: A robust Node.js/Express orchestration layer handling identity registry, multi-channel alerting (WhatsApp), and forensic audit logging.
- **[Worker](./worker)**: A high-performance Python FastAPI engine powered by **InsightFace**, **MediaPipe**, and **YOLOv8** for real-time neural inference.

## 🧠 Core Intelligence Features

- **Mission Control**: Integrated surveillance grid with support for local and remote (WebRTC) camera streams.
- **Neural Forensics**: Deep-search identities across historical sightings using 512-dimensional vector fingerprints.
- **Holistic Perception**: Real-time detection and tracking of Faces (Recognition + Mesh), Hands (21-point tracking), Poses (33-point landmarks), and Objects (YOLOv8).
- **Identity Re-Identification (ReID)**: Persistent body-based tracking (OSNet) for seamless identity maintenance even when faces are obscured.
- **Smart Alerts**: Automated WhatsApp notifications for unauthorized access or unknown face detection.
- **Biometric Auditing**: Enterprise-grade reporting with demographic analysis (Age, Gender) and emotional sentiment tracking.

## 🚀 Quick Start

### Prerequisites
- **Node.js**: v18+ (for Server and Client)
- **Python**: v3.10+ (for Neural Worker)
- **Database**: MongoDB (Local or Atlas)
- **Hardware**: GPU recommended for Worker (NVIDIA with CUDA 11.8+), but optimized for high-performance CPU inference.

### Running with Docker (Recommended)
```bash
docker-compose up --build
```

### Manual Development Setup
1. **Worker**: `cd worker && python -m venv venv && ./venv/Scripts/activate && pip install -r requirements.txt && python -m uvicorn app.main:app --reload`
2. **Server**: `cd server && npm install && npm run dev`
3. **Client**: `cd client && npm install && npm run dev`

## 📁 Repository Structure

```text
.
├── client/           # React Frontend Application
├── server/           # Node.js API Orchestrator
├── worker/           # Python AI Inference Engine
├── storage/          # Local persistent storage for models and logs
├── deployment/       # Configuration for PM2 and Docker
└── README.md         # This core manifest
```

## 📄 License
Proprietary - 10Sight Technologies
