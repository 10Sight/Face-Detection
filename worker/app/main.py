import os
import traceback
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

# Force single threading for heavy AI libs
os.environ["OMP_NUM_THREADS"] = "1"
os.environ["MKL_NUM_THREADS"] = "1"

from app.api.v1.router import router as api_v1_router
from app.core.logging import logger
from app.core import lifecycle

# Initialize FastAPI
app = FastAPI(
    title="10Sight Neural Worker",
    description="High-performance AI perception engine for biometric auditing.",
    version="2.0.0"
)

# Lifecycle Event Handlers
@app.on_event("startup")
async def on_startup():
    await lifecycle.startup()

@app.on_event("shutdown")
async def on_shutdown():
    await lifecycle.shutdown()

# Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def log_requests(request: Request, call_next):
    logger.debug(f"REQ: {request.method} {request.url.path}")
    response = await call_next(request)
    return response

# Exception Handlers
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled Exception: {str(exc)}\n{traceback.format_exc()}")
    return JSONResponse(
        status_code=500,
        content={"message": "Internal Server Error", "detail": str(exc)},
    )

# Routes
@app.get("/", tags=["Health"])
async def root():
    return {
        "status": "online",
        "service": "10Sight Neural Worker",
        "version": "2.0.0",
        "api_docs": "/docs"
    }

app.include_router(api_v1_router, prefix="/api/v1")
