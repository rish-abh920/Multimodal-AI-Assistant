import os
import time
import re
from pathlib import Path
from typing import List, Dict, Any, Optional, Tuple
from fastapi import HTTPException, status

from backend.core.config import settings
from backend.core.model_manager import model_manager
from backend.schemas.responses import (
    AudioTranscribeResponse,
    AudioSummarizeResponse,
    AudioAskResponse,
    AudioSegment,
)
from backend.utils.logging import logger


class AudioService:
    """
    Automatic Speech Recognition & Audio Intelligence Service.
    
    Provides:
    - Faster-Whisper CPU INT8 speech-to-text transcription.
    - Automatic spoken language identification.
    - Timestamped segment alignment.
    - Transcript summarization & key points extraction.
    - Grounded Q&A against spoken dialogue without hallucinations.
    """

    def __init__(self) -> None:
        self.manager = model_manager

    def transcribe(
        self, audio_path: Path, language: Optional[str] = None
    ) -> AudioTranscribeResponse:
        """
        Transcribes speech from audio file with timestamps and language detection.
        """
        start_time = time.time()
        self._validate_audio_file(audio_path)

        logger.info(
            f"Transcribing audio: {audio_path.name} | Requested language: {language or 'auto-detect'}"
        )

        try:
            model = self.manager.get_whisper_model()

            # Execute transcription (faster-whisper CTranslate2 int8)
            whisper_lang = language.strip() if language and language.strip() != "auto" else None
            segments_gen, info = model.transcribe(
                str(audio_path),
                language=whisper_lang,
                beam_size=1,  # Fast greedy decoding on CPU
                word_timestamps=False,
            )

            # Guard CPU resources against excessively long audio files prior to decoding all segments
            raw_duration = float(info.duration) if hasattr(info, "duration") and info.duration else 0.0
            if raw_duration > settings.MAX_AUDIO_DURATION_SECONDS:
                raise HTTPException(
                    status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                    detail=(
                        f"Audio duration ({raw_duration:.1f}s) exceeds maximum allowed limit "
                        f"of {settings.MAX_AUDIO_DURATION_SECONDS}s."
                    ),
                )

            # Consume generator to collect segments
            segments: List[AudioSegment] = []
            transcript_parts: List[str] = []

            for seg in segments_gen:
                clean_text = seg.text.strip()
                if clean_text:
                    segments.append(
                        AudioSegment(
                            start=round(seg.start, 2),
                            end=round(seg.end, 2),
                            text=clean_text,
                        )
                    )
                    transcript_parts.append(clean_text)

            full_transcript = " ".join(transcript_parts).strip()
            detected_lang = info.language or (language or "unknown")
            duration = round(info.duration, 2) if hasattr(info, "duration") else 0.0

            if not full_transcript:
                full_transcript = "(No intelligible speech detected in audio file)"

            processing_time = round(time.time() - start_time, 3)
            logger.info(
                f"Audio transcribed in {processing_time}s | Lang: {detected_lang} | "
                f"Duration: {duration}s | Segments: {len(segments)}"
            )

            return AudioTranscribeResponse(
                success=True,
                transcript=full_transcript,
                text=full_transcript,
                detected_language=detected_lang,
                language=detected_lang,
                duration_seconds=duration,
                segments=segments,
                processing_time=processing_time,
                latency_ms=round(processing_time * 1000, 2),
                model_name=f"faster-whisper-{settings.WHISPER_MODEL_SIZE}",
            )

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Inference error during audio transcription: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Speech recognition failed: {str(e)}",
            )

    def summarize(
        self, audio_path: Path, language: Optional[str] = None
    ) -> AudioSummarizeResponse:
        """
        Transcribes audio and extracts concise summary & structured key points.
        """
        start_time = time.time()
        tx_resp = self.transcribe(audio_path, language=language)

        transcript = tx_resp.transcript
        detected_lang = tx_resp.detected_language
        duration = tx_resp.duration_seconds

        if not tx_resp.segments or transcript == "(No intelligible speech detected in audio file)":
            summary = "No spoken dialogue was detected in the audio recording."
            key_points = ["Audio contains ambient noise, silence, or non-verbal sound."]
        else:
            summary, key_points = self._extract_summary_and_points(transcript, tx_resp.segments)

        processing_time = round(time.time() - start_time, 3)
        return AudioSummarizeResponse(
            success=True,
            transcript=transcript,
            detected_language=detected_lang,
            summary=summary,
            key_points=key_points,
            duration_seconds=duration,
            processing_time=processing_time,
            latency_ms=round(processing_time * 1000, 2),
            model_name=f"faster-whisper-{settings.WHISPER_MODEL_SIZE} + NLPAnalyzer",
        )

    def answer_question(
        self, audio_path: Path, question: str, language: Optional[str] = None
    ) -> AudioAskResponse:
        """
        Answers questions strictly grounded in the audio transcript.
        Avoids hallucinating information not present in the audio.
        """
        start_time = time.time()
        clean_q = question.strip() if question else ""
        if not clean_q:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="The 'question' parameter cannot be empty.",
            )

        tx_resp = self.transcribe(audio_path, language=language)
        transcript = tx_resp.transcript

        if not tx_resp.segments or transcript == "(No intelligible speech detected in audio file)":
            return AudioAskResponse(
                success=True,
                question=clean_q,
                answer="Cannot answer question: no intelligible spoken dialogue was detected in the audio.",
                confidence=0.0,
                relevant_segment=None,
                transcript=transcript,
                detected_language=tx_resp.detected_language,
                processing_time=round(time.time() - start_time, 3),
                model_name=f"faster-whisper-{settings.WHISPER_MODEL_SIZE}",
            )

        # Grounded semantic matching across segments
        answer, confidence, best_seg = self._match_question_to_transcript(clean_q, tx_resp.segments, transcript)

        processing_time = round(time.time() - start_time, 3)
        return AudioAskResponse(
            success=True,
            question=clean_q,
            answer=answer,
            confidence=round(confidence, 3),
            relevant_segment=best_seg,
            transcript=transcript,
            detected_language=tx_resp.detected_language,
            processing_time=processing_time,
            model_name=f"faster-whisper-{settings.WHISPER_MODEL_SIZE}",
        )

    def _validate_audio_file(self, audio_path: Path) -> None:
        """Ensures the audio file exists and has non-zero size."""
        if not audio_path.exists():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Audio file not found on server.",
            )
        if audio_path.stat().st_size == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="The uploaded audio file is empty (0 bytes).",
            )

    def _extract_summary_and_points(
        self, transcript: str, segments: List[AudioSegment]
    ) -> Tuple[str, List[str]]:
        """Extracts key points and structured summary from speech transcript."""
        # Split into sentences
        sentences = [
            s.strip()
            for s in re.split(r"(?<=[.!?])\s+", transcript)
            if len(s.strip()) > 10
        ]

        if not sentences:
            sentences = [s.text for s in segments if len(s.text) > 10]

        if not sentences:
            return transcript, [transcript]

        # Score sentences based on length and word uniqueness
        word_freq: Dict[str, int] = {}
        stop_words = {
            "the", "and", "is", "in", "to", "of", "a", "it", "this", "that", "was",
            "for", "on", "with", "as", "at", "by", "from", "an", "be", "or", "are",
            "we", "you", "i", "they", "he", "she", "so", "but"
        }
        words = re.findall(r"\w+", transcript.lower())
        for w in words:
            if w not in stop_words and len(w) > 2:
                word_freq[w] = word_freq.get(w, 0) + 1

        def score_sentence(sent: str) -> float:
            score = 0.0
            for w in re.findall(r"\w+", sent.lower()):
                score += word_freq.get(w, 0)
            return score / max(1, len(sent.split()))

        scored = sorted(sentences, key=score_sentence, reverse=True)
        top_sentences = scored[: min(3, len(scored))]

        # Preserve original chronological order for coherence
        top_in_order = [s for s in sentences if s in top_sentences]

        summary = " ".join(top_in_order)
        if not summary.endswith("."):
            summary += "."

        # Key points
        key_points = [f"{s.rstrip('.')}." for s in top_in_order]
        if not key_points:
            key_points = [f"Spoken dialogue: {transcript[:120]}..."]

        return summary, key_points

    def _match_question_to_transcript(
        self, question: str, segments: List[AudioSegment], full_transcript: str
    ) -> Tuple[str, float, Optional[str]]:
        """Matches a question to relevant transcript segments using lexical-semantic alignment."""
        q_words = set(re.findall(r"\w+", question.lower()))
        stop_words = {
            "what", "who", "where", "when", "why", "how", "which", "is", "was", "were",
            "are", "been", "being", "be", "did", "do", "does", "had", "have", "has",
            "the", "a", "an", "in", "on", "at", "to", "for", "of", "and", "or", "by", "with", "it", "this", "that"
        }
        q_keywords = q_words - stop_words

        if not q_keywords:
            q_keywords = q_words

        best_score = 0.0
        best_segment: Optional[AudioSegment] = None

        for seg in segments:
            seg_words = set(re.findall(r"\w+", seg.text.lower()))
            overlap = len(q_keywords.intersection(seg_words))
            score = overlap / max(1, len(q_keywords))
            if score > best_score:
                best_score = score
                best_segment = seg

        if best_segment and best_score >= 0.25:
            confidence = min(0.98, max(0.60, best_score))
            answer = f"According to the audio recording: \"{best_segment.text}\""
            relevant_seg = f"[{best_segment.start}s - {best_segment.end}s]: {best_segment.text}"
            return answer, confidence, relevant_seg
        else:
            return (
                "The question cannot be answered from the audio recording because the relevant topic is not mentioned in the transcript.",
                0.20,
                None,
            )


audio_service = AudioService()
