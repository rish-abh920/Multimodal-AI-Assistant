from typing import Optional, List, Dict, Any
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, status
from backend.schemas.unified import UnifiedResponse
from backend.services.multimodal_router import multimodal_router
from backend.core.session_manager import session_manager
from backend.utils.logging import logger

router = APIRouter(tags=["Unified Multimodal Gateway"])


@router.post("/chat", response_model=UnifiedResponse)
@router.post("/multimodal/process", response_model=UnifiedResponse)
async def unified_chat_gateway(
    file: Optional[UploadFile] = File(None),
    prompt: Optional[str] = Form(None),
    text_input: Optional[str] = Form(None),
    session_id: Optional[str] = Form(None),
    action: Optional[str] = Form("auto"),
):
    """
    Unified Multimodal AI Endpoint.
    
    Accepts:
    - Image + Prompt -> Visual Question Answering / Captioning
    - Audio + Prompt -> Speech Transcription / Summarization / Grounded Q&A
    - Document (PDF/TXT) + Prompt -> Semantic RAG with page citations / Document Summarization
    - Text + Prompt -> NLP Analysis, Summarization, and multi-turn contextual follow-ups
    
    Ensures non-blocking background execution, throttled concurrency, and isolated session history.
    """
    return await multimodal_router.process_request(
        file=file,
        prompt=prompt,
        text_input=text_input,
        session_id=session_id,
        action=action,
    )


@router.get("/chat/history/{session_id}")
async def get_session_history(session_id: str):
    """Retrieves conversation history turns for a specific session."""
    history = session_manager.get_history(session_id)
    return {
        "session_id": session_id,
        "turns_count": len(history),
        "history": history,
    }


@router.delete("/chat/session/{session_id}")
async def delete_session(session_id: str):
    """Clears and reclaims memory for a specific conversation session."""
    cleared = session_manager.clear_session(session_id)
    return {
        "session_id": session_id,
        "cleared": cleared,
        "message": "Session context successfully deleted." if cleared else "Session not found.",
    }

