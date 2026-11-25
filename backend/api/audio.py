from pathlib import Path
from typing import Optional
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, status
from backend.core.config import settings
from backend.utils.file_validation import (
    validate_uploaded_file,
    save_temporary_file,
    cleanup_temporary_file,
)
from backend.services.audio_service import audio_service
from backend.schemas.responses import (
    AudioTranscribeResponse,
    AudioSummarizeResponse,
    AudioAskResponse,
)
from backend.utils.logging import logger

router = APIRouter(prefix="/audio", tags=["Audio Understanding"])


@router.post("/transcribe", response_model=AudioTranscribeResponse)
async def transcribe_audio(
    file: UploadFile = File(...),
    language: Optional[str] = Form(None),
):
    """
    Transcribe speech from an audio file into text with timestamps and language detection.
    Supports WAV, MP3, M4A, FLAC, OGG.
    """
    await validate_uploaded_file(
        file=file,
        allowed_extensions=settings.ALLOWED_AUDIO_EXTENSIONS,
        allowed_mimes=settings.ALLOWED_AUDIO_MIMES,
        max_size_mb=settings.MAX_UPLOAD_AUDIO_SIZE_MB,
    )

    temp_path: Path = await save_temporary_file(file, prefix="aud_transcribe")
    try:
        response = audio_service.transcribe(temp_path, language=language)
        return response
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in audio transcription endpoint: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Audio transcription failed: {str(e)}",
        )
    finally:
        cleanup_temporary_file(temp_path)


@router.post("/summarize", response_model=AudioSummarizeResponse)
async def summarize_audio(
    file: UploadFile = File(...),
    language: Optional[str] = Form(None),
):
    """
    Transcribes the uploaded audio and returns an automated summary and key points.
    """
    await validate_uploaded_file(
        file=file,
        allowed_extensions=settings.ALLOWED_AUDIO_EXTENSIONS,
        allowed_mimes=settings.ALLOWED_AUDIO_MIMES,
        max_size_mb=settings.MAX_UPLOAD_AUDIO_SIZE_MB,
    )

    temp_path: Path = await save_temporary_file(file, prefix="aud_summarize")
    try:
        response = audio_service.summarize(temp_path, language=language)
        return response
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in audio summarize endpoint: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Audio summarization failed: {str(e)}",
        )
    finally:
        cleanup_temporary_file(temp_path)


@router.post("/ask", response_model=AudioAskResponse)
async def ask_audio_question(
    file: UploadFile = File(...),
    question: str = Form(..., min_length=1, max_length=500),
    language: Optional[str] = Form(None),
):
    """
    Ask questions about the spoken content in the uploaded audio recording.
    Answers are grounded strictly in the speech transcript.
    """
    if not question or not question.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The 'question' parameter cannot be empty.",
        )

    await validate_uploaded_file(
        file=file,
        allowed_extensions=settings.ALLOWED_AUDIO_EXTENSIONS,
        allowed_mimes=settings.ALLOWED_AUDIO_MIMES,
        max_size_mb=settings.MAX_UPLOAD_AUDIO_SIZE_MB,
    )

    temp_path: Path = await save_temporary_file(file, prefix="aud_ask")
    try:
        response = audio_service.answer_question(
            temp_path, question=question.strip(), language=language
        )
        return response
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in audio ask endpoint: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Audio question answering failed: {str(e)}",
        )
    finally:
        cleanup_temporary_file(temp_path)
