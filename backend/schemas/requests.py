from pydantic import BaseModel, Field
from typing import Optional, Literal


class TextSummarizeRequest(BaseModel):
    """Payload for text summarization endpoint."""
    text: str = Field(..., min_length=10, max_length=100000, description="Source text to summarize")
    max_length: Optional[int] = Field(150, ge=20, le=1000, description="Maximum token length of summary")
    min_length: Optional[int] = Field(30, ge=10, le=500, description="Minimum token length of summary")


class TextAnalyzeRequest(BaseModel):
    """Payload for comprehensive text intelligence, QA, explanation, and rewriting."""
    text: str = Field(..., min_length=5, max_length=100000, description="Source text to analyze")
    question: Optional[str] = Field(None, max_length=1000, description="Optional question to answer based on text")
    rewrite_style: Optional[str] = Field("concise", description="Style for rewriting: 'concise', 'formal', 'bullet'")


# Compatibility alias
class TextAnalysisRequest(TextAnalyzeRequest):
    pass


class DocumentQueryRequest(BaseModel):
    """Payload for document question answering."""
    query: str = Field(..., min_length=2, max_length=1000, description="Question about the document")
    top_k: Optional[int] = Field(3, ge=1, le=10, description="Number of top relevant chunks to retrieve")
