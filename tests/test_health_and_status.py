def test_health_endpoint(client):
    """Test GET /health returns 200 and expected schema keys."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()

    assert data["status"] == "healthy"
    assert "timestamp" in data
    assert "hardware" in data
    assert "memory" in data["hardware"]
    assert data["hardware"]["memory"]["total_gb"] > 0
    assert data["hardware"]["device"] in ["cpu", "cuda"]
    assert "torch_version" in data["hardware"]


def test_status_endpoint(client):
    """Test GET /api/v1/status returns 200 and modality model configuration."""
    response = client.get("/api/v1/status")
    assert response.status_code == 200
    data = response.json()

    assert data["app_name"] == "Multimodal AI Assistant"
    assert "configured_models" in data
    assert "image_caption" in data["configured_models"]
    assert "audio_whisper" in data["configured_models"]
    assert isinstance(data["loaded_models"], list)
    assert data["memory_footprint_mb"] > 0

