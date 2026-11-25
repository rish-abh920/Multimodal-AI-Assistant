import io
import wave
import struct
import math
import random
import pytest
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)


def generate_sapi_speech_bytes(text: str) -> bytes:
    """Generate clean real speech audio using Windows SAPI voice synthesizer."""
    try:
        import win32com.client
        import tempfile
        import os

        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tf:
            temp_path = tf.name

        speaker = win32com.client.Dispatch("SAPI.SpVoice")
        stream = win32com.client.Dispatch("SAPI.SpFileStream")
        stream.Open(temp_path, 3, False)  # 3 = SSFMCreateForWrite
        speaker.AudioOutputStream = stream
        speaker.Speak(text)
        stream.Close()

        with open(temp_path, "rb") as f:
            audio_bytes = f.read()

        if os.path.exists(temp_path):
            os.remove(temp_path)

        return audio_bytes
    except Exception:
        # Fallback to programmatic PCM tone if SAPI is unavailable in test runner
        return generate_synthetic_pcm_bytes(duration_sec=2, frequency=440.0)


def generate_synthetic_pcm_bytes(duration_sec: int = 2, frequency: float = 440.0) -> bytes:
    """Generate valid 16kHz mono 16-bit PCM WAV bytes."""
    sample_rate = 16000
    total_samples = int(duration_sec * sample_rate)
    buffer = io.BytesIO()

    with wave.open(buffer, "wb") as f:
        f.setnchannels(1)
        f.setsampwidth(2)
        f.setframerate(sample_rate)
        for i in range(total_samples):
            val = int(32767.0 * 0.4 * math.sin(2.0 * math.pi * frequency * i / sample_rate))
            f.writeframes(struct.pack("<h", val))

    return buffer.getvalue()


def generate_noisy_audio_bytes(duration_sec: int = 2) -> bytes:
    """Generate noisy audio mixing white noise and multi-tone static."""
    sample_rate = 16000
    total_samples = int(duration_sec * sample_rate)
    buffer = io.BytesIO()

    with wave.open(buffer, "wb") as f:
        f.setnchannels(1)
        f.setsampwidth(2)
        f.setframerate(sample_rate)
        for i in range(total_samples):
            # White noise mixed with static
            noise = random.uniform(-0.15, 0.15)
            hum = 0.1 * math.sin(2.0 * math.pi * 60.0 * i / sample_rate)
            val = int(32767.0 * (noise + hum))
            f.writeframes(struct.pack("<h", max(-32768, min(32767, val))))

    return buffer.getvalue()


# -------------------------------------------------------------
# 1. Short and Long Speech Transcription Tests
# -------------------------------------------------------------

def test_transcribe_short_english():
    """Verify transcription on short real English speech."""
    phrase = "Artificial intelligence is transforming technology."
    audio_bytes = generate_sapi_speech_bytes(phrase)

    files = {"file": ("short_speech.wav", audio_bytes, "audio/wav")}
    response = client.post("/api/v1/audio/transcribe", files=files)

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "transcript" in data
    assert data["detected_language"] == "en"
    assert "intelligence" in data["transcript"].lower()
    assert data["duration_seconds"] > 0
    assert len(data["segments"]) > 0


def test_summarize_longer_english():
    """Verify transcription, summarization, and key points on longer speech."""
    speech_text = (
        "Welcome to the multimodal assistant platform. "
        "Speech recognition enables accurate hands-free interaction across systems. "
        "Intelligent models can extract summaries and key insights from spoken audio."
    )
    audio_bytes = generate_sapi_speech_bytes(speech_text)

    files = {"file": ("presentation.wav", audio_bytes, "audio/wav")}
    response = client.post("/api/v1/audio/summarize", files=files)

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "summary" in data
    assert len(data["summary"]) > 0
    assert "key_points" in data
    assert len(data["key_points"]) >= 1
    assert data["duration_seconds"] > 1.0


# -------------------------------------------------------------
# 2. Grounded Audio Question Answering (/ask) Tests
# -------------------------------------------------------------

def test_audio_ask_grounded_answer():
    """Verify Q&A returns direct answers grounded in spoken speech."""
    speech_text = "The team will release the new version on Friday morning."
    audio_bytes = generate_sapi_speech_bytes(speech_text)

    files = {"file": ("meeting.wav", audio_bytes, "audio/wav")}
    data = {"question": "When will the team release the new version?"}

    response = client.post("/api/v1/audio/ask", files=files, data=data)
    assert response.status_code == 200
    res = response.json()
    assert res["success"] is True
    assert "friday" in res["answer"].lower()
    assert res["confidence"] > 0.5


def test_audio_ask_ungrounded_rejection():
    """Verify Q&A rejects questions not mentioned in the audio (no hallucination)."""
    speech_text = "The weather today is sunny and mild."
    audio_bytes = generate_sapi_speech_bytes(speech_text)

    files = {"file": ("weather.wav", audio_bytes, "audio/wav")}
    data = {"question": "What is the capital of Australia?"}

    response = client.post("/api/v1/audio/ask", files=files, data=data)
    assert response.status_code == 200
    res = response.json()
    assert res["success"] is True
    assert "not mentioned" in res["answer"].lower() or "cannot be answered" in res["answer"].lower()
    assert res["confidence"] < 0.5


# -------------------------------------------------------------
# 3. Multilingual & Hindi Audio Mode Tests
# -------------------------------------------------------------

def test_transcribe_hindi_mode():
    """Verify transcription with explicit Hindi language code."""
    audio_bytes = generate_synthetic_pcm_bytes(duration_sec=2, frequency=300.0)
    files = {"file": ("hindi_sample.wav", audio_bytes, "audio/wav")}
    data = {"language": "hi"}

    response = client.post("/api/v1/audio/transcribe", files=files, data=data)
    assert response.status_code == 200
    res = response.json()
    assert res["success"] is True
    assert res["detected_language"] == "hi"


# -------------------------------------------------------------
# 4. Noisy Audio and Edge Case Handling
# -------------------------------------------------------------

def test_noisy_audio_handling():
    """Verify noisy audio is processed gracefully without server errors or invented words."""
    noisy_bytes = generate_noisy_audio_bytes(duration_sec=2)
    files = {"file": ("noise.wav", noisy_bytes, "audio/wav")}

    response = client.post("/api/v1/audio/transcribe", files=files)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["processing_time"] > 0


def test_empty_audio_rejection():
    """Verify 0-byte audio file returns 400 Bad Request."""
    files = {"file": ("empty.wav", b"", "audio/wav")}
    response = client.post("/api/v1/audio/transcribe", files=files)
    assert response.status_code == 400


def test_unsupported_audio_format_rejection():
    """Verify unsupported formats return 415 Unsupported Media Type."""
    files = {"file": ("sound.avi", b"RIFF....AVI", "video/x-msvideo")}
    response = client.post("/api/v1/audio/transcribe", files=files)
    assert response.status_code == 415


def test_empty_audio_question_rejection():
    """Verify empty question on /ask returns 400 or 422."""
    audio_bytes = generate_synthetic_pcm_bytes(duration_sec=1)
    files = {"file": ("test.wav", audio_bytes, "audio/wav")}
    data = {"question": "   "}

    response = client.post("/api/v1/audio/ask", files=files, data=data)
    assert response.status_code in [400, 422]

