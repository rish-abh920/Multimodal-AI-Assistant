from backend.core.config import settings, Settings
from pathlib import Path


def test_settings_initialization():
    """Verify settings defaults and types."""
    assert settings.APP_NAME == "Multimodal AI Assistant"
    assert settings.PORT == 8000
    assert isinstance(settings.CORS_ORIGINS, list)
    assert settings.DEVICE in ["auto", "cpu", "cuda"]
    assert settings.MAX_LOADED_MODELS >= 1
    assert settings.CPU_NUM_THREADS >= 1


def test_directory_creation():
    """Verify that required directories are created properly."""
    settings.ensure_directories()
    assert settings.TEMP_STORAGE_DIR.exists()
    assert settings.TEMP_STORAGE_DIR.is_dir()


def test_allowed_extensions_and_mimes():
    """Verify allowed extension and MIME sets are configured."""
    assert ".jpg" in settings.ALLOWED_IMAGE_EXTENSIONS
    assert ".png" in settings.ALLOWED_IMAGE_EXTENSIONS
    assert ".wav" in settings.ALLOWED_AUDIO_EXTENSIONS
    assert ".mp3" in settings.ALLOWED_AUDIO_EXTENSIONS
    assert ".pdf" in settings.ALLOWED_DOC_EXTENSIONS
    assert "image/png" in settings.ALLOWED_IMAGE_MIMES
    assert "application/pdf" in settings.ALLOWED_DOC_MIMES

