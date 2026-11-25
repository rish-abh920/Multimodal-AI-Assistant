import asyncio
import time
import uuid
from pathlib import Path
from typing import Dict, Any, Optional, Tuple
from fastapi import UploadFile, HTTPException, status

from backend.core.config import settings
from backend.core.session_manager import session_manager
from backend.schemas.unified import UnifiedResponse
from backend.schemas.requests import TextSummarizeRequest, TextAnalyzeRequest
from backend.services.image_service import image_service
from backend.services.audio_service import audio_service
from backend.services.text_service import text_service
from backend.services.document_service import document_service
from backend.utils.file_validation import (
    validate_uploaded_file,
    save_temporary_file,
    cleanup_temporary_file,
    get_file_extension,
)
from backend.utils.logging import logger

# Concurrency semaphore: prevents more than 2 simultaneous heavy CPU inference jobs
INFERENCE_SEMAPHORE = asyncio.Semaphore(2)


class MultimodalRouter:
    """
    Centralized Multimodal Orchestration Gateway.
    
    Responsibilities:
    - Automatically classifies input modality (Image, Audio, Document, Text).
    - Asynchronously dispatches inference to background worker threads.
    - Limits concurrent CPU inferences to avoid host starvation.
    - Manages multi-turn conversation memory per isolated session.
    - Normalizes diverse modality outputs into a unified response contract.
    """

    def __init__(self) -> None:
        self.sessions = session_manager

    async def process_request(
        self,
        file: Optional[UploadFile] = None,
        prompt: Optional[str] = None,
        text_input: Optional[str] = None,
        session_id: Optional[str] = None,
        action: Optional[str] = "auto",
    ) -> UnifiedResponse:
        """
        Main entry point for unified chat and multimodal processing.
        """
        start_time = time.time()
        request_id = str(uuid.uuid4())
        session = self.sessions.get_or_create_session(session_id)
        current_session_id = session.session_id

        logger.info(
            f"[Req: {request_id[:8]}] Processing unified request | "
            f"Session: {current_session_id[:8]} | "
            f"Has File: {bool(file)} | Prompt: '{prompt or ''}'"
        )

        modality = "text"
        temp_path: Optional[Path] = None
        result: Dict[str, Any] = {}
        model_used = "UnifiedRouter"
        response_text = ""

        try:
            # 1. Modality Identification
            if file and file.filename:
                ext = get_file_extension(file.filename)
                if ext in settings.ALLOWED_IMAGE_EXTENSIONS:
                    modality = "image"
                elif ext in settings.ALLOWED_AUDIO_EXTENSIONS:
                    modality = "audio"
                elif ext in settings.ALLOWED_DOC_EXTENSIONS:
                    modality = "document"
                else:
                    raise HTTPException(
                        status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                        detail=f"Unsupported file format '{ext}'. Supported: Images, Audio, PDF, TXT.",
                    )

            # 2. Asynchronous Execution with Concurrency Throttling
            async with INFERENCE_SEMAPHORE:
                if modality == "image":
                    await validate_uploaded_file(
                        file=file,
                        allowed_extensions=settings.ALLOWED_IMAGE_EXTENSIONS,
                        allowed_mimes=settings.ALLOWED_IMAGE_MIMES,
                        max_size_mb=settings.MAX_UPLOAD_IMAGE_SIZE_MB,
                    )
                    temp_path = await save_temporary_file(file, prefix="unified_img")
                    result, model_used, response_text = await self._handle_image(temp_path, prompt, action)

                elif modality == "audio":
                    await validate_uploaded_file(
                        file=file,
                        allowed_extensions=settings.ALLOWED_AUDIO_EXTENSIONS,
                        allowed_mimes=settings.ALLOWED_AUDIO_MIMES,
                        max_size_mb=settings.MAX_UPLOAD_AUDIO_SIZE_MB,
                    )
                    temp_path = await save_temporary_file(file, prefix="unified_aud")
                    result, model_used, response_text = await self._handle_audio(temp_path, prompt, action)

                elif modality == "document":
                    await validate_uploaded_file(
                        file=file,
                        allowed_extensions=settings.ALLOWED_DOC_EXTENSIONS,
                        allowed_mimes=settings.ALLOWED_DOC_MIMES,
                        max_size_mb=settings.MAX_UPLOAD_DOC_SIZE_MB,
                    )
                    temp_path = await save_temporary_file(file, prefix="unified_doc")
                    result, model_used, response_text = await self._handle_document(
                        temp_path, prompt, action, original_filename=file.filename
                    )

                else:  # Text or follow-up conversation turn
                    result, model_used, response_text = await self._handle_text(
                        prompt=prompt,
                        text_input=text_input,
                        session_context=session.last_context,
                        action=action,
                    )

            # 3. Context & History Update
            context_to_save = (
                result.get("transcript")
                or result.get("context_text")
                or result.get("caption")
                or result.get("summary")
                or (
                    "\n".join([p["text"] for p in result.get("supporting_passages", [])])
                    if result.get("supporting_passages")
                    else None
                )
                or result.get("explanation")
                or result.get("answer")
            )
            self.sessions.add_turn(
                session_id=current_session_id,
                role="user",
                modality=modality,
                prompt=prompt or text_input or f"Uploaded {modality}",
                response_text=response_text,
                context_data=context_to_save,
                metadata={"request_id": request_id, "model": model_used},
            )

            processing_time = round(time.time() - start_time, 3)
            turn_count = len(session.history)

            return UnifiedResponse(
                request_id=request_id,
                session_id=current_session_id,
                modality=modality,
                success=True,
                result=result,
                model_name=model_used,
                processing_time=processing_time,
                conversation_turn=turn_count,
            )

        except HTTPException as http_exc:
            processing_time = round(time.time() - start_time, 3)
            return UnifiedResponse(
                request_id=request_id,
                session_id=current_session_id,
                modality=modality,
                success=False,
                result={},
                model_name="Error",
                processing_time=processing_time,
                error=http_exc.detail,
            )
        except Exception as e:
            logger.error(f"Unified processing error: {e}", exc_info=True)
            processing_time = round(time.time() - start_time, 3)
            return UnifiedResponse(
                request_id=request_id,
                session_id=current_session_id,
                modality=modality,
                success=False,
                result={},
                model_name="Error",
                processing_time=processing_time,
                error=f"Processing failed: {str(e)}",
            )
        finally:
            if temp_path:
                cleanup_temporary_file(temp_path)

    # -------------------------------------------------------------
    # Modality Worker Handlers (Dispatched to Threads)
    # -------------------------------------------------------------

    async def _handle_image(
        self, temp_path: Path, prompt: Optional[str], action: Optional[str]
    ) -> Tuple[Dict[str, Any], str, str]:
        """Routes image requests to VQA or Captioning without blocking asyncio loop."""
        clean_prompt = prompt.strip() if prompt else ""

        if clean_prompt:
            # If user asked a question, run VQA
            ask_resp = await asyncio.to_thread(image_service.answer_question, temp_path, clean_prompt)
            # Also generate quick caption for context
            caption_resp = await asyncio.to_thread(image_service.generate_caption, temp_path)
            res = {
                "answer": ask_resp.answer,
                "confidence": ask_resp.confidence,
                "caption": caption_resp.image_description,
                "question": clean_prompt,
                "metadata": caption_resp.image_metadata,
            }
            return res, ask_resp.model_name, ask_resp.answer
        else:
            # If no question, perform deep analysis / captioning
            analysis_resp = await asyncio.to_thread(image_service.analyze_image, temp_path)
            res = {
                "caption": analysis_resp.image_description,
                "scene_type": analysis_resp.scene_type,
                "key_elements": analysis_resp.key_elements,
                "dominant_colors": analysis_resp.dominant_colors,
                "explanation": analysis_resp.explanation,
                "metadata": analysis_resp.image_metadata,
            }
            return res, analysis_resp.model_name, analysis_resp.explanation

    async def _handle_audio(
        self, temp_path: Path, prompt: Optional[str], action: Optional[str]
    ) -> Tuple[Dict[str, Any], str, str]:
        """Routes audio requests to speech-to-text, summarization, or Q&A."""
        clean_prompt = prompt.strip() if prompt else ""

        if clean_prompt:
            if any(term in clean_prompt.lower() for term in ["summarize", "summary", "brief", "key points"]):
                sum_resp = await asyncio.to_thread(audio_service.summarize, temp_path)
                res = {
                    "transcript": sum_resp.transcript,
                    "summary": sum_resp.summary,
                    "key_points": sum_resp.key_points,
                    "detected_language": sum_resp.detected_language,
                    "duration_seconds": sum_resp.duration_seconds,
                }
                return res, sum_resp.model_name, sum_resp.summary
            else:
                ask_resp = await asyncio.to_thread(
                    audio_service.answer_question, temp_path, clean_prompt
                )
                res = {
                    "question": clean_prompt,
                    "answer": ask_resp.answer,
                    "confidence": ask_resp.confidence,
                    "transcript": ask_resp.transcript,
                    "detected_language": ask_resp.detected_language,
                    "relevant_segment": ask_resp.relevant_segment,
                }
                return res, ask_resp.model_name, ask_resp.answer
        else:
            tx_resp = await asyncio.to_thread(audio_service.transcribe, temp_path)
            res = {
                "transcript": tx_resp.transcript,
                "detected_language": tx_resp.detected_language,
                "duration_seconds": tx_resp.duration_seconds,
                "segments": [s.model_dump() for s in tx_resp.segments],
            }
            return res, tx_resp.model_name, tx_resp.transcript

    async def _handle_document(
        self,
        temp_path: Path,
        prompt: Optional[str],
        action: Optional[str],
        original_filename: Optional[str],
    ) -> Tuple[Dict[str, Any], str, str]:
        """Routes document requests to RAG search, summarization, or parsing."""
        clean_prompt = prompt.strip() if prompt else ""

        if clean_prompt:
            if any(term in clean_prompt.lower() for term in ["summarize", "summary", "overview", "key points"]):
                sum_resp = await asyncio.to_thread(
                    document_service.summarize_document, temp_path, original_filename=original_filename
                )
                res = {
                    "filename": sum_resp.filename,
                    "summary": sum_resp.summary,
                    "key_points": sum_resp.key_points,
                    "total_pages": sum_resp.total_pages,
                }
                return res, sum_resp.model_name, sum_resp.summary
            else:
                ask_resp = await asyncio.to_thread(
                    document_service.ask_document_question,
                    temp_path,
                    clean_prompt,
                    top_k=3,
                    original_filename=original_filename,
                )
                passages_text = "\n".join([p.content for p in ask_resp.supporting_passages])
                res = {
                    "question": clean_prompt,
                    "answer": ask_resp.answer,
                    "confidence": ask_resp.confidence,
                    "supporting_pages": ask_resp.supporting_pages,
                    "supporting_passages": [p.model_dump() for p in ask_resp.supporting_passages],
                    "context_text": passages_text,
                }
                return res, ask_resp.model_name, ask_resp.answer
        else:
            parse_resp = await asyncio.to_thread(
                document_service.parse_document, temp_path, original_filename=original_filename
            )
            full_text = "\n".join([p.text_snippet for p in parse_resp.page_contents])
            res = {
                "filename": parse_resp.filename,
                "total_pages": parse_resp.total_pages,
                "total_characters": parse_resp.total_characters,
                "page_contents": [p.model_dump() for p in parse_resp.page_contents],
                "is_scanned_pdf": parse_resp.is_scanned_pdf,
                "ocr_status": parse_resp.ocr_status,
                "metadata": parse_resp.metadata,
                "context_text": full_text[:4000],
            }
            response_text = f"Document '{parse_resp.filename}' successfully parsed across {parse_resp.total_pages} page(s)."
            return res, parse_resp.model_name, response_text

    async def _handle_text(
        self,
        prompt: Optional[str],
        text_input: Optional[str],
        session_context: Optional[str],
        action: Optional[str],
    ) -> Tuple[Dict[str, Any], str, str]:
        """Routes text or contextual conversation follow-up."""
        content = text_input.strip() if text_input else (prompt.strip() if prompt else "")
        if not content:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Request must contain a prompt, text_input, or an uploaded file.",
            )

        # Multi-turn contextual follow-up: if prompt is asked and we have session_context
        if prompt and session_context and text_input is None:
            analyze_req = TextAnalyzeRequest(text=session_context, question=prompt)
            analyze_resp = await asyncio.to_thread(text_service.analyze, analyze_req)
            res = {
                "answer": analyze_resp.answer,
                "keywords": analyze_resp.keywords,
                "context_referenced": True,
            }
            return res, "Contextual-NLPReasoner", analyze_resp.answer or "Processed contextual follow-up."

        if action == "summarize" or (prompt and "summarize" in prompt.lower() and len(content) > 100):
            sum_req = TextSummarizeRequest(text=content, max_length=150)
            sum_resp = await asyncio.to_thread(text_service.summarize, sum_req)
            res = {
                "summary": sum_resp.summary,
                "compression_ratio": sum_resp.compression_ratio,
                "original_characters": sum_resp.original_characters,
            }
            return res, sum_resp.model_name, sum_resp.summary
        else:
            analyze_req = TextAnalyzeRequest(text=content, question=prompt if text_input else None)
            analyze_resp = await asyncio.to_thread(text_service.analyze, analyze_req)
            res = {
                "explanation": analyze_resp.explanation,
                "keywords": analyze_resp.keywords,
                "important_info": analyze_resp.important_info,
                "rewritten_text": analyze_resp.rewritten_text,
                "answer": analyze_resp.answer,
                "word_count": analyze_resp.word_count,
            }
            return res, analyze_resp.model_name, analyze_resp.explanation


multimodal_router = MultimodalRouter()

