import os
import re
import time
from pathlib import Path
from typing import List, Dict, Any, Optional, Tuple
import numpy as np
import pymupdf as fitz
from fastapi import HTTPException, status

from backend.core.config import settings
from backend.core.model_manager import model_manager
from backend.schemas.responses import (
    DocumentUploadResponse,
    DocumentSummarizeResponse,
    DocumentAskResponse,
    PageContent,
    SupportingPassage,
    DocumentExtractResponse,
    DocumentQueryResponse,
)
from backend.utils.logging import logger


class DocumentChunk:
    """Represents a text chunk bound to a specific document page."""
    def __init__(self, page_number: int, chunk_index: int, text: str):
        self.page_number = page_number
        self.chunk_index = chunk_index
        self.text = text


class DocumentService:
    """
    Intelligent Document Understanding & Semantic RAG Service.
    
    Provides:
    - PyMuPDF text & page-wise extraction for PDF & TXT.
    - Scanned PDF detection (OCR required flagging).
    - Chunking & dense vector indexing via SentenceTransformers (all-MiniLM-L6-v2).
    - Vector semantic search with cosine similarity.
    - Grounded Q&A with supporting page references without hallucination.
    """

    def __init__(self) -> None:
        self.manager = model_manager

    def parse_document(
        self, doc_path: Path, original_filename: Optional[str] = None
    ) -> DocumentUploadResponse:
        """
        Parses PDF or TXT document, extracting metadata and page-by-page text.
        Detects scanned PDFs where OCR is required.
        """
        start_time = time.time()
        display_name = original_filename or doc_path.name
        self._validate_file(doc_path)

        logger.info(f"Parsing document: {display_name} (Format: {doc_path.suffix.lower()})")

        file_type = doc_path.suffix.lstrip(".").lower()
        page_contents: List[PageContent] = []
        doc_metadata: Dict[str, Any] = {}
        total_chars = 0
        is_scanned = False
        ocr_status = "Not required (text layer present)"

        try:
            if file_type == "pdf":
                doc = fitz.open(doc_path)
                doc_metadata = {k: str(v) for k, v in (doc.metadata or {}).items() if v}
                total_pages = len(doc)
                if total_pages > settings.MAX_DOCUMENT_PAGES:
                    doc.close()
                    raise HTTPException(
                        status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                        detail=(
                            f"PDF contains {total_pages} pages, exceeding the limit of "
                            f"{settings.MAX_DOCUMENT_PAGES} pages."
                        ),
                    )

                for page_idx in range(total_pages):
                    page = doc[page_idx]
                    page_text = page.get_text("text").strip()
                    char_count = len(page_text)
                    total_chars += char_count

                    snippet = page_text[:200].replace("\n", " ")
                    if len(page_text) > 200:
                        snippet += "..."

                    page_contents.append(
                        PageContent(
                            page_number=page_idx + 1,
                            character_count=char_count,
                            text_snippet=snippet or "(Empty or image-only page)",
                        )
                    )
                doc.close()

                # Scanned PDF check: multiple pages with zero or near-zero extractable text
                if total_chars < 20 and total_pages > 0:
                    is_scanned = True
                    ocr_status = "OCR required: Document appears to be a scanned image with no extractable text layer."

            else:  # plain text
                with open(doc_path, "r", encoding="utf-8", errors="ignore") as f:
                    full_text = f.read().strip()

                total_chars = len(full_text)
                total_pages = 1
                snippet = full_text[:200].replace("\n", " ") + ("..." if len(full_text) > 200 else "")
                page_contents.append(
                    PageContent(
                        page_number=1,
                        character_count=total_chars,
                        text_snippet=snippet or "(Empty text document)",
                    )
                )

            processing_time = round(time.time() - start_time, 3)

            return DocumentUploadResponse(
                success=True,
                filename=display_name,
                file_type=file_type.upper(),
                total_pages=total_pages,
                total_characters=total_chars,
                page_contents=page_contents,
                metadata=doc_metadata,
                is_scanned_pdf=is_scanned,
                ocr_status=ocr_status,
                processing_time=processing_time,
                model_name="PyMuPDF-LayoutExtractor",
            )

        except HTTPException:
            raise
        except fitz.FileDataError as e:
            logger.error(f"Malformed PDF file: {e}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Malformed or unreadable PDF file. File structure could not be parsed.",
            )
        except Exception as e:
            logger.error(f"Error parsing document: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Document parsing error: {str(e)}",
            )

    def summarize_document(
        self, doc_path: Path, original_filename: Optional[str] = None
    ) -> DocumentSummarizeResponse:
        """
        Extracts full document text and generates an executive summary and key points.
        """
        start_time = time.time()
        display_name = original_filename or doc_path.name
        parsed = self.parse_document(doc_path, original_filename=display_name)

        if parsed.is_scanned_pdf or parsed.total_characters == 0:
            return DocumentSummarizeResponse(
                success=True,
                filename=display_name,
                total_pages=parsed.total_pages,
                summary="Cannot summarize: document is scanned or contains no extractable text.",
                key_points=["Scanned image document requiring OCR."],
                processing_time=round(time.time() - start_time, 3),
                latency_ms=round((time.time() - start_time) * 1000, 2),
                model_name="PyMuPDF + NLPAnalyzer",
            )

        full_text = self._get_full_text(doc_path)
        sentences = [
            s.strip()
            for s in re.split(r"(?<=[.!?])\s+", full_text)
            if len(s.strip()) > 15
        ]

        if not sentences:
            summary = full_text[:200]
            key_points = [full_text[:100]]
        else:
            summary = " ".join(sentences[:3])
            key_points = [f"{s.rstrip('.')}." for s in sentences[:4]]

        processing_time = round(time.time() - start_time, 3)
        return DocumentSummarizeResponse(
            success=True,
            filename=display_name,
            total_pages=parsed.total_pages,
            summary=summary,
            key_points=key_points,
            processing_time=processing_time,
            latency_ms=round(processing_time * 1000, 2),
            model_name="PyMuPDF + NLPAnalyzer",
        )

    def ask_document_question(
        self,
        doc_path: Path,
        question: str,
        top_k: int = 3,
        original_filename: Optional[str] = None,
    ) -> DocumentAskResponse:
        """
        RAG Question Answering:
        1. Chunks document with page tracking.
        2. Encodes chunks via SentenceTransformers (all-MiniLM-L6-v2).
        3. Ranks relevant passages using vector cosine similarity.
        4. Synthesizes answers with page citations.
        5. Explicitly rejects ungrounded questions.
        """
        start_time = time.time()
        clean_q = question.strip() if question else ""
        if not clean_q:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="The 'question' parameter cannot be empty.",
            )

        parsed = self.parse_document(doc_path, original_filename=original_filename)
        if parsed.is_scanned_pdf or parsed.total_characters == 0:
            return DocumentAskResponse(
                success=True,
                question=clean_q,
                answer="Cannot answer: the document has no extractable text or is a scanned image requiring OCR.",
                confidence=0.0,
                supporting_pages=[],
                supporting_passages=[],
                processing_time=round(time.time() - start_time, 3),
                model_name="SentenceTransformers RAG",
            )

        # 1. Create page-aware chunks
        chunks = self._chunk_document(doc_path)
        if not chunks:
            return DocumentAskResponse(
                success=True,
                question=clean_q,
                answer="Document does not contain sufficient text chunks.",
                confidence=0.0,
                supporting_pages=[],
                supporting_passages=[],
                processing_time=round(time.time() - start_time, 3),
                model_name="SentenceTransformers RAG",
            )

        # 2. Vector Embeddings
        embedder = self.manager.get_embedding_model()
        chunk_texts = [c.text for c in chunks]
        chunk_embeddings = embedder.encode(chunk_texts, convert_to_numpy=True)
        query_embedding = embedder.encode([clean_q], convert_to_numpy=True)[0]

        # 3. Vector Similarity Computation
        chunk_norms = np.linalg.norm(chunk_embeddings, axis=1)
        query_norm = np.linalg.norm(query_embedding)
        sims = np.dot(chunk_embeddings, query_embedding) / (chunk_norms * query_norm + 1e-9)

        # 4. Top-K Selection
        ranked_indices = np.argsort(sims)[::-1][:top_k]
        top_sim = float(sims[ranked_indices[0]])

        # Grounding threshold: if semantic similarity is too weak, reject answer
        if top_sim < 0.28:
            return DocumentAskResponse(
                success=True,
                question=clean_q,
                answer="The question cannot be answered from the document because the relevant information is not mentioned in the text.",
                confidence=round(top_sim, 3),
                supporting_pages=[],
                supporting_passages=[],
                processing_time=round(time.time() - start_time, 3),
                model_name="SentenceTransformers RAG",
            )

        # Collect supporting passages and unique page numbers
        supporting_passages: List[SupportingPassage] = []
        pages_set = set()

        for idx in ranked_indices:
            score = float(sims[idx])
            if score >= 0.25:
                chunk = chunks[idx]
                pages_set.add(chunk.page_number)
                supporting_passages.append(
                    SupportingPassage(
                        page_number=chunk.page_number,
                        chunk_index=chunk.chunk_index,
                        similarity_score=round(score, 3),
                        content=chunk.text,
                    )
                )

        supporting_pages = sorted(list(pages_set))
        best_passage = supporting_passages[0].content
        answer = f"According to page(s) {', '.join(map(str, supporting_pages))}: \"{best_passage.strip()}\""

        processing_time = round(time.time() - start_time, 3)
        return DocumentAskResponse(
            success=True,
            question=clean_q,
            answer=answer,
            confidence=round(min(0.99, max(0.65, top_sim)), 3),
            supporting_pages=supporting_pages,
            supporting_passages=supporting_passages,
            processing_time=processing_time,
            latency_ms=round(processing_time * 1000, 2),
            model_name="SentenceTransformers RAG (all-MiniLM-L6-v2)",
        )

    # -------------------------------------------------------------
    # Document Internal Utilities
    # -------------------------------------------------------------

    def _validate_file(self, doc_path: Path) -> None:
        """Validates file existence and non-zero size."""
        if not doc_path.exists():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Document file not found on server.",
            )
        if doc_path.stat().st_size == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="The uploaded document file is empty (0 bytes).",
            )

    def _get_full_text(self, doc_path: Path) -> str:
        """Extracts complete plain text across all pages."""
        if doc_path.suffix.lower() == ".pdf":
            doc = fitz.open(doc_path)
            text_parts = [page.get_text("text") for page in doc]
            doc.close()
            return " ".join(text_parts).strip()
        else:
            with open(doc_path, "r", encoding="utf-8", errors="ignore") as f:
                return f.read().strip()

    def _chunk_document(self, doc_path: Path, chunk_size: int = 400) -> List[DocumentChunk]:
        """Splits document text into page-attributed passages."""
        chunks: List[DocumentChunk] = []
        chunk_idx = 0

        if doc_path.suffix.lower() == ".pdf":
            doc = fitz.open(doc_path)
            for page_num, page in enumerate(doc, start=1):
                page_text = page.get_text("text").strip()
                if not page_text:
                    continue
                sentences = re.split(r"(?<=[.!?])\s+", page_text)
                cur_chunk = ""
                for s in sentences:
                    if len(cur_chunk) + len(s) > chunk_size and cur_chunk:
                        chunks.append(DocumentChunk(page_num, chunk_idx, cur_chunk.strip()))
                        chunk_idx += 1
                        cur_chunk = s + " "
                    else:
                        cur_chunk += s + " "
                if cur_chunk.strip():
                    chunks.append(DocumentChunk(page_num, chunk_idx, cur_chunk.strip()))
                    chunk_idx += 1
            doc.close()
        else:
            with open(doc_path, "r", encoding="utf-8", errors="ignore") as f:
                text = f.read().strip()
            sentences = re.split(r"(?<=[.!?])\s+", text)
            cur_chunk = ""
            for s in sentences:
                if len(cur_chunk) + len(s) > chunk_size and cur_chunk:
                    chunks.append(DocumentChunk(1, chunk_idx, cur_chunk.strip()))
                    chunk_idx += 1
                    cur_chunk = s + " "
                else:
                    cur_chunk += s + " "
            if cur_chunk.strip():
                chunks.append(DocumentChunk(1, chunk_idx, cur_chunk.strip()))

        return chunks

    # -------------------------------------------------------------
    # Compatibility Methods for Part 2 Tests
    # -------------------------------------------------------------

    def extract_document(
        self, doc_path: Path, original_filename: Optional[str] = None
    ) -> DocumentExtractResponse:
        parsed = self.parse_document(doc_path, original_filename=original_filename)
        preview = (
            parsed.page_contents[0].text_snippet
            if parsed.page_contents
            else "No text content detected."
        )
        return DocumentExtractResponse(
            success=True,
            filename=parsed.filename,
            page_count=parsed.total_pages,
            metadata=parsed.metadata,
            preview=preview,
            latency_ms=parsed.processing_time * 1000,
        )

    def query_document(
        self, doc_path: Path, query: str, top_k: int = 3, original_filename: Optional[str] = None
    ) -> DocumentQueryResponse:
        res = self.ask_document_question(
            doc_path, question=query, top_k=top_k, original_filename=original_filename
        )
        passages = [
            {"page": p.page_number, "text": p.content, "score": p.similarity_score}
            for p in res.supporting_passages
        ]
        return DocumentQueryResponse(
            success=res.success,
            query=res.question,
            answer=res.answer,
            passages=passages,
            model_used=res.model_name,
            latency_ms=res.processing_time * 1000,
        )


document_service = DocumentService()
