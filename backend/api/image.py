from pathlib import Path
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, status
from backend.core.config import settings
from backend.utils.file_validation import (
    validate_uploaded_file,
    save_temporary_file,
    cleanup_temporary_file,
)
from backend.services.image_service import image_service
from backend.schemas.responses import (
    ImageCaptionResponse,
    ImageAskResponse,
    ImageAnalyzeResponse,
    ImageVQAResponse,
)
from backend.utils.logging import logger

router = APIRouter(prefix="/image", tags=["Image Understanding"])


@router.post("/caption", response_model=ImageCaptionResponse)
async def generate_image_caption(file: UploadFile = File(...)):
    """
    Generate an accurate, descriptive natural-language caption for an uploaded image.
    Supports JPG, JPEG, PNG, WEBP.
    """
    await validate_uploaded_file(
        file=file,
        allowed_extensions=settings.ALLOWED_IMAGE_EXTENSIONS,
        allowed_mimes=settings.ALLOWED_IMAGE_MIMES,
        max_size_mb=settings.MAX_UPLOAD_IMAGE_SIZE_MB,
    )

    temp_path: Path = await save_temporary_file(file, prefix="img_caption")
    try:
        response = image_service.generate_caption(temp_path)
        return response
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in caption endpoint: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Image captioning failed: {str(e)}",
        )
    finally:
        cleanup_temporary_file(temp_path)


@router.post("/ask", response_model=ImageAskResponse)
async def ask_image_question(
    file: UploadFile = File(...),
    question: str = Form(..., min_length=1, max_length=500),
):
    """
    Ask a natural language question about the visual content of an uploaded image.
    Grounded using the ViLT Vision-and-Language Transformer.
    """
    if not question or not question.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The 'question' parameter cannot be empty.",
        )

    await validate_uploaded_file(
        file=file,
        allowed_extensions=settings.ALLOWED_IMAGE_EXTENSIONS,
        allowed_mimes=settings.ALLOWED_IMAGE_MIMES,
        max_size_mb=settings.MAX_UPLOAD_IMAGE_SIZE_MB,
    )

    temp_path: Path = await save_temporary_file(file, prefix="img_ask")
    try:
        response = image_service.answer_question(temp_path, question.strip())
        return response
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in image ask endpoint: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Visual question answering failed: {str(e)}",
        )
    finally:
        cleanup_temporary_file(temp_path)


@router.post("/analyze", response_model=ImageAnalyzeResponse)
async def analyze_image_content(file: UploadFile = File(...)):
    """
    Perform holistic visual analysis:
    - Descriptive captioning
    - Scene classification (outdoor/indoor/document/portrait)
    - Color palette & lighting analysis
    - Key visual element detection
    - Synthesized visual narrative
    """
    await validate_uploaded_file(
        file=file,
        allowed_extensions=settings.ALLOWED_IMAGE_EXTENSIONS,
        allowed_mimes=settings.ALLOWED_IMAGE_MIMES,
        max_size_mb=settings.MAX_UPLOAD_IMAGE_SIZE_MB,
    )

    temp_path: Path = await save_temporary_file(file, prefix="img_analyze")
    try:
        response = image_service.analyze_image(temp_path)
        return response
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in image analysis endpoint: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Image analysis failed: {str(e)}",
        )
    finally:
        cleanup_temporary_file(temp_path)


# Compatibility alias for earlier VQA route
@router.post("/vqa", response_model=ImageAskResponse)
async def visual_question_answering_legacy(
    file: UploadFile = File(...),
    question: str = Form(..., min_length=1, max_length=500),
):
    """Legacy alias redirecting to /ask."""
    return await ask_image_question(file=file, question=question)
