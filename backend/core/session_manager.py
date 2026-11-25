import time
import uuid
from typing import Dict, List, Any, Optional
from pydantic import BaseModel, Field


class ConversationTurn(BaseModel):
    turn_id: str = Field(default_factory=lambda: str(uuid.uuid4())[:8])
    timestamp: float = Field(default_factory=time.time)
    role: str  # "user" or "assistant"
    modality: str  # "image", "audio", "text", "document", "multimodal"
    prompt: Optional[str] = None
    response_text: str
    metadata: Dict[str, Any] = {}


class SessionData(BaseModel):
    session_id: str
    created_at: float = Field(default_factory=time.time)
    last_accessed: float = Field(default_factory=time.time)
    history: List[ConversationTurn] = []
    last_context: Optional[str] = None  # Text from last doc/image/audio
    last_modality: Optional[str] = None


class SessionManager:
    """
    In-memory isolated session store with bounded history and TTL expiration.
    Guarantees strict data isolation between concurrent users and sessions.
    """

    def __init__(self, max_history_per_session: int = 10, ttl_seconds: int = 3600):
        self._sessions: Dict[str, SessionData] = {}
        self.max_history = max_history_per_session
        self.ttl = ttl_seconds

    def get_or_create_session(self, session_id: Optional[str] = None) -> SessionData:
        """Retrieves existing session or instantiates a fresh isolated session."""
        self.cleanup_expired()

        if not session_id or session_id not in self._sessions:
            new_id = session_id if (session_id and len(session_id) >= 6) else str(uuid.uuid4())
            session = SessionData(session_id=new_id)
            self._sessions[new_id] = session
            return session

        session = self._sessions[session_id]
        session.last_accessed = time.time()
        return session

    def add_turn(
        self,
        session_id: str,
        role: str,
        modality: str,
        response_text: str,
        prompt: Optional[str] = None,
        context_data: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> None:
        """Appends a new turn to session history, enforcing maximum history length."""
        session = self.get_or_create_session(session_id)
        turn = ConversationTurn(
            role=role,
            modality=modality,
            prompt=prompt,
            response_text=response_text,
            metadata=metadata or {},
        )
        session.history.append(turn)

        # Bound history to prevent memory expansion
        if len(session.history) > self.max_history:
            session.history = session.history[-self.max_history :]

        if context_data:
            session.last_context = context_data
        session.last_modality = modality
        session.last_accessed = time.time()

    def get_history(self, session_id: str) -> List[Dict[str, Any]]:
        """Returns sanitized historical turns for a specific session."""
        if session_id not in self._sessions:
            return []
        session = self._sessions[session_id]
        session.last_accessed = time.time()
        return [t.model_dump() for t in session.history]

    def clear_session(self, session_id: str) -> bool:
        """Deletes session and frees associated memory."""
        if session_id in self._sessions:
            del self._sessions[session_id]
            return True
        return False

    def cleanup_expired(self) -> None:
        """Prunes stale sessions older than TTL."""
        now = time.time()
        expired_keys = [
            sid for sid, s in self._sessions.items() if (now - s.last_accessed) > self.ttl
        ]
        for sid in expired_keys:
            del self._sessions[sid]


# Global session manager instance
session_manager = SessionManager()

