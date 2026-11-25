import os
import json
import logging
from typing import List
from pathlib import Path
from dotenv import load_dotenv

# Hugging Face environment safety on Windows
os.environ["HF_HUB_DISABLE_DISK_LOCK"] = "1"
os.environ["HF_HUB_DISABLE_SYMLINKS_WARNING"] = "1"

# Load .env file if available
BASE_DIR = Path(__file__).resolve().parent.parent.parent
load_dotenv(BASE_DIR / ".env")


def _parse_cors_origins() -> List[str]:
    default_origins = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
        "http://localhost:3000",
    ]
    raw = os.getenv("CORS_ORIGINS", "").strip()
    if not raw:
        return default_origins
    try:
        parsed = json.loads(raw)
        if isinstance(parsed, list):
            return [str(o).strip() for o in parsed if str(o).strip()]
    except Exception:
        return [o.strip() for o in raw.split(",") if o.strip()]
    return default_origins


class Settings:
    """Centralized application and ML configuration."""

    # Application
    APP_ENV: str = os.getenv("APP_ENV", "development")
    APP_NAME: str = os.getenv("APP_NAME", "Multimodal AI Assistant")
    HOST: str = os.getenv("HOST", "127.0.0.1")
    PORT: int = int(os.getenv("PORT", "8000"))
    DEBUG: bool = os.getenv("DEBUG", "True").lower() in ("true", "1", "yes")

    # CORS
    CORS_ORIGINS: List[str] = _parse_cors_origins()

    # Hardware & Compute
    # Options: "auto", "cpu", "cuda"
    DEVICE: str = os.getenv("DEVICE", "auto")
    CPU_NUM_THREADS: int = int(os.getenv("CPU_NUM_THREADS", "4"))
    LAZY_LOAD_MODELS: bool = os.getenv("LAZY_LOAD_MODELS", "True").lower() in ("true", "1", "yes")
    MAX_LOADED_MODELS: int = int(os.getenv("MAX_LOADED_MODELS", "2"))

    # Model IDs
    IMAGE_CAPTION_MODEL_ID: str = os.getenv(
        "IMAGE_CAPTION_MODEL_ID", "Salesforce/blip-image-captioning-base"
    )
    IMAGE_VQA_MODEL_ID: str = os.getenv(
        "IMAGE_VQA_MODEL_ID", "dandelin/vilt-b32-finetuned-vqa"
    )
    WHISPER_MODEL_SIZE: str = os.getenv("WHISPER_MODEL_SIZE", "base")
    WHISPER_DEVICE: str = os.getenv("WHISPER_DEVICE", "cpu")
    WHISPER_COMPUTE_TYPE: str = os.getenv("WHISPER_COMPUTE_TYPE", "int8")
    TEXT_SUMMARIZATION_MODEL_ID: str = os.getenv(
        "TEXT_SUMMARIZATION_MODEL_ID", "google/flan-t5-small"
    )
    TEXT_EMBEDDING_MODEL_ID: str = os.getenv(
        "TEXT_EMBEDDING_MODEL_ID", "sentence-transformers/all-MiniLM-L6-v2"
    )

    # Storage, File Security & Processing Bounds
    TEMP_STORAGE_DIR: Path = BASE_DIR / os.getenv("TEMP_STORAGE_DIR", "data/temp")
    MAX_UPLOAD_IMAGE_SIZE_MB: int = int(os.getenv("MAX_UPLOAD_IMAGE_SIZE_MB", "10"))
    MAX_UPLOAD_AUDIO_SIZE_MB: int = int(os.getenv("MAX_UPLOAD_AUDIO_SIZE_MB", "25"))
    MAX_UPLOAD_DOC_SIZE_MB: int = int(os.getenv("MAX_UPLOAD_DOC_SIZE_MB", "15"))
    MAX_IMAGE_DIMENSION: int = int(os.getenv("MAX_IMAGE_DIMENSION", "1280"))
    MAX_AUDIO_DURATION_SECONDS: int = int(os.getenv("MAX_AUDIO_DURATION_SECONDS", "600"))
    MAX_DOCUMENT_PAGES: int = int(os.getenv("MAX_DOCUMENT_PAGES", "100"))
    CLEANUP_TEMP_FILES: bool = os.getenv("CLEANUP_TEMP_FILES", "True").lower() in ("true", "1", "yes")

    # Allowed Extensions & MIME Types
    ALLOWED_IMAGE_EXTENSIONS: set = {".jpg", ".jpeg", ".png", ".webp", ".bmp"}
    ALLOWED_AUDIO_EXTENSIONS: set = {".wav", ".mp3", ".ogg", ".m4a", ".flac"}
    ALLOWED_DOC_EXTENSIONS: set = {".pdf", ".txt"}

    ALLOWED_IMAGE_MIMES: set = {
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/bmp",
    }
    ALLOWED_AUDIO_MIMES: set = {
        "audio/wav",
        "audio/x-wav",
        "audio/mpeg",
        "audio/mp3",
        "audio/ogg",
        "audio/x-m4a",
        "audio/m4a",
        "audio/flac",
        "audio/x-flac",
    }
    ALLOWED_DOC_MIMES: set = {
        "application/pdf",
        "text/plain",
    }

    def ensure_directories(self) -> None:
        """Create required directories if they don't exist."""
        self.TEMP_STORAGE_DIR.mkdir(parents=True, exist_ok=True)
        (BASE_DIR / "data" / "uploads").mkdir(parents=True, exist_ok=True)


settings = Settings()
settings.ensure_directories()

