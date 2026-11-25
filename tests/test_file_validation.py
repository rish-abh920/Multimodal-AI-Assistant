import io
import asyncio
import pytest
from fastapi import UploadFile, HTTPException
from backend.utils.file_validation import (
    validate_uploaded_file,
    save_temporary_file,
    cleanup_temporary_file,
    get_file_extension,
    check_magic_signature,
)
from backend.core.config import settings


def test_get_file_extension():
    assert get_file_extension("photo.JPG") == ".jpg"
    assert get_file_extension("sound.wav") == ".wav"
    assert get_file_extension("archive.tar.gz") == ".gz"
    assert get_file_extension("no_ext") == ""


def test_magic_signature_detection():
    # PNG signature check
    png_sig = b"\x89PNG\r\n\x1a\n" + b"\x00" * 20
    assert check_magic_signature(png_sig, "image/png") is True

    # PDF signature check
    pdf_sig = b"%PDF-1.7" + b"\x00" * 20
    assert check_magic_signature(pdf_sig, "application/pdf") is True

    # Invalid signature check
    garbage = b"\x00\x01\x02\x03"
    assert check_magic_signature(garbage, "image/png") is False


def test_validate_valid_image(sample_image_bytes):
    async def _run():
        upload = UploadFile(
            filename="test.png",
            file=io.BytesIO(sample_image_bytes),
            headers={"content-type": "image/png"},
        )
        ext, size = await validate_uploaded_file(
            file=upload,
            allowed_extensions=settings.ALLOWED_IMAGE_EXTENSIONS,
            allowed_mimes=settings.ALLOWED_IMAGE_MIMES,
            max_size_mb=settings.MAX_UPLOAD_IMAGE_SIZE_MB,
        )
        assert ext == ".png"
        assert size == len(sample_image_bytes)

    asyncio.run(_run())


def test_validate_disallowed_extension(sample_image_bytes):
    async def _run():
        upload = UploadFile(
            filename="malicious.exe",
            file=io.BytesIO(sample_image_bytes),
            headers={"content-type": "image/png"},
        )
        with pytest.raises(HTTPException) as exc_info:
            await validate_uploaded_file(
                file=upload,
                allowed_extensions=settings.ALLOWED_IMAGE_EXTENSIONS,
                allowed_mimes=settings.ALLOWED_IMAGE_MIMES,
                max_size_mb=settings.MAX_UPLOAD_IMAGE_SIZE_MB,
            )
        assert exc_info.value.status_code == 415

    asyncio.run(_run())


def test_validate_empty_file():
    async def _run():
        upload = UploadFile(
            filename="empty.png",
            file=io.BytesIO(b""),
            headers={"content-type": "image/png"},
        )
        with pytest.raises(HTTPException) as exc_info:
            await validate_uploaded_file(
                file=upload,
                allowed_extensions=settings.ALLOWED_IMAGE_EXTENSIONS,
                allowed_mimes=settings.ALLOWED_IMAGE_MIMES,
                max_size_mb=settings.MAX_UPLOAD_IMAGE_SIZE_MB,
            )
        assert exc_info.value.status_code == 400

    asyncio.run(_run())


def test_temp_file_save_and_cleanup(sample_image_bytes):
    async def _run():
        upload = UploadFile(
            filename="temp_test.png",
            file=io.BytesIO(sample_image_bytes),
        )
        temp_path = await save_temporary_file(upload, prefix="test")
        assert temp_path.exists()
        assert temp_path.is_file()

        cleanup_temporary_file(temp_path)
        assert not temp_path.exists()

    asyncio.run(_run())
