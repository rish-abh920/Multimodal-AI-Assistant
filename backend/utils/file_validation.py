import os
import uuid
import shutil
from pathlib import Path
from typing import Set, Tuple, Optional
from fastapi import UploadFile, HTTPException, status
from backend.core.config import settings
from backend.utils.logging import logger

# Magic number signatures for reliable file content inspection
MAGIC_NUMBERS = {
    # Images
    "image/jpeg": [b"\xFF\xD8\xFF"],
    "image/png": [b"\x89PNG\r\n\x1a\n"],
    "image/webp": [b"RIFF"],  # Followed by WEBP at offset 8
    "image/bmp": [b"BM"],
    # Audio
    "audio/wav": [b"RIFF"],  # Followed by WAVE at offset 8
    "audio/mpeg": [b"\xFF\xFB", b"\xFF\xF3", b"\xFF\xF2", b"ID3"],
    "audio/ogg": [b"OggS"],
    "audio/flac": [b"fLaC"],
    "audio/m4a": [b"ftypM4A", b"ftypmp42", b"ftypisom"],
    # Documents
    "application/pdf": [b"%PDF-"],
    "text/plain": [],  # Validated via text decoding check
}


def get_file_extension(filename: str) -> str:
    """Extract lowercase file extension from filename."""
    return Path(filename).suffix.lower() if filename else ""


def check_magic_signature(header: bytes, expected_mime: str) -> bool:
    """Validate raw binary header against expected MIME magic signatures."""
    if expected_mime == "text/plain":
        try:
            header.decode("utf-8")
            return True
        except UnicodeDecodeError:
            try:
                header.decode("latin-1")
                return True
            except UnicodeDecodeError:
                return False

    signatures = MAGIC_NUMBERS.get(expected_mime, [])
    if not signatures:
        return True  # Fallback to extension/content-type if no strict signature configured

    for sig in signatures:
        if expected_mime in ("image/webp", "audio/wav") and header.startswith(b"RIFF"):
            sub_type = b"WEBP" if expected_mime == "image/webp" else b"WAVE"
            if len(header) >= 12 and header[8:12] == sub_type:
                return True
        elif expected_mime == "audio/m4a":
            if len(header) >= 12 and any(box in header[4:12] for box in [b"ftypM4A", b"ftyp", b"mp42", b"isom"]):
                return True
        elif header.startswith(sig):
            return True

    return False


async def validate_uploaded_file(
    file: UploadFile,
    allowed_extensions: Set[str],
    allowed_mimes: Set[str],
    max_size_mb: int,
) -> Tuple[str, int]:
    """
    Validates uploaded file against allowed extensions, MIME types, magic bytes,
    and file size limits.
    Returns: (sanitized_extension, file_size_bytes)
    """
    if not file or not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No file was provided in the upload request.",
        )

    ext = get_file_extension(file.filename)
    if ext not in allowed_extensions:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"File extension '{ext}' is not permitted. Allowed: {sorted(list(allowed_extensions))}",
        )

    # Read first 512 bytes to inspect signature
    header_chunk = await file.read(512)
    await file.seek(0)

    if not header_chunk:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The uploaded file is empty (0 bytes).",
        )

    # Check MIME type declared by client or match magic bytes
    content_type = file.content_type or ""
    mime_matched = False
    for mime in allowed_mimes:
        if check_magic_signature(header_chunk, mime):
            mime_matched = True
            break

    if not mime_matched and content_type not in allowed_mimes:
        logger.warning(f"File magic validation failed for: {file.filename} with declared MIME: {content_type}")
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"Invalid file format or corrupt file signature for '{file.filename}'.",
        )

    # Validate file size without loading entire file into memory
    max_bytes = max_size_mb * 1024 * 1024
    total_size = 0
    chunk_size = 64 * 1024  # 64 KB chunks

    while True:
        chunk = await file.read(chunk_size)
        if not chunk:
            break
        total_size += len(chunk)
        if total_size > max_bytes:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"File size exceeds the limit of {max_size_mb} MB.",
            )

    await file.seek(0)
    return ext, total_size


async def save_temporary_file(file: UploadFile, prefix: str = "upload") -> Path:
    """
    Saves an uploaded file to a secure temporary directory with a unique UUID filename.
    """
    settings.ensure_directories()
    ext = get_file_extension(file.filename)
    unique_name = f"{prefix}_{uuid.uuid4().hex[:12]}{ext}"
    temp_path = settings.TEMP_STORAGE_DIR / unique_name

    try:
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        await file.seek(0)
        logger.info(f"Safely persisted temporary file to: {temp_path.name}")
        return temp_path
    except Exception as e:
        logger.error(f"Failed to save temporary file: {e}")
        if temp_path.exists():
            temp_path.unlink(missing_ok=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not store upload file safely on server.",
        )


def cleanup_temporary_file(path: Optional[Path]) -> None:
    """Safely removes a temporary file if configured and present."""
    if not settings.CLEANUP_TEMP_FILES or path is None:
        return
    try:
        if path.exists():
            path.unlink(missing_ok=True)
            logger.debug(f"Cleaned up temporary file: {path.name}")
    except Exception as e:
        logger.warning(f"Failed to delete temporary file {path}: {e}")

