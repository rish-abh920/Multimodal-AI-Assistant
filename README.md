# Multimodal AI Assistant

An intelligent full-stack web application for **Image, Audio, Text, and Document Understanding** powered by specialized pretrained models, a FastAPI backend, and a React 19 + Vite frontend.

> **Architectural Transparency:** Rather than claiming to be a single monolith foundation model trained from scratch, this system operates as a **Multimodal AI Orchestrator** coordinating specialized pretrained models (BLIP, ViLT, faster-whisper INT8, SentenceTransformers, and HybridNLP) under a centralized LRU `ModelManager` and unified asynchronous gateway.

---

## 1. Project Overview

Modern workflows span screenshots, voice recordings, unstructured prose, and multi-page PDF documents. **Multimodal AI Assistant** unifies these four modalities behind a single responsive AI workspace, providing both dedicated modality studios and a multi-turn **Unified Omnimodal Chat Hub** (`/api/v1/chat`) with automatic modality routing, grounded citations, and strict CPU/RAM resource containment.

---

## 2. Problem Statement

Real-world users and engineers on consumer hardware (e.g., 8 GB RAM laptops without dedicated NVIDIA CUDA GPUs) face three key challenges when deploying multimodal AI:
1. Loading vision, speech, and embedding models simultaneously causes out-of-memory crashes.
2. Synchronous PyTorch inference blocks ASGI web servers, freezing UI health checks and concurrent requests.
3. Unconstrained retrieval and QA systems frequently hallucinate answers without page or timestamp provenance.

---

## 3. Project Objectives

- Support **Image**, **Audio**, **Text**, and **Document (PDF/TXT)** understanding from one cohesive React UI and REST API.
- Enforce **hardware-safe execution** via lazy loading, LRU model eviction (`MAX_LOADED_MODELS=2`), CPU thread caps (`CPU_NUM_THREADS=4`), and async worker offloading (`asyncio.Semaphore(2)` + `asyncio.to_thread`).
- Provide **verifiable grounded outputs** (PDF page citations, vector similarity scores, audio timestamp segments, VQA confidence scores) with explicit rejection thresholds for unsupported questions.
- Protect the server with binary magic-number validation, MIME verification, decompression-bomb pixel limits, duration/page caps, and UUID temp-file cleanup.

---

## 4. System Architecture

```text
+-------------------------------------------------------------------+
|                  React 19 + Vite Frontend (:5173)                 |
|  Landing | Dashboard | Image | Audio | Text | Docs | Omni Chat    |
+---------------------------------+---------------------------------+
                                  | Axios + Vite Reverse Proxy (/api, /health)
                                  v
+-------------------------------------------------------------------+
|                      FastAPI ASGI Server (:8000)                  |
|  CORS Guard | Global Exception Handlers | Live /health & /status  |
+---------------------------------+---------------------------------+
                                  |
         +------------------------+------------------------+
         |                                                 |
         v                                                 v
+-------------------------------+               +-------------------+
|   Modality REST Endpoints     |               | Unified Gateway   |
| /image/* /audio/* /text/*     |               | POST /api/v1/chat |
| /documents/*                  |               +---------+---------+
+---------------+---------------+                         |
                |                                         v
                |                         +-------------------------------+
                |                         | MultimodalRouter +            |
                |                         | SessionManager (10 turns/TTL) |
                |                         +---------------+---------------+
                +--------------------+--------------------+
                                     | asyncio.Semaphore(2) + to_thread
                                     v
+-------------------------------------------------------------------+
|             Specialized Services + Singleton ModelManager         |
|  [ImageService]    [AudioService]   [TextService] [DocumentService]
|  BLIP + ViLT-B32   Whisper INT8     HybridNLP     PyMuPDF + MiniLM|
|                LRU Cache (Max 2 Models in RAM) + gc.collect()     |
+-------------------------------------------------------------------+
```

---

## 5. Multimodal Capabilities

| Modality | Core Features |
| :--- | :--- |
| **Image Understanding** | Drag-and-drop upload (`JPG`, `JPEG`, `PNG`, `WEBP`, `BMP`), automated image resizing (`<= 1280px`) & decompression-bomb protection, BLIP image captioning, ViLT Visual Question Answering with confidence scores, dominant color & lighting extraction, and scene classification. |
| **Audio Understanding** | Upload (`WAV`, `MP3`, `M4A`, `FLAC`, `OGG`) or capture **live microphone audio** encoded to 16-bit PCM WAV in browser; quantized INT8 transcription, automatic language detection, timestamped segments, extractive speech summaries, and grounded transcript Q&A. |
| **Text Understanding** | Token/character-budgeted extractive summarization, keyword & factual statement extraction, plain-language explanation, stylistic rewriting (`concise`, `formal`, `bullet`), and grounded lexical Q&A. |
| **Document Understanding** | PyMuPDF layout parsing (`PDF`, `TXT`), page-by-page snippet preview, scanned/image-only PDF detection alerts, document summarization with key points, and dense vector similarity RAG with clickable page citations. |
| **Unified Omnimodal Chat** | Accepts any file type + prompt or plain-text follow-up under one `session_id`, tracks bounded multi-turn context (up to 10 turns, 1-hour TTL), and supports session history retrieval & deletion. |

---

## 6. Technology Stack

- **Frontend:** React 19, Vite 8, Axios, Lucide React, CSS3 (layered design tokens, 3D transforms, `IntersectionObserver` scroll reveals, `requestAnimationFrame` parallax, `oxlint`)
- **Backend:** FastAPI, Uvicorn, Pydantic v2, Python-Multipart, python-dotenv, psutil
- **AI / ML & Document Core:** PyTorch (CPU), Hugging Face Transformers, Accelerate, `faster-whisper` (CTranslate2 INT8), Sentence Transformers, PyMuPDF (`fitz`), Pillow, NumPy, Pandas
- **Testing & QA:** Pytest, `httpx`, custom benchmark & diagnostic scripts

---

## 7. Pretrained Model Details

| Role | Configured Model Identifier | Runtime Precision / Notes |
| :--- | :--- | :--- |
| **Image Captioning** | `Salesforce/blip-image-captioning-base` | PyTorch FP32 CPU (`eval()`, `num_beams=3`) |
| **Visual Question Answering** | `dandelin/vilt-b32-finetuned-vqa` | PyTorch FP32 CPU (`eval()`, softmax confidence) |
| **Speech Recognition (ASR)** | `faster-whisper-base` | CTranslate2 `int8` quantization (`cpu_threads=4`) |
| **Document Embeddings (RAG)** | `sentence-transformers/all-MiniLM-L6-v2` | 384-dim dense cosine similarity via NumPy |
| **Text Intelligence Core** | `HybridNLP` *(Extractive Scorer & Rewriter)* | Fast statistical TF/salience scoring (`google/flan-t5-small` loader is available in `ModelManager` for generative extension) |

---

## 8. Repository Structure

```text
Multimodel AI/
├── backend/
│   ├── api/                # FastAPI routers (image, audio, text, documents, unified)
│   ├── core/               # Settings (config.py), LRU ModelManager, SessionManager
│   ├── schemas/            # Pydantic v2 request/response/unified envelopes
│   ├── services/           # Inference & RAG pipelines + MultimodalRouter
│   ├── utils/              # Binary magic-byte validation, temp file cleanup, logging
│   └── main.py             # ASGI app, CORS, /health, /api/v1/status, exception handlers
├── frontend/
│   ├── src/
│   │   ├── api/            # Reusable Axios client & domain API modules
│   │   ├── components/     # Reusable UI (Card, Button, FileUploader, Loaders, Navbar, Sidebar)
│   │   ├── hooks/          # Motion, scroll-reveal & pointer parallax hooks
│   │   ├── pages/          # Landing, Dashboard, Image, Audio, Text, Document, Chat, About
│   │   ├── styles/         # CSS design tokens, animations, components, layout, pages
│   │   └── utils/          # Web Audio API 16-bit PCM WAV encoder
│   ├── index.html
│   ├── package.json
│   └── vite.config.js      # Proxies /api and /health to http://127.0.0.1:8000
├── tests/                  # 60 automated Pytest unit & integration tests
├── docs/                   # Per-modality REST API & architecture documentation
├── scripts/                # check_env.py, benchmark.py, start_dev.ps1
├── requirements.txt
├── .env.example
└── .gitignore
```

---

## 9. Installation Instructions

### Prerequisites
- **Python 3.11+**
- **Node.js 20+** and **npm 10+**

### Backend Setup (Windows PowerShell)
```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
```

### Frontend Setup
```powershell
cd frontend
npm install
cd ..
```

---

## 10. Running the Application

### Start Backend (`http://127.0.0.1:8000`)
```powershell
.\.venv\Scripts\python.exe -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
```
*(Interactive API Swagger docs at `http://127.0.0.1:8000/docs`.)*

### Start Frontend (`http://localhost:5173`)
```powershell
cd frontend
npm run dev
```
Or start both services together with:
```powershell
.\scripts\start_dev.ps1
```

---

## 11. API Endpoints

| Method | Endpoint | Purpose |
| :--- | :--- | :--- |
| `GET` | `/health` | Server health, CPU cores/threads, RAM usage, CUDA status |
| `GET` | `/api/v1/status` | Configured model IDs, resident LRU models, RSS footprint |
| `POST` | `/api/v1/image/caption` | Generate BLIP image description + dimensions/metadata |
| `POST` | `/api/v1/image/ask` | ViLT Visual Question Answering with confidence score |
| `POST` | `/api/v1/image/analyze` | Caption, scene category, key visual elements, color histogram |
| `POST` | `/api/v1/audio/transcribe` | Speech-to-text transcription, language detection & segments |
| `POST` | `/api/v1/audio/summarize` | Speech transcription + executive summary & key points |
| `POST` | `/api/v1/audio/ask` | Grounded transcript Q&A with timestamp citation |
| `POST` | `/api/v1/text/summarize` | Length-budgeted extractive text summarization |
| `POST` | `/api/v1/text/analyze` | Keywords, key statements, explanation, rewrite, Q&A |
| `POST` | `/api/v1/documents/upload` | Parse PDF/TXT, inspect page previews, flag scanned PDFs |
| `POST` | `/api/v1/documents/summarize` | Extract executive summary & key points across pages |
| `POST` | `/api/v1/documents/ask` | Semantic RAG Q&A returning page numbers & similarity chunks |
| `POST` | `/api/v1/chat` | Unified multimodal gateway with session memory |
| `GET` | `/api/v1/chat/history/{session_id}` | Fetch isolated session conversation turns |
| `DELETE` | `/api/v1/chat/session/{session_id}` | Clear and reclaim session memory |

Detailed request/response examples are documented in [`docs/`](docs/).

---

## 12. UI Workspaces Overview (Screens)

Once both servers are running, the React UI presents 8 responsive views:
1. **Landing Page:** 3D interactive Neural Core visualization connected to 4 modality nodes, scroll parallax orbs, pipeline walkthrough, and architecture specs.
2. **Dashboard Command Center:** Live CPU threads, RAM usage, LRU resident model count, activity log, and quick workspace launchers.
3. **Image AI Studio:** Drag-and-drop uploader, instant preview, BLIP captioner, ViLT VQA, color swatches, and scene classification tags.
4. **Audio AI Studio:** File uploader, **live WAV microphone capture**, audio playback scrubber, timestamped segment list, and speech Q&A.
5. **Text AI Studio:** Passage editor with presets, summary budget slider, style rewriter (`Concise` / `Formal` / `Bullet`), keyword tags, and grounded Q&A.
6. **Document AI (RAG) Studio:** PDF/TXT uploader, expandable page-by-page snippets, scanned PDF warning banner, and RAG answers with page citations.
7. **Chat History / Omnimodal Hub:** Continuous multi-turn conversation accepting attachments across all modalities with confirmation before session deletion.
8. **About Project:** Architectural data-flow diagram, active model manifest, and CPU optimization overview.

---

## 13. Testing & Benchmarks

### Run Automated Backend Suite (60 Tests)
```powershell
.\.venv\Scripts\python.exe -m pytest tests -v
```

### Run Frontend Lint & Production Build
```powershell
cd frontend
npm run lint
npm run build
```

### Run Environment Diagnostics & Empirical Latency Benchmark
```powershell
.\.venv\Scripts\python.exe scripts/check_env.py
.\.venv\Scripts\python.exe scripts/benchmark.py
```

---

## 14. Hardware Requirements

- **Verified Minimum / Baseline (Tested Host):** Intel Core (10 cores / 12 threads), **8 GB RAM** (`7.68 GB` usable), Windows 11, PyTorch `2.13.0+cpu` (no GPU required).
- **Recommended:** 16 GB+ RAM (allows increasing `MAX_LOADED_MODELS=4` to eliminate cross-modality LRU reload overhead) or CUDA-enabled NVIDIA GPU (`DEVICE=auto`).

---

## 15. Known Limitations

1. **CPU Inference Latency & LRU Thrashing:** With `MAX_LOADED_MODELS=2` on 8 GB RAM, switching sequentially across 3+ distinct neural modalities evicts cached weights and incurs a 1.3s–4.2s reload penalty.
2. **Extractive Text & Audio Q&A:** `TextService` and `AudioService` Q&A rely on TF/lexical keyword-overlap scoring rather than full generative seq2seq synthesis (`google/flan-t5-small` is loaded lazily via `ModelManager` but not yet invoked in `TextService`).
3. **Ephemeral In-Memory Vectors & Sessions:** `DocumentService` computes chunk embeddings per request rather than persisting an index on disk, and `SessionManager` stores conversation state in memory (cleared on server restart).
4. **Scanned PDF OCR Detection Only:** `DocumentService` detects image-only scanned PDFs cleanly, but does not ship a bundled Tesseract OCR engine to extract text from scanned bitmaps.
5. **No User Authentication / Rate Limiting:** Designed for local single-user or trusted internal usage without JWT auth or per-IP rate limiting.

---

## 16. Future Improvements

- Persist vector indexes (e.g., FAISS / Qdrant / SQLite-vec) across document queries by content hash to avoid re-embedding repeated files.
- Integrate `google/flan-t5-small` (or lightweight GGUF/ONNX generative model) as an optional generative synthesis stage for RAG and Text QA.
- Add optional OCR fallback (`pytesseract` or EasyOCR) when `is_scanned_pdf` is `True`.
- Back `SessionManager` with Redis or SQLite for durable multi-turn chat persistence.
- Add Server-Sent Events (SSE) streaming and user authentication/RBAC for multi-tenant cloud deployment.

