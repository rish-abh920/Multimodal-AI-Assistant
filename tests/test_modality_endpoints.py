def test_image_caption_endpoint(client, sample_image_bytes):
    """Test POST /api/v1/image/caption with valid PNG."""
    files = {"file": ("test.png", sample_image_bytes, "image/png")}
    response = client.post("/api/v1/image/caption", files=files)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "caption" in data
    assert data["latency_ms"] >= 0


def test_image_vqa_endpoint(client, sample_image_bytes):
    """Test POST /api/v1/image/vqa with valid question and image."""
    files = {"file": ("test.png", sample_image_bytes, "image/png")}
    data = {"question": "What is in this image?"}
    response = client.post("/api/v1/image/vqa", files=files, data=data)
    assert response.status_code == 200
    res = response.json()
    assert res["success"] is True
    assert res["question"] == "What is in this image?"
    assert "answer" in res


def test_audio_transcribe_endpoint(client, sample_wav_bytes):
    """Test POST /api/v1/audio/transcribe with sample WAV."""
    files = {"file": ("test.wav", sample_wav_bytes, "audio/wav")}
    response = client.post("/api/v1/audio/transcribe", files=files)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "text" in data
    assert data["duration_seconds"] >= 0


def test_text_summarize_endpoint(client):
    """Test POST /api/v1/text/summarize with valid body."""
    payload = {
        "text": "Artificial intelligence is transforming every domain from healthcare to education.",
        "max_length": 100,
        "min_length": 20,
    }
    response = client.post("/api/v1/text/summarize", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "summary" in data
    assert data["original_characters"] > 0


def test_document_extract_endpoint(client, sample_pdf_bytes):
    """Test POST /api/v1/document/extract with sample PDF."""
    files = {"file": ("sample.pdf", sample_pdf_bytes, "application/pdf")}
    response = client.post("/api/v1/document/extract", files=files)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["page_count"] >= 1
    assert data["filename"] == "sample.pdf"

