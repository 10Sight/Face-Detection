from fastapi import FastAPI
from app.api.v1.face_routes import router

app = FastAPI(title="10Sight Face Detection Worker")

@app.get("/")
async def root():
    return {"message": "10Sight Face Detection Worker is running", "api_docs": "/docs"}

app.include_router(router, prefix="/api/v1")