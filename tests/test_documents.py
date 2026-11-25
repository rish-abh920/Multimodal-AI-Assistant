import io
import pytest
import pymupdf as fitz
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)


def create_multipage_pdf_bytes() -> bytes:
    """Generate a clean 2-page PDF with distinct factual content on each page."""
    doc = fitz.open()

    page1 = doc.new_page(width=595, height=842)
    page1.insert_text(
        (50, 72),
        "Page 1: Project Apollo was the third United States human spaceflight program carried out by NASA.\n"
        "It succeeded in landing the first humans on the Moon in 1969.\n"
        "The project was initiated by President John F. Kennedy.",
        fontsize=12,
    )

    page2 = doc.new_page(width=595, height=842)
    page2.insert_text(
        (50, 72),
        "Page 2: Neil Armstrong became the first person to walk on the lunar surface on July 20, 1969.\n"
        "A total of twelve astronauts walked on the Moon during the Apollo program.\n"
        "The final lunar mission was Apollo 17 in December 1972.",
        fontsize=12,
    )

    pdf_bytes = doc.tobytes()
    doc.close()
    return pdf_bytes


def create_scanned_pdf_bytes() -> bytes:
    """Generate a PDF without a text layer to simulate a scanned document."""
    doc = fitz.open()
    doc.new_page(width=595, height=842)  # Blank page with zero text
    pdf_bytes = doc.tobytes()
    doc.close()
    return pdf_bytes


def create_sample_txt_bytes() -> bytes:
    """Generate a valid plain text document."""
    text = (
        "Quantum computing utilizes the principles of quantum mechanics to process information. "
        "Unlike classical bits which represent zero or one, quantum bits or qubits can exist in superposition. "
        "Qubits enable exponential computational parallelism for cryptographic and chemical simulation problems."
    )
    return text.encode("utf-8")


# -------------------------------------------------------------
# 1. Document Upload & Parsing Tests
# -------------------------------------------------------------

def test_document_upload_multipage_pdf():
    """Verify multi-page PDF parsing, page content extraction, and metadata."""
    pdf_bytes = create_multipage_pdf_bytes()
    files = {"file": ("apollo_mission.pdf", pdf_bytes, "application/pdf")}

    response = client.post("/api/v1/documents/upload", files=files)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["total_pages"] == 2
    assert data["total_characters"] > 100
    assert len(data["page_contents"]) == 2
    assert data["page_contents"][0]["page_number"] == 1
    assert data["page_contents"][1]["page_number"] == 2
    assert data["is_scanned_pdf"] is False


def test_document_upload_txt():
    """Verify TXT file parsing."""
    txt_bytes = create_sample_txt_bytes()
    files = {"file": ("quantum.txt", txt_bytes, "text/plain")}

    response = client.post("/api/v1/documents/upload", files=files)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["total_pages"] == 1
    assert data["file_type"] == "TXT"


def test_document_upload_scanned_pdf():
    """Verify that image-only scanned PDFs are identified and OCR status is reported."""
    scanned_bytes = create_scanned_pdf_bytes()
    files = {"file": ("scanned_invoice.pdf", scanned_bytes, "application/pdf")}

    response = client.post("/api/v1/documents/upload", files=files)
    assert response.status_code == 200
    data = response.json()
    assert data["is_scanned_pdf"] is True
    assert "ocr required" in data["ocr_status"].lower()


# -------------------------------------------------------------
# 2. Document Summarization Tests
# -------------------------------------------------------------

def test_document_summarize():
    """Verify executive summary and key points extraction from multi-page document."""
    pdf_bytes = create_multipage_pdf_bytes()
    files = {"file": ("apollo_mission.pdf", pdf_bytes, "application/pdf")}

    response = client.post("/api/v1/documents/summarize", files=files)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["total_pages"] == 2
    assert "summary" in data
    assert len(data["summary"]) > 20
    assert "key_points" in data
    assert len(data["key_points"]) >= 1


# -------------------------------------------------------------
# 3. Document Question Answering with Page Citations Tests
# -------------------------------------------------------------

def test_document_ask_with_page_citation():
    """Verify RAG answers question correctly and returns page reference."""
    pdf_bytes = create_multipage_pdf_bytes()
    files = {"file": ("apollo_mission.pdf", pdf_bytes, "application/pdf")}
    data = {"question": "Who was the first person to walk on the lunar surface?"}

    response = client.post("/api/v1/documents/ask", files=files, data=data)
    assert response.status_code == 200
    res = response.json()
    assert res["success"] is True
    assert "armstrong" in res["answer"].lower()
    assert 2 in res["supporting_pages"]  # Content was explicitly on Page 2!
    assert res["confidence"] > 0.5
    assert len(res["supporting_passages"]) > 0


def test_document_ask_ungrounded_rejection():
    """Verify that questions not in the document are rejected without hallucination."""
    pdf_bytes = create_multipage_pdf_bytes()
    files = {"file": ("apollo_mission.pdf", pdf_bytes, "application/pdf")}
    data = {"question": "What is the recipe for chocolate chip cookies?"}

    response = client.post("/api/v1/documents/ask", files=files, data=data)
    assert response.status_code == 200
    res = response.json()
    assert res["success"] is True
    assert "not mentioned" in res["answer"].lower() or "cannot be answered" in res["answer"].lower()
    assert len(res["supporting_pages"]) == 0


# -------------------------------------------------------------
# 4. Error Handling and Edge Cases
# -------------------------------------------------------------

def test_empty_document_rejection():
    """Verify 0-byte document returns 400 Bad Request."""
    files = {"file": ("empty.pdf", b"", "application/pdf")}
    response = client.post("/api/v1/documents/upload", files=files)
    assert response.status_code == 400


def test_unsupported_document_format():
    """Verify unsupported extensions return 415."""
    files = {"file": ("data.csv", b"a,b,c", "text/csv")}
    response = client.post("/api/v1/documents/upload", files=files)
    assert response.status_code == 415


def test_empty_document_question():
    """Verify empty question on /ask returns 400 or 422."""
    pdf_bytes = create_multipage_pdf_bytes()
    files = {"file": ("apollo.pdf", pdf_bytes, "application/pdf")}
    data = {"question": "   "}

    response = client.post("/api/v1/documents/ask", files=files, data=data)
    assert response.status_code in [400, 422]

