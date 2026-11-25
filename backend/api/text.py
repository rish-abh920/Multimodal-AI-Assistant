from fastapi import APIRouter, HTTPException, status
from backend.schemas.requests import TextSummarizeRequest, TextAnalyzeRequest
from backend.schemas.responses import TextSummarizeResponse, TextAnalyzeResponse
from backend.services.text_service import text_service
from backend.utils.logging import logger

router = APIRouter(prefix="/text", tags=["Text Understanding"])


@router.post("/summarize", response_model=TextSummarizeResponse)
async def summarize_text(request: TextSummarizeRequest):
    """
    Summarize a block of text into a concise, information-dense overview.
    Supports adjustable token length limits.
    """
    try:
        response = text_service.summarize(request)
        return response
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in text summarization endpoint: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Text summarization failed: {str(e)}",
        )


@router.post("/analyze", response_model=TextAnalyzeResponse)
async def analyze_text(request: TextAnalyzeRequest):
    """
    Comprehensive text intelligence:
    - Keywords & topical entities
    - Key metrics, dates & facts
    - High-level conceptual explanation
    - Stylistic rewriting (concise, formal, bulleted)
    - Optional question answering based on the provided text
    """
    try:
        response = text_service.analyze(request)
        return response
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in text analysis endpoint: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Text analysis failed: {str(e)}",
        )
