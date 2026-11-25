# Unified Multimodal API & Gateway Documentation

## 1. Architectural Overview

The **Unified Multimodal Gateway** (`/api/v1/chat`) serves as the central orchestration entrypoint for the Multimodal AI Assistant. Rather than requiring client applications to manually route queries across individual modality endpoints, the gateway:

1. **Classifies Input Modality**: Inspects incoming file headers, binary magic numbers, extensions, and text payloads to detect whether the user is sending an Image, Audio recording, Document (PDF/TXT), or pure Text query.
2. **Asynchronously Dispatches Inference**: Offloads CPU-intensive neural model execution to dedicated background worker threads (`asyncio.to_thread`) to guarantee the FastAPI `asyncio` event loop is never blocked.
3. **Throttles CPU Concurrency**: Enforces an `asyncio.Semaphore(2)` inference barrier to prevent host starvation and memory thrashing on 8 GB RAM machines.
4. **Maintains Multi-Turn Context & Session Memory**: Employs an in-memory, thread-safe `SessionManager` that isolates sessions, bounds conversation history (last 10 turns), and enables contextual follow-up questions referencing previously uploaded files.
5. **Normalizes Diverse Outputs**: Unifies all model inferences into a standard `UnifiedResponse` schema while preserving modality-specific diagnostic attributes (e.g. timestamps, confidence scores, page references).

```
                      +-----------------------------+
                      |   React Frontend / Client   |
                      +--------------+--------------+
                                     |
                                     v POST /api/v1/chat
                      +-----------------------------+
                      |       FastAPI Gateway       |
                      +--------------+--------------+
                                     |
                         [Modality Classifier]
                                     |
              +-------------+--------+--------+-------------+
              |             |                 |             |
              v             v                 v             v
       [Image Worker] [Audio Worker]   [Document RAG] [Text Worker]
        BLIP + ViLT    Whisper INT8     MiniLM-L6-v2    NLP Engine
              |             |                 |             |
              +-------------+--------+--------+-------------+
                                     |
                      +--------------v--------------+
                      |     Response Normalizer     |
                      |   + Session Context Store   |
                      +--------------+--------------+
                                     |
                                     v Unified JSON Contract
```

---

## 2. API Endpoints

### 2.1 Unified Multimodal Chat Endpoint
- **URL**: `/api/v1/chat`
- **Method**: `POST`
- **Content-Type**: `multipart/form-data`
- **Form Parameters**:
  - `file` (*optional*): Uploaded binary file (PNG, JPG, WebP, WAV, MP3, OGG, FLAC, M4A, PDF, TXT).
  - `prompt` (*optional*): Natural language question or instruction.
  - `text_input` (*optional*): Long-form text content for summarization or analysis.
  - `session_id` (*optional*): Client session identifier for multi-turn conversational context.
  - `action` (*optional*): Explicit operation override (`"auto"`, `"caption"`, `"ask"`, `"summarize"`, `"analyze"`). Default: `"auto"`.

#### Unified Response Schema (`UnifiedResponse`)
```json
{
  "request_id": "a5896712",
  "session_id": "session-user-123",
  "modality": "document",
  "success": true,
  "result": {
    "question": "What was the final Apollo mission?",
    "answer": "According to page(s) 1: \"Apollo 17 was the final mission of NASA's Apollo program.\"",
    "confidence": 0.94,
    "supporting_pages": [1],
    "supporting_passages": [
      {
        "page_number": 1,
        "chunk_index": 0,
        "similarity_score": 0.88,
        "content": "Apollo 17 was the final mission of NASA's Apollo program."
      }
    ]
  },
  "model_name": "SentenceTransformers RAG (all-MiniLM-L6-v2)",
  "processing_time": 0.082,
  "conversation_turn": 1,
  "error": null
}
```

---

### 2.2 Session History Endpoint
- **URL**: `/api/v1/chat/history/{session_id}`
- **Method**: `GET`
- **Description**: Returns chronological conversation turns for a given session.

#### Example Response
```json
{
  "session_id": "session-user-123",
  "turn_count": 2,
  "history": [
    {
      "turn_id": "9b12a8f4",
      "timestamp": 1798851600.12,
      "role": "user",
      "modality": "document",
      "prompt": "What was the final Apollo mission?",
      "response_text": "According to page(s) 1: \"Apollo 17 was the final mission of NASA's Apollo program.\"",
      "metadata": {
        "request_id": "a5896712",
        "model": "SentenceTransformers RAG (all-MiniLM-L6-v2)"
      }
    }
  ]
}
```

---

### 2.3 Clear Session Endpoint
- **URL**: `/api/v1/chat/clear/{session_id}`
- **Method**: `DELETE`
- **Description**: Removes active session memory and frees associated references.

---

## 3. Usage Examples

### 3.1 Image Question Answering via Unified Chat
```bash
curl -X POST "http://127.0.0.1:8000/api/v1/chat" \
  -F "file=@traffic.jpg;type=image/jpeg" \
  -F "prompt=What color is the traffic light?" \
  -F "session_id=session-abc"
```

### 3.2 Speech Transcription via Unified Chat
```bash
curl -X POST "http://127.0.0.1:8000/api/v1/chat" \
  -F "file=@meeting.wav;type=audio/wav" \
  -F "prompt=Transcribe and summarize" \
  -F "session_id=session-abc"
```

### 3.3 Document RAG via Unified Chat
```bash
curl -X POST "http://127.0.0.1:8000/api/v1/chat" \
  -F "file=@financial_report.pdf;type=application/pdf" \
  -F "prompt=What was the Q3 revenue growth?" \
  -F "session_id=session-abc"
```

### 3.4 Contextual Follow-Up (Without Re-uploading File)
```bash
curl -X POST "http://127.0.0.1:8000/api/v1/chat" \
  -F "prompt=Who was the lead author?" \
  -F "session_id=session-abc"
```

---

## 4. Concurrency & Memory Safety Guarantees

1. **CPU Throttling**: An `asyncio.Semaphore(2)` limits active model executions to 2 concurrent jobs, returning fast queue status or queuing smoothly.
2. **Dynamic Unloading**: The central `ModelManager` maintains an LRU cache capping loaded neural models at `MAX_LOADED_MODELS=2`, freeing memory automatically when switching modalities.
3. **Session Eviction**: Unused sessions are automatically purged after 1 hour (`TTL = 3600s`) or limited to 10 historical conversation turns.

