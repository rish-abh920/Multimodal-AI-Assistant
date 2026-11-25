import pytest
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)


# -------------------------------------------------------------
# 1. Text Summarization Tests
# -------------------------------------------------------------

def test_text_summarize_short():
    """Verify summarization on a concise paragraph."""
    text = (
        "Machine learning models are trained on large datasets to recognize complex patterns. "
        "These models are widely deployed in healthcare, finance, and autonomous vehicles. "
        "Continuous monitoring is essential to ensure fairness and reliability in real-world systems."
    )
    payload = {"text": text, "max_length": 100}
    response = client.post("/api/v1/text/summarize", json=payload)

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "summary" in data
    assert len(data["summary"]) > 0
    assert data["original_characters"] == len(text)
    assert data["compression_ratio"] <= 1.0


def test_text_summarize_long():
    """Verify summarization on longer multi-paragraph text."""
    long_text = " ".join([
        "Natural language processing has evolved rapidly with transformer architectures.",
        "Self-attention mechanisms allow models to capture long-range contextual dependencies.",
        "State-of-the-art architectures can summarize text, translate languages, and answer questions.",
        "However, efficient inference on edge devices requires quantization and pruning techniques.",
        "Developers must carefully benchmark latency and memory footprint before production deployment.",
        "Future advancements will likely focus on multimodal integration and reduced parameter footprints."
    ])
    payload = {"text": long_text, "max_length": 150}
    response = client.post("/api/v1/text/summarize", json=payload)

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert len(data["summary"]) < len(long_text)


# -------------------------------------------------------------
# 2. Text Intelligence & Analysis Tests
# -------------------------------------------------------------

def test_text_analyze_keywords_and_facts():
    """Verify keyword extraction and important factual metric detection."""
    text = (
        "In 2026, OpenAI and Google achieved an unprecedented 42 percent growth in enterprise AI adoption. "
        "Over 10,000 businesses deployed multimodal assistants to automate customer workflows."
    )
    payload = {"text": text}
    response = client.post("/api/v1/text/analyze", json=payload)

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "keywords" in data
    assert len(data["keywords"]) >= 2
    assert "important_info" in data
    assert len(data["important_info"]) >= 1
    assert "explanation" in data
    assert "rewritten_text" in data
    assert data["word_count"] > 10


def test_text_analyze_qa_grounded():
    """Verify question answering directly grounded in the provided text."""
    text = "The solar system contains eight planets, with Jupiter being the largest gas giant."
    payload = {
        "text": text,
        "question": "Which planet is the largest?",
    }
    response = client.post("/api/v1/text/analyze", json=payload)

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "jupiter" in data["answer"].lower()


def test_text_analyze_qa_ungrounded_rejection():
    """Verify that ungrounded questions are politely rejected without hallucinations."""
    text = "Python is a popular programming language known for its readability and rich ecosystem."
    payload = {
        "text": text,
        "question": "What is the boiling point of nitrogen?",
    }
    response = client.post("/api/v1/text/analyze", json=payload)

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "cannot be answered" in data["answer"].lower()


def test_text_analyze_rewriting_styles():
    """Verify bullet, formal, and concise rewriting styles."""
    text = "Data preprocessing cleans raw input. Normalization scales feature values. Splitting ensures unbiased validation."
    for style in ["bullet", "formal", "concise"]:
        payload = {"text": text, "rewrite_style": style}
        response = client.post("/api/v1/text/analyze", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert len(data["rewritten_text"]) > 0


# -------------------------------------------------------------
# 3. Input Validation & Edge Cases
# -------------------------------------------------------------

def test_text_summarize_too_short():
    """Verify text shorter than minimum length returns 422 or 400."""
    payload = {"text": "Too short"}
    response = client.post("/api/v1/text/summarize", json=payload)
    assert response.status_code in [400, 422]

