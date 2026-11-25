# Text & Document Understanding API Documentation

This module provides NLP text analytics and PyMuPDF + SentenceTransformers Retrieval-Augmented Generation (RAG) for documents.

---

## Module A: Text Intelligence

### 1. `POST /api/v1/text/summarize`
Generates concise, representative summaries from paragraphs or long text blocks.

**Request Body (`application/json`):**
```json
{
  "text": "Machine learning models are trained on large datasets to recognize complex patterns. These models are widely deployed in healthcare, finance, and autonomous vehicles. Continuous monitoring is essential to ensure fairness and reliability in real-world systems.",
  "max_length": 150
}
```

**Response (`200 OK`):**
```json
{
  "success": true,
  "summary": "Machine learning models are trained on large datasets to recognize complex patterns. These models are widely deployed in healthcare, finance, and autonomous vehicles.",
  "original_characters": 245,
  "summary_characters": 168,
  "compression_ratio": 0.69,
  "processing_time": 0.005,
  "model_name": "HybridNLP-Summarizer"
}
```

### 2. `POST /api/v1/text/analyze`
Extracts key topical keywords, factual statements, numerical entities, semantic explanation, stylistic text rewriting (`concise`, `formal`, `bullet`), and answers questions grounded strictly in the text.

**Request Body (`application/json`):**
```json
{
  "text": "In 2026, enterprise AI adoption grew by 42 percent across 10,000 global organizations. Multimodal assistants replaced legacy text-only bots.",
  "question": "What percentage did enterprise AI adoption grow?",
  "rewrite_style": "bullet"
}
```

**Response (`200 OK`):**
```json
{
  "success": true,
  "keywords": ["Adoption", "Enterprise", "Percent", "Assistants"],
  "important_info": ["In 2026, enterprise AI adoption grew by 42 percent across 10,000 global organizations."],
  "explanation": "The passage focuses on Adoption, Enterprise, Percent. Specifically, it explains that in 2026, enterprise ai adoption grew by 42 percent across 10,000 global organizations. It provides contextual analysis across 2 key statement(s).",
  "rewritten_text": "- In 2026, enterprise AI adoption grew by 42 percent across 10,000 global organizations.\n- Multimodal assistants replaced legacy text-only bots.",
  "answer": "According to the text: \"In 2026, enterprise AI adoption grew by 42 percent across 10,000 global organizations.\"",
  "word_count": 21,
  "processing_time": 0.006,
  "model_name": "HybridNLP-IntelligenceEngine"
}
```

---

## Module B: Document Understanding (RAG)

### Supported Formats & Extraction
- **PDF**: Handled by C-based PyMuPDF (`fitz`), preserving page numbers, structure, and metadata.
- **TXT**: Handled via UTF-8 streaming reader.
- **Scanned PDF Detection**: Evaluates character density across pages; if characters < 20 across all pages, flags `is_scanned_pdf: true` and alerts `OCR required`.

### 1. `POST /api/v1/documents/upload`
Uploads document and extracts page-wise text content and layout metadata.

```bash
curl -X POST "http://127.0.0.1:8000/api/v1/documents/upload" \
  -H "accept: application/json" \
  -H "Content-Type: multipart/form-data" \
  -F "file=@annual_report.pdf;type=application/pdf"
```

### 2. `POST /api/v1/documents/summarize`
Generates an executive overview and key points from multi-page documents.

```bash
curl -X POST "http://127.0.0.1:8000/api/v1/documents/summarize" \
  -F "file=@annual_report.pdf;type=application/pdf"
```

### 3. `POST /api/v1/documents/ask`
Performs vector semantic search using `sentence-transformers/all-MiniLM-L6-v2` dense embeddings and cosine similarity. Returns answers with specific supporting page numbers and passages.

```bash
curl -X POST "http://127.0.0.1:8000/api/v1/documents/ask" \
  -F "file=@apollo_history.pdf;type=application/pdf" \
  -F "question=Who was the first person to walk on the lunar surface?"
```

**Response (`200 OK`):**
```json
{
  "success": true,
  "question": "Who was the first person to walk on the lunar surface?",
  "answer": "According to page(s) 2: \"Neil Armstrong became the first person to walk on the lunar surface on July 20, 1969.\"",
  "confidence": 0.88,
  "supporting_pages": [2],
  "supporting_passages": [
    {
      "page_number": 2,
      "chunk_index": 1,
      "similarity_score": 0.812,
      "content": "Neil Armstrong became the first person to walk on the lunar surface on July 20, 1969."
    }
  ],
  "processing_time": 0.08,
  "model_name": "SentenceTransformers RAG (all-MiniLM-L6-v2)"
}
```

