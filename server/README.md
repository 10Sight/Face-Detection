# 10Sight Identity Server

The orchestration layer of the Face Detection system, handling business logic, data persistence, multi-service coordination, and security alerts.

## ⚙️ Core Responsibilities

- **Identity Registry**: Managing 512-dimensional face embeddings for recognized individuals with Mongoose-backed persistence.
- **Audit Logging**: Asynchronous recording of every sighting, including demographics, sentiment, and spatial coordinates.
- **Forensic Bridge**: Proxying forensic and detection requests to the **Neural Worker** (Python FastAPI).
- **Communication Engine**: Integrated WhatsApp notifications for unknown detections and high-priority watchlist alerts.
- **Intelligence Analytics**: Forensic search and historical sighting analysis across multiple cameras.

## 📂 Source Structure

```text
server/src/
├── controllers/          # API Request handlers
├── services/             # Core business logic (ReID, WhatsApp, Alerts, Audit)
├── models/               # MongoDB Collections (Audit, Face, ReID, Watchlist)
├── routes/               # Express endpoint definitions
├── middlewares/          # Auth and Request validation
├── db/                   # Database connection lifecycle
└── app.js                # Integrated service entry point
```

## 🛠 Tech Stack

- **Runtime**: Node.js (v18+)
- **Framework**: Express.js
- **Database**: MongoDB (Mongoose)
- **Messaging**: WhatsApp Cloud API / Integration
- **Integration**: Axios-based proxying to high-performance AI Worker.

## 📡 API v1 Endpoints

- `/api/v1/face/detect`: Proxies to Worker for high-fidelity detection.
- `/api/v1/face/register`: Finalizes identity registration and vector storage.
- `/api/v1/reid`: Handles person re-identification matching and persistence.
- `/api/v1/analytics`: Forensic search and intelligence reporting.
- `/api/v1/identity`: Watchlist and identity management.

## 🚀 Development

```bash
npm install
npm run dev
```

---
© 2026 10Sight Technologies - Proprietary

