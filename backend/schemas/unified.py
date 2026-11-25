import uuid
from typing import Dict, Any, Optional, Literal
from pydantic import BaseModel, Field


class UnifiedResponse(BaseModel):
    """
    Standardized response envelope across all multimodal workflows.
    Ensures consistent serialization for the frontend UI.
    """
    request_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    session_id: str
    modality: Literal["image", "audio", "text", "document", "multimodal"]
    success: bool = True
    result: Dict[str, Any]
    model_name: str
    processing_time: float
    error: Optional[str] = None
    conversation_turn: int = 1

