from pathlib import Path
from typing import Optional
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, status
from backend.core.config import settings
from backend.utils.file_validation import (
    validate_uploaded_file,
    save_temporary_file,
    cleanup_temporary_file,
)
from backend.services.document_service import document_service
from backend.schemas.responses import (
    DocumentUploadResponse,
    DocumentSummarizeResponse,
    DocumentAskResponse,
    DocumentExtractResponse,
    DocumentQueryResponse,
)
from backend.utils.logging import logger

router = APIRouter(tags=["Document Understanding"])


# -------------------------------------------------------------
# Core Document Intelligence Endpoints
# -------------------------------------------------------------

@router.post("/documents/upload", response_model=DocumentUploadResponse)
@router.post("/document/upload", response_model=DocumentUploadResponse)
async def upload_document(file: UploadFile = File(...)):
    """
    Upload and parse PDF or TXT documents.
    Extracts structure, metadata, page-wise content, and flags scanned PDFs.
    """
    await validate_uploaded_file(
        file=file,
        allowed_extensions=settings.ALLOWED_DOC_EXTENSIONS,
        allowed_mimes=settings.ALLOWED_DOC_MIMES,
        max_size_mb=settings.MAX_UPLOAD_DOC_SIZE_MB,
    )

    temp_path: Path = await save_temporary_file(file, prefix="doc_upload")
    try:
        response = document_service.parse_document(
            temp_path, original_filename=file.filename
        )
        return response
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error parsing document: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Document upload and parsing failed: {str(e)}",
        )
    finally:
        cleanup_temporary_file(temp_path)


@router.post("/documents/summarize", response_model=DocumentSummarizeResponse)
@router.post("/document/summarize", response_model=DocumentSummarizeResponse)
async def summarize_document(file: UploadFile = File(...)):
    """
    Generate an executive summary and key points from an uploaded PDF or TXT document.
    """
    await validate_uploaded_file(
        file=file,
        allowed_extensions=settings.ALLOWED_DOC_EXTENSIONS,
        allowed_mimes=settings.ALLOWED_DOC_MIMES,
        max_size_mb=settings.MAX_UPLOAD_DOC_SIZE_MB,
    )

    temp_path: Path = await save_temporary_file(file, prefix="doc_sum")
    try:
        response = document_service.summarize_document(
            temp_path, original_filename=file.filename
        )
        return response
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error summarizing document: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Document summarization failed: {str(e)}",
        )
    finally:
        cleanup_temporary_file(temp_path)


@router.post("/documents/ask", response_model=DocumentAskResponse)
@router.post("/document/ask", response_model=DocumentAskResponse)
async def ask_document_question(
    file: UploadFile = File(...),
    question: str = Form(..., min_length=2, max_length=1000),
    top_k: Optional[int] = Form(3),
):
    """
    RAG Semantic Search: Query a document using natural language.
    Retrieves relevant passages with SentenceTransformers and returns
    grounded answers with supporting page numbers.
    """
    if not question or not question.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The 'question' parameter cannot be empty.",
        )

    await validate_uploaded_file(
        file=file,
        allowed_extensions=settings.ALLOWED_DOC_EXTENSIONS,
        allowed_mimes=settings.ALLOWED_DOC_MIMES,
        max_size_mb=settings.MAX_UPLOAD_DOC_SIZE_MB,
    )

    temp_path: Path = await save_temporary_file(file, prefix="doc_ask")
    try:
        response = document_service.ask_document_question(
            temp_path,
            question=question.strip(),
            top_k=top_k or 3,
            original_filename=file.filename,
        )
        return response
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in document Q&A: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Document question answering failed: {str(e)}",
        )
    finally:
        cleanup_temporary_file(temp_path)


# -------------------------------------------------------------
# Backwards Compatibility Routes for Earlier Tests
# -------------------------------------------------------------

@router.post("/document/extract", response_model=DocumentExtractResponse)
async def extract_document_legacy(file: UploadFile = File(...)):
    await validate_uploaded_file(
        file=file,
        allowed_extensions=settings.ALLOWED_DOC_EXTENSIONS,
        allowed_mimes=settings.ALLOWED_DOC_MIMES,
        max_size_mb=settings.MAX_UPLOAD_DOC_SIZE_MB,
    )

    temp_path: Path = await save_temporary_file(file, prefix="doc_extract")
    try:
        response = document_service.extract_document(
            temp_path, original_filename=file.filename
        )
        return response
    finally:
        cleanup_temporary_file(temp_path)


@router.post("/document/query", response_model=DocumentQueryResponse)
async def query_document_legacy(
    file: UploadFile = File(...),
    query: str = Form(..., min_length=2, max_length=1000),
    top_k: Optional[int] = Form(3),
):
    await validate_uploaded_file(
        file=file,
        allowed_extensions=settings.ALLOWED_DOC_EXTENSIONS,
        allowed_mimes=settings.ALLOWED_DOC_MIMES,
        max_size_mb=settings.MAX_UPLOAD_DOC_SIZE_MB,
    )

    temp_path: Path = await save_temporary_file(file, prefix="doc_query")
    try:
        response = document_service.query_document(
            temp_path, query=query, top_k=top_k or 3, original_filename=file.filename
        )
        return response
    finally:
        cleanup_temporary_file(temp_path)
