# 10Sight Deployment Guide (Render - Free Tier)

This guide outlines the steps to deploy the full system on **Render**.

> [!WARNING]
> The **AI Worker** (Python) requires significant RAM (Deep Learning). Render's Free Tier has a 512MB limit. If the worker crashes with `Out of Memory`, you may need to upgrade to a "Starter" plan or use a host like **Hugging Face Spaces**.

## 1. Prerequisites
- A **GitHub** repository containing your code.
- A **MongoDB Atlas** account (M0 Free Cluster).

---

## 2. Deploy Backend (Identity Server)
1. **New > Web Service**
2. Connect your repo.
3. **Region**: Same as your DB (e.g., Oregon).
4. **Environment**: `Node`
5. **Build Command**: `npm install` (Root: `server`)
6. **Start Command**: `npm start`
7. **Env Vars**:
   - `MONGODB_URI`: Your MongoDB Atlas string.
   - `PORT`: `10000` (Render default).
   - `CORS_ORIGIN`: Your Frontend URL (update this once frontend is deployed).

---

## 3. Deploy Frontend (Neural Frontend)
1. **New > Static Site**
2. Connect your repo.
3. **Build Command**: `npm run build` (Root: `client`)
4. **Publish Directory**: `dist`
5. **Env Vars**:
   - `VITE_API_URL`: Your Server URL (from step 2).
   - `VITE_WORKER_URL`: Your Worker URL (from step 4).

---

## 4. Deploy AI Worker (Neural Worker)
1. **New > Web Service**
2. **Runtime**: `Docker`
3. **Docker Command**: Leave default (uses `Dockerfile` in `worker` folder).
4. **Env Vars**:
   - `PORT`: `8000`

---

## 💡 Pro Tips for Free Tier
- **Spin Up Time**: Render Free Tier services "sleep" after 15 mins of inactivity. The first request might take 30-50 seconds to wakeup.
- **Worker RAM**: If the Python worker fails, try modifying `requirements.txt` to use `onnxruntime-cpu` instead of generic `onnxruntime` to save space.
- **Database**: Ensure your MongoDB Atlas Whitelist includes `0.0.0.0/0` (Render IPs change frequently).
