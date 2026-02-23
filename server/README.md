# 10Sight Identity Server

The orchestration layer of the Face Detection system, handling business logic, data persistence, and identity security.

## ⚙️ Core Responsibilities
- **Identity Registry**: Managing 512-dimensional face embeddings for recognized individuals.
- **Audit Logging**: Asynchronous logging of every sighting with demographic and emotional sentiment analysis.
- **Forensic Pipeline**: Bridging frontend requests to the Python AI worker.
- **Watchlist Engine**: Real-time security alerts for high-risk profiles.

## 🛠 Tech Stack
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB (Mongoose)
- **Validation**: Custom ApiError and ApiResponse handlers.

## 📡 API Endpoints (v1)
- `/api/v1/face`: Detection and registration logic.
- `/api/v1/analytics`: Forensic search and intelligence reporting (paginated).
- `/api/v1/identity`: Identity management and watchlist configuration.

## 🚀 Development
```bash
npm install
npm run dev
```
