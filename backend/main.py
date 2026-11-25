import os
import time
from datetime import datetime, timezone
from contextlib import asynccontextmanager
import psutil
import torch
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from backend.core.config import settings
from backend.core.model_manager import model_manager, ModelLoadError
from backend.schemas.responses import (
    HealthResponse,
    HardwareInfo,
    MemoryInfo,
    StatusResponse,
    ConfiguredModels,
)
from backend.api.image import router as image_router
from backend.api.audio import router as audio_router
from backend.api.text import router as text_router
from backend.api.documents import router as document_router
from backend.api.unified import router as unified_router
from backend.utils.logging import logger


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifecycle management."""
    logger.info("Initializing Multimodal AI Assistant Backend...")
    settings.ensure_directories()
    logger.info(
        f"Environment: {settings.APP_ENV} | Target Device: {model_manager.device} "
        f"| CUDA Available: {torch.cuda.is_available()}"
    )
    yield
    logger.info("Shutting down backend and freeing memory...")
    model_manager.unload_all()


app = FastAPI(
    title=settings.APP_NAME,
    description="Unified Multimodal AI Backend for Image, Audio, Text, and Document Understanding",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global Exception Handlers
@app.exception_handler(ModelLoadError)
async def model_load_error_handler(request: Request, exc: ModelLoadError):
    logger.error(f"ModelLoadError on {request.url.path}: {exc}")
    return JSONResponse(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        content={"success": False, "error": "ModelServiceUnavailable", "detail": str(exc)},
    )


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled server error on {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "success": False,
            "error": "InternalServerError",
            "detail": "An unexpected error occurred while processing your request.",
        },
    )


# -------------------------------------------------------------
# Core Status & Health Endpoints
# -------------------------------------------------------------

@app.get("/health", response_model=HealthResponse, tags=["System"])
async def get_health():
    """
    Returns comprehensive server health, memory metrics, and compute status.
    """
    vm = psutil.virtual_memory()
    total_gb = round(vm.total / (1024**3), 2)
    used_gb = round(vm.used / (1024**3), 2)
    free_gb = round(vm.available / (1024**3), 2)

    hardware = HardwareInfo(
        device=model_manager.device,
        cpu_cores=psutil.cpu_count(logical=False) or 1,
        cpu_threads=psutil.cpu_count(logical=True) or 1,
        cpu_percent=psutil.cpu_percent(interval=None),
        memory=MemoryInfo(
            total_gb=total_gb,
            used_gb=used_gb,
            free_gb=free_gb,
            percent=vm.percent,
        ),
        cuda_available=torch.cuda.is_available(),
        torch_version=torch.__version__,
    )

    return HealthResponse(
        status="healthy",
        timestamp=datetime.now(timezone.utc).isoformat(),
        version="1.0.0",
        hardware=hardware,
    )


@app.get("/api/v1/status", response_model=StatusResponse, tags=["System"])
async def get_system_status():
    """
    Returns active modality configurations and currently resident models in memory.
    """
    configured = ConfiguredModels(
        image_caption=settings.IMAGE_CAPTION_MODEL_ID,
        image_vqa=settings.IMAGE_VQA_MODEL_ID,
        audio_whisper=f"faster-whisper-{settings.WHISPER_MODEL_SIZE}",
        text_summarization=settings.TEXT_SUMMARIZATION_MODEL_ID,
        text_embedding=settings.TEXT_EMBEDDING_MODEL_ID,
    )

    return StatusResponse(
        app_name=settings.APP_NAME,
        environment=settings.APP_ENV,
        active_device=model_manager.device,
        configured_models=configured,
        loaded_models=model_manager.get_loaded_models(),
        max_concurrent_models=settings.MAX_LOADED_MODELS,
        memory_footprint_mb=model_manager.get_memory_footprint_mb(),
    )


# Register Modality & Unified Routers under /api/v1
app.include_router(unified_router, prefix="/api/v1")
app.include_router(image_router, prefix="/api/v1")
app.include_router(audio_router, prefix="/api/v1")
app.include_router(text_router, prefix="/api/v1")
app.include_router(document_router, prefix="/api/v1")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "backend.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
    )

