import re
import time
from typing import List, Dict, Any, Optional, Tuple
from fastapi import HTTPException, status

from backend.core.config import settings
from backend.core.model_manager import model_manager
from backend.schemas.requests import TextSummarizeRequest, TextAnalyzeRequest
from backend.schemas.responses import TextSummarizeResponse, TextAnalyzeResponse
from backend.utils.logging import logger


class TextService:
    """
    Advanced NLP Intelligence Service.
    
    Provides:
    - Text summarization with length and density control.
    - Grounded Q&A against arbitrary text bodies.
    - Keyword extraction and entity/numeric fact identification.
    - Plain-language text explanation.
    - Stylistic text rewriting (concise, formal, bulleted).
    """

    def __init__(self) -> None:
        self.manager = model_manager

    def summarize(self, request: TextSummarizeRequest) -> TextSummarizeResponse:
        """
        Summarizes input text into a concise, representative overview.
        """
        start_time = time.time()
        text = request.text.strip()
        if len(text) < 10:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Input text must be at least 10 characters long.",
            )

        logger.info(f"Summarizing text of length {len(text)} characters")

        summary = self._generate_extractive_summary(
            text, max_sentences=3, max_length=request.max_length or 150
        )

        processing_time = round(time.time() - start_time, 3)
        compression_ratio = round(len(summary) / max(1, len(text)), 2)

        return TextSummarizeResponse(
            success=True,
            summary=summary,
            original_characters=len(text),
            summary_characters=len(summary),
            compression_ratio=compression_ratio,
            processing_time=processing_time,
            latency_ms=round(processing_time * 1000, 2),
            model_name="HybridNLP-Summarizer",
        )

    def analyze(self, request: TextAnalyzeRequest) -> TextAnalyzeResponse:
        """
        Performs multi-dimensional text intelligence:
        keywords, important info/facts, explanation, rewriting, and Q&A.
        """
        start_time = time.time()
        text = request.text.strip()
        if len(text) < 5:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Input text must be at least 5 characters long.",
            )

        words = re.findall(r"\b[A-Za-z0-9_-]+\b", text)
        word_count = len(words)

        # 1. Keywords
        keywords = self._extract_keywords(text)

        # 2. Important Information Extraction (facts, dates, figures)
        important_info = self._extract_important_info(text)

        # 3. Text Explanation
        explanation = self._explain_text(text, keywords)

        # 4. Text Rewriting
        rewritten = self._rewrite_text(text, style=request.rewrite_style or "concise")

        # 5. Question Answering (if query provided)
        answer: Optional[str] = None
        if request.question and request.question.strip():
            answer = self._answer_question(text, request.question.strip())

        processing_time = round(time.time() - start_time, 3)

        return TextAnalyzeResponse(
            success=True,
            keywords=keywords,
            important_info=important_info,
            explanation=explanation,
            rewritten_text=rewritten,
            answer=answer,
            word_count=word_count,
            processing_time=processing_time,
            latency_ms=round(processing_time * 1000, 2),
            model_name="HybridNLP-IntelligenceEngine",
        )

    def _generate_extractive_summary(
        self, text: str, max_sentences: int = 3, max_length: int = 150
    ) -> str:
        """Scores and selects the most salient sentences."""
        raw_sentences = [
            s.strip()
            for s in re.split(r"(?<=[.!?])\s+", text)
            if len(s.strip()) > 10
        ]
        if not raw_sentences:
            return text[:max_length]

        if len(raw_sentences) <= max_sentences:
            return " ".join(raw_sentences)

        # Compute term frequency
        stop_words = {
            "the", "and", "is", "in", "to", "of", "a", "it", "this", "that", "was",
            "for", "on", "with", "as", "at", "by", "from", "an", "be", "or", "are",
            "we", "you", "i", "they", "he", "she", "so", "but", "have", "has", "had"
        }
        word_freq: Dict[str, int] = {}
        for w in re.findall(r"\w+", text.lower()):
            if w not in stop_words and len(w) > 2:
                word_freq[w] = word_freq.get(w, 0) + 1

        def score_sentence(idx_sent: Tuple[int, str]) -> float:
            idx, s = idx_sent
            score = 0.0
            for w in re.findall(r"\w+", s.lower()):
                score += word_freq.get(w, 0)
            # Boost early sentences (lead bias)
            position_bias = 1.2 if idx == 0 else (1.1 if idx == 1 else 1.0)
            return (score / max(1, len(s.split()))) * position_bias

        scored = sorted(enumerate(raw_sentences), key=score_sentence, reverse=True)
        top_indices = sorted([idx for idx, _ in scored[:max_sentences]])

        selected = [raw_sentences[i] for i in top_indices]
        summary = " ".join(selected)
        if not summary.endswith("."):
            summary += "."
        return summary

    def _extract_keywords(self, text: str, top_k: int = 6) -> List[str]:
        """Identifies prominent topical terms."""
        stop_words = {
            "the", "and", "is", "in", "to", "of", "a", "it", "this", "that", "was",
            "for", "on", "with", "as", "at", "by", "from", "an", "be", "or", "are",
            "we", "you", "i", "they", "he", "she", "so", "but", "not", "all", "can"
        }
        freq: Dict[str, int] = {}
        # Also capture capitalized nouns/entities
        capitalized = re.findall(r"\b[A-Z][a-z]{3,}\b", text)
        for cap in capitalized:
            if cap.lower() not in stop_words:
                freq[cap] = freq.get(cap, 0) + 2

        words = re.findall(r"\b[a-zA-Z]{4,}\b", text.lower())
        for w in words:
            if w not in stop_words:
                freq[w] = freq.get(w, 0) + 1

        ranked = sorted(freq.keys(), key=lambda k: freq[k], reverse=True)
        return [r.title() for r in ranked[:top_k]]

    def _extract_important_info(self, text: str) -> List[str]:
        """Extracts key factual statements, numeric metrics, and dates."""
        facts: List[str] = []

        # Find sentences with numbers, metrics, or years
        for s in re.split(r"(?<=[.!?])\s+", text):
            clean_s = s.strip()
            if any(char.isdigit() for char in clean_s) or any(
                term in clean_s.lower()
                for term in ["increase", "revenue", "percent", "growth", "total", "achieved", "launched"]
            ):
                if 15 < len(clean_s) < 250:
                    facts.append(clean_s.rstrip(".") + ".")

        if not facts:
            # Fallback to first two informative sentences
            sentences = [s.strip() for s in text.split(".") if len(s.strip()) > 15]
            facts = [s + "." for s in sentences[:2]]

        return facts[:4]

    def _explain_text(self, text: str, keywords: List[str]) -> str:
        """Synthesizes high-level semantic explanation of text purpose."""
        sentences = [s.strip() for s in text.split(".") if s.strip()]
        first_clause = sentences[0] if sentences else text[:80]
        topic = ", ".join(keywords[:3]) if keywords else "the provided subject matter"
        return (
            f"The passage focuses on {topic}. Specifically, it explains that {first_clause.lower() if first_clause else ''}. "
            f"It provides contextual analysis across {len(sentences)} key statement(s)."
        )

    def _rewrite_text(self, text: str, style: str = "concise") -> str:
        """Rewrites text into different target registers."""
        sentences = [s.strip() for s in re.split(r"(?<=[.!?])\s+", text) if s.strip()]
        if not sentences:
            return text

        if style == "bullet":
            return "\n".join(f"- {s.rstrip('.')}." for s in sentences[:4])
        elif style == "formal":
            combined = " Furthermore, ".join(s.rstrip(".") for s in sentences[:3])
            return f"It is formally established that {combined.lower()}."
        else:  # concise
            return self._generate_extractive_summary(text, max_sentences=2)

    def _answer_question(self, text: str, question: str) -> str:
        """Answers a question grounded strictly in provided text."""
        q_words = set(re.findall(r"\w+", question.lower()))
        stop_words = {
            "what", "who", "where", "when", "why", "how", "which", "is", "was", "were",
            "are", "been", "being", "be", "did", "do", "does", "had", "have", "has",
            "the", "a", "an", "in", "on", "at", "to", "for", "of", "and", "or", "by", "with", "it", "this", "that"
        }
        keywords = q_words - stop_words
        if not keywords:
            keywords = q_words

        sentences = [s.strip() for s in re.split(r"(?<=[.!?])\s+", text) if s.strip()]
        best_sentence = None
        best_score = 0.0

        for s in sentences:
            s_words = set(re.findall(r"\w+", s.lower()))
            overlap = len(keywords.intersection(s_words))
            score = overlap / max(1, len(keywords))
            if score > best_score:
                best_score = score
                best_sentence = s

        if best_sentence and best_score >= 0.25:
            return f"According to the text: \"{best_sentence.rstrip('.')}.\""
        else:
            return "The question cannot be answered from the provided text as the topic is not mentioned."


text_service = TextService()
