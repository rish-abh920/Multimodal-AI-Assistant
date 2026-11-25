import io
import pytest
from PIL import Image, ImageDraw, ImageFont
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)


def create_outdoor_scene_bytes():
    """Create a synthetic outdoor scene with sky, grass, and sun."""
    img = Image.new("RGB", (200, 200), color=(135, 206, 235))  # Sky blue
    draw = ImageDraw.Draw(img)
    draw.rectangle([0, 120, 200, 200], fill=(34, 139, 34))  # Grass green
    draw.ellipse([140, 20, 180, 60], fill=(255, 215, 0))  # Golden sun
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def create_object_scene_bytes():
    """Create a synthetic image with an isolated red object on white background."""
    img = Image.new("RGB", (150, 150), color="white")
    draw = ImageDraw.Draw(img)
    draw.rectangle([30, 30, 120, 120], fill="red")
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    return buf.getvalue()


def create_document_scene_bytes():
    """Create a synthetic text document with structured lines."""
    img = Image.new("RGB", (200, 250), color="white")
    draw = ImageDraw.Draw(img)
    # Draw horizontal text simulation lines
    for y in range(40, 200, 20):
        draw.line([(30, y), (170, y)], fill="black", width=3)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def create_indoor_scene_bytes():
    """Create a synthetic indoor room with furniture colors."""
    img = Image.new("RGB", (200, 200), color=(240, 230, 200))  # Wall
    draw = ImageDraw.Draw(img)
    draw.rectangle([0, 140, 200, 200], fill=(139, 69, 19))  # Wooden floor
    draw.rectangle([40, 100, 160, 150], fill=(160, 82, 45))  # Sofa/Table
    buf = io.BytesIO()
    img.save(buf, format="WEBP")
    return buf.getvalue()


# -------------------------------------------------------------
# 1. Caption Tests Across Diverse Scenes
# -------------------------------------------------------------

def test_image_caption_outdoor():
    """Test caption generation on outdoor scene."""
    img_bytes = create_outdoor_scene_bytes()
    files = {"file": ("outdoor.png", img_bytes, "image/png")}
    response = client.post("/api/v1/image/caption", files=files)

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "image_description" in data
    assert len(data["image_description"]) > 0
    assert data["processing_time"] > 0
    assert "image_metadata" in data
    assert data["image_metadata"]["width"] == 200
    assert data["image_metadata"]["height"] == 200


def test_image_caption_object():
    """Test caption generation on isolated red object."""
    img_bytes = create_object_scene_bytes()
    files = {"file": ("object.jpg", img_bytes, "image/jpeg")}
    response = client.post("/api/v1/image/caption", files=files)

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "red" in data["image_description"].lower()


# -------------------------------------------------------------
# 2. Visual Question Answering (/ask) Tests
# -------------------------------------------------------------

def test_image_ask_grounded_color():
    """Verify VQA answers correctly identify color grounded in visual content."""
    img_bytes = create_object_scene_bytes()  # Red square on white
    files = {"file": ("square.jpg", img_bytes, "image/jpeg")}
    data = {"question": "What color is the shape?"}

    response = client.post("/api/v1/image/ask", files=files, data=data)
    assert response.status_code == 200
    res = response.json()
    assert res["success"] is True
    assert "red" in res["answer"].lower()
    assert res["confidence"] > 0.5


def test_image_ask_outdoor():
    """Verify VQA question on outdoor image."""
    img_bytes = create_outdoor_scene_bytes()
    files = {"file": ("nature.png", img_bytes, "image/png")}
    data = {"question": "Is it day or night?"}

    response = client.post("/api/v1/image/ask", files=files, data=data)
    assert response.status_code == 200
    res = response.json()
    assert res["success"] is True
    assert "day" in res["answer"].lower()


# -------------------------------------------------------------
# 3. Comprehensive Analysis (/analyze) Tests
# -------------------------------------------------------------

def test_image_analyze_document():
    """Verify document scene classification and structure extraction."""
    img_bytes = create_document_scene_bytes()
    files = {"file": ("doc.png", img_bytes, "image/png")}

    response = client.post("/api/v1/image/analyze", files=files)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "image_description" in data
    assert "scene_type" in data
    assert "dominant_colors" in data
    assert "explanation" in data
    assert len(data["explanation"]) > 20


def test_image_analyze_indoor():
    """Verify indoor scene analysis with WEBP format."""
    img_bytes = create_indoor_scene_bytes()
    files = {"file": ("room.webp", img_bytes, "image/webp")}

    response = client.post("/api/v1/image/analyze", files=files)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["image_metadata"]["format"] == "WEBP"
    assert data["processing_time"] > 0


# -------------------------------------------------------------
# 4. Error Handling & Security Boundary Tests
# -------------------------------------------------------------

def test_corrupted_image_rejection():
    """Verify corrupted image bytes return 400 Bad Request."""
    corrupted_bytes = b"\xFF\xD8\xFF\xE0\x00\x10JFIF" + b"CORRUPTED_GARBAGE_PAYLOAD" * 5
    files = {"file": ("corrupt.jpg", corrupted_bytes, "image/jpeg")}

    response = client.post("/api/v1/image/caption", files=files)
    assert response.status_code == 400
    assert "corrupt" in response.json()["detail"].lower()


def test_unsupported_format_rejection():
    """Verify unsupported extensions return 415 Unsupported Media Type."""
    files = {"file": ("script.py", b"print('hello')", "text/x-python")}
    response = client.post("/api/v1/image/caption", files=files)
    assert response.status_code == 415


def test_empty_question_rejection():
    """Verify empty or whitespace-only questions return 400 or 422."""
    img_bytes = create_object_scene_bytes()
    files = {"file": ("test.jpg", img_bytes, "image/jpeg")}
    data = {"question": "   "}

    response = client.post("/api/v1/image/ask", files=files, data=data)
    assert response.status_code in [400, 422]

