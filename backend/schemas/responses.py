from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional


class MemoryInfo(BaseModel):
    total_gb: float
    used_gb: float
    free_gb: float
    percent: float


class HardwareInfo(BaseModel):
    device: str
    cpu_cores: int
    cpu_threads: int
    cpu_percent: float
    memory: MemoryInfo
    cuda_available: bool
    torch_version: str


class HealthResponse(BaseModel):
    status: str = "healthy"
    timestamp: str
    version: str = "1.0.0"
    hardware: HardwareInfo


class ConfiguredModels(BaseModel):
    image_caption: str
    image_vqa: str
    audio_whisper: str
    text_summarization: str
    text_embedding: str


class StatusResponse(BaseModel):
    app_name: str
    environment: str
    active_device: str
    configured_models: ConfiguredModels
    loaded_models: List[str]
    max_concurrent_models: int
    memory_footprint_mb: float


class BaseProcessingResponse(BaseModel):
    success: bool = True
    latency_ms: float
    message: str = "Processed successfully"


class ImageCaptionResponse(BaseModel):
    success: bool = True
    image_description: str
    caption: Optional[str] = None
    processing_time: float
    latency_ms: Optional[float] = None
    model_name: str
    image_metadata: Optional[Dict[str, Any]] = None

    def model_post_init(self, __context: Any) -> None:
        if self.caption is None:
            self.caption = self.image_description
        if self.latency_ms is None:
            self.latency_ms = round(self.processing_time * 1000, 2)


class ImageAskResponse(BaseModel):
    success: bool = True
    question: str
    answer: str
    confidence: Optional[float] = None
    processing_time: float
    latency_ms: Optional[float] = None
    model_name: str

    def model_post_init(self, __context: Any) -> None:
        if self.latency_ms is None:
            self.latency_ms = round(self.processing_time * 1000, 2)


class ImageAnalyzeResponse(BaseModel):
    success: bool = True
    image_description: str
    scene_type: str
    key_elements: List[str] = []
    dominant_colors: List[str] = []
    image_metadata: Dict[str, Any]
    explanation: str
    processing_time: float
    model_name: str


# Backwards compatibility alias for Part 2 VQA
class ImageVQAResponse(BaseModel):
    success: bool = True
    question: str
    answer: str
    confidence: Optional[float] = None
    processing_time: float = 0.0
    latency_ms: Optional[float] = None
    model_used: str = "vilt"


class AudioSegment(BaseModel):
    start: float
    end: float
    text: str


class AudioTranscribeResponse(BaseModel):
    success: bool = True
    transcript: str
    text: Optional[str] = None
    detected_language: str
    language: Optional[str] = None
    duration_seconds: float
    segments: List[AudioSegment] = []
    processing_time: float
    latency_ms: Optional[float] = None
    model_name: str
    model_used: Optional[str] = None

    def model_post_init(self, __context: Any) -> None:
        if self.text is None:
            self.text = self.transcript
        if self.language is None:
            self.language = self.detected_language
        if self.latency_ms is None:
            self.latency_ms = round(self.processing_time * 1000, 2)
        if self.model_used is None:
            self.model_used = self.model_name


class AudioSummarizeResponse(BaseModel):
    success: bool = True
    transcript: str
    detected_language: str
    summary: str
    key_points: List[str] = []
    duration_seconds: float
    processing_time: float
    latency_ms: Optional[float] = None
    model_name: str

    def model_post_init(self, __context: Any) -> None:
        if self.latency_ms is None:
            self.latency_ms = round(self.processing_time * 1000, 2)


class AudioAskResponse(BaseModel):
    success: bool = True
    question: str
    answer: str
    confidence: Optional[float] = None
    relevant_segment: Optional[str] = None
    transcript: str
    detected_language: str
    processing_time: float
    latency_ms: Optional[float] = None
    model_name: str

    def model_post_init(self, __context: Any) -> None:
        if self.latency_ms is None:
            self.latency_ms = round(self.processing_time * 1000, 2)


class TextSummarizeResponse(BaseModel):
    success: bool = True
    summary: str
    original_characters: int
    summary_characters: int
    compression_ratio: float
    processing_time: float
    latency_ms: Optional[float] = None
    model_name: str
    model_used: Optional[str] = None

    def model_post_init(self, __context: Any) -> None:
        if self.latency_ms is None:
            self.latency_ms = round(self.processing_time * 1000, 2)
        if self.model_used is None:
            self.model_used = self.model_name


class TextAnalyzeResponse(BaseModel):
    success: bool = True
    keywords: List[str] = []
    important_info: List[str] = []
    explanation: str
    rewritten_text: str
    answer: Optional[str] = None
    word_count: int
    processing_time: float
    latency_ms: Optional[float] = None
    model_name: str

    def model_post_init(self, __context: Any) -> None:
        if self.latency_ms is None:
            self.latency_ms = round(self.processing_time * 1000, 2)


class PageContent(BaseModel):
    page_number: int
    character_count: int
    text_snippet: str


class DocumentUploadResponse(BaseModel):
    success: bool = True
    filename: str
    file_type: str
    total_pages: int
    total_characters: int
    page_contents: List[PageContent] = []
    metadata: Dict[str, Any] = {}
    is_scanned_pdf: bool = False
    ocr_status: str = "Not required (text layer present)"
    processing_time: float
    model_name: str


class DocumentSummarizeResponse(BaseModel):
    success: bool = True
    filename: str
    total_pages: int
    summary: str
    key_points: List[str] = []
    processing_time: float
    latency_ms: Optional[float] = None
    model_name: str

    def model_post_init(self, __context: Any) -> None:
        if self.latency_ms is None:
            self.latency_ms = round(self.processing_time * 1000, 2)


class SupportingPassage(BaseModel):
    page_number: int
    chunk_index: int
    similarity_score: float
    content: str
    text: Optional[str] = None

    def model_post_init(self, __context: Any) -> None:
        if self.text is None:
            self.text = self.content


class DocumentAskResponse(BaseModel):
    success: bool = True
    question: str
    answer: str
    confidence: float
    supporting_pages: List[int] = []
    supporting_passages: List[SupportingPassage] = []
    processing_time: float
    latency_ms: Optional[float] = None
    model_name: str

    def model_post_init(self, __context: Any) -> None:
        if self.latency_ms is None:
            self.latency_ms = round(self.processing_time * 1000, 2)


# Compatibility aliases for Part 2 tests
class DocumentExtractResponse(BaseModel):
    success: bool = True
    filename: str
    page_count: int
    metadata: Dict[str, Any] = {}
    preview: str
    latency_ms: float = 0.0


class DocumentQueryResponse(BaseModel):
    success: bool = True
    query: str
    answer: str
    passages: List[Dict[str, Any]] = []
    model_used: str = "semantic-rag"
    latency_ms: float = 0.0

