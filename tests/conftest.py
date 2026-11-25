import os
import io
from pathlib import Path
import pytest
from fastapi.testclient import TestClient
from PIL import Image

from backend.main import app
from backend.core.config import settings


@pytest.fixture(scope="session")
def client():
    """FastAPI TestClient fixture."""
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def sample_image_bytes():
    """Generate a valid in-memory PNG image."""
    buffer = io.BytesIO()
    img = Image.new("RGB", (64, 64), color="red")
    img.save(buffer, format="PNG")
    buffer.seek(0)
    return buffer.getvalue()


@pytest.fixture
def sample_text_bytes():
    """Generate sample plain text."""
    return b"This is a sample document for testing multimodal extraction."


@pytest.fixture
def sample_pdf_bytes():
    """Generate a minimal valid PDF byte sequence."""
    # Standard valid minimal PDF 1.4 header and trailer
    pdf_content = (
        b"%PDF-1.4\n"
        b"1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n"
        b"2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n"
        b"3 0 obj<</Type/Page/MediaBox[0 0 300 144]/Parent 2 0 R/Resources<<>>>>endobj\n"
        b"xref\n0 4\n0000000000 65535 f\n0000000010 00000 n\n0000000053 00000 n\n0000000102 00000 n\n"
        b"trailer<</Size 4/Root 1 0 R>>\nstartxref\n178\n%%EOF\n"
    )
    return pdf_content


@pytest.fixture
def sample_wav_bytes():
    """Generate a valid 16kHz PCM WAV with 0.5s duration."""
    import struct
    import math

    sample_rate = 16000
    num_samples = 8000  # 0.5 seconds
    data_size = num_samples * 2

    header = (
        b"RIFF" + (36 + data_size).to_bytes(4, "little") + b"WAVE"
        + b"fmt " + (16).to_bytes(4, "little") + (1).to_bytes(2, "little")
        + (1).to_bytes(2, "little") + (sample_rate).to_bytes(4, "little")
        + (sample_rate * 2).to_bytes(4, "little") + (2).to_bytes(2, "little")
        + (16).to_bytes(2, "little") + b"data" + (data_size).to_bytes(4, "little")
    )
    samples = bytearray(header)
    for i in range(num_samples):
        val = int(32767.0 * 0.2 * math.sin(2.0 * math.pi * 440.0 * i / sample_rate))
        samples.extend(struct.pack("<h", val))

    return bytes(samples)

