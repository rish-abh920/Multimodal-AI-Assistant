import io
import uuid
import pytest
from PIL import Image, ImageDraw
import pymupdf as fitz
from fastapi.testclient import TestClient
from backend.main import app
from tests.test_audio import generate_sapi_speech_bytes

client = TestClient(app)


def create_test_image_bytes() -> bytes:
    img = Image.new("RGB", (100, 100), color="white")
    draw = ImageDraw.Draw(img)
    draw.rectangle([20, 20, 80, 80], fill="red")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def create_test_pdf_bytes() -> bytes:
    doc = fitz.open()
    page1 = doc.new_page(width=595, height=842)
    page1.insert_text(
        (50, 72),
        "Apollo 11 was the spaceflight that first landed humans on the Moon.\n"
        "Commander Neil Armstrong and lunar module pilot Buzz Aldrin formed the American crew.\n"
        "Apollo 17 was the final mission of NASA's Apollo program.",
        fontsize=12,
    )
    b = doc.tobytes()
    doc.close()
    return b


# -------------------------------------------------------------
# 1. Unified Multimodal Processing Tests
# -------------------------------------------------------------

def test_unified_image_vqa():
    """Verify unified endpoint correctly classifies and answers image questions."""
    img_bytes = create_test_image_bytes()
    files = {"file": ("square.png", img_bytes, "image/png")}
    data = {
        "prompt": "What color is the shape?",
        "session_id": "test-session-img",
    }

    response = client.post("/api/v1/chat", files=files, data=data)
    assert response.status_code == 200
    res = response.json()

    assert res["success"] is True
    assert res["modality"] == "image"
    assert "request_id" in res
    assert "red" in res["result"]["answer"].lower()
    assert res["processing_time"] > 0


def test_unified_audio_transcription():
    """Verify unified endpoint handles audio input and speech summarization."""
    audio_bytes = generate_sapi_speech_bytes("Quantum computing represents a paradigm shift in data processing.")
    files = {"file": ("audio_clip.wav", audio_bytes, "audio/wav")}
    data = {
        "prompt": "Summarize this recording",
        "session_id": "test-session-aud",
    }

    response = client.post("/api/v1/chat", files=files, data=data)
    assert response.status_code == 200
    res = response.json()

    assert res["success"] is True
    assert res["modality"] == "audio"
    assert "quantum" in res["result"]["transcript"].lower()
    assert "summary" in res["result"]


def test_unified_document_rag():
    """Verify unified endpoint handles PDF input and returns page-cited answers."""
    pdf_bytes = create_test_pdf_bytes()
    files = {"file": ("apollo.pdf", pdf_bytes, "application/pdf")}
    data = {
        "prompt": "Who was the commander of Apollo 11?",
        "session_id": "test-session-doc",
    }

    response = client.post("/api/v1/chat", files=files, data=data)
    assert response.status_code == 200
    res = response.json()

    assert res["success"] is True
    assert res["modality"] == "document"
    assert "armstrong" in res["result"]["answer"].lower()
    assert 1 in res["result"]["supporting_pages"]


def test_unified_text_analysis():
    """Verify unified endpoint processes pure text with question answering."""
    data = {
        "text_input": "Photosynthesis is the process used by plants to convert sunlight into chemical energy.",
        "prompt": "What do plants convert sunlight into?",
        "session_id": "test-session-txt",
    }

    response = client.post("/api/v1/chat", data=data)
    assert response.status_code == 200
    res = response.json()

    assert res["success"] is True
    assert res["modality"] == "text"
    assert "chemical energy" in res["result"]["answer"].lower()


# -------------------------------------------------------------
# 2. Multi-turn Follow-up and Session Isolation Tests
# -------------------------------------------------------------

def test_multiturn_followup_and_isolation():
    """
    Verify:
    1. Turn 1 uploads document in Session A.
    2. Turn 2 asks follow-up referencing Session A without re-uploading file.
    3. Session B cannot access Session A's private context (strict data isolation).
    """
    session_a = f"session-a-{uuid.uuid4().hex[:6]}"
    session_b = f"session-b-{uuid.uuid4().hex[:6]}"

    # Session A, Turn 1: Upload document and ask
    pdf_bytes = create_test_pdf_bytes()
    files = {"file": ("apollo.pdf", pdf_bytes, "application/pdf")}
    data_t1 = {
        "prompt": "What was the final Apollo mission?",
        "session_id": session_a,
    }
    resp1 = client.post("/api/v1/chat", files=files, data=data_t1)
    assert resp1.status_code == 200
    assert "apollo 17" in resp1.json()["result"]["answer"].lower()

    # Session A, Turn 2: Follow-up question WITHOUT file
    data_t2 = {
        "prompt": "Who was the commander?",
        "session_id": session_a,
    }
    resp2 = client.post("/api/v1/chat", data=data_t2)
    assert resp2.status_code == 200
    res2 = resp2.json()
    assert res2["success"] is True
    assert res2["result"].get("context_referenced") is True
    assert "armstrong" in res2["result"]["answer"].lower()

    # Session B: Asks the same follow-up without any prior document upload
    data_b = {
        "prompt": "Who was the commander?",
        "session_id": session_b,
    }
    resp_b = client.post("/api/v1/chat", data=data_b)
    assert resp_b.status_code == 200
    res_b = resp_b.json()
    # Session B has no context, so it must not hallucinate Session A's Neil Armstrong
    assert res_b["result"].get("context_referenced") is not True


# -------------------------------------------------------------
# 3. Session History & Lifecycle Cleanup Tests
# -------------------------------------------------------------

def test_session_history_and_clear():
    """Verify session history retrieval and explicit session deletion."""
    sid = f"test-history-{uuid.uuid4().hex[:6]}"

    # Turn 1
    client.post(
        "/api/v1/chat",
        data={"text_input": "First message in conversation.", "session_id": sid},
    )
    # Turn 2
    client.post(
        "/api/v1/chat",
        data={"text_input": "Second message in conversation.", "session_id": sid},
    )

    # Check history
    h_resp = client.get(f"/api/v1/chat/history/{sid}")
    assert h_resp.status_code == 200
    h_data = h_resp.json()
    assert h_data["session_id"] == sid
    assert h_data["turns_count"] == 2
    assert len(h_data["history"]) == 2

    # Clear session
    del_resp = client.delete(f"/api/v1/chat/session/{sid}")
    assert del_resp.status_code == 200
    assert del_resp.json()["cleared"] is True

    # History after deletion should be empty
    h_after = client.get(f"/api/v1/chat/history/{sid}")
    assert h_after.json()["turns_count"] == 0

