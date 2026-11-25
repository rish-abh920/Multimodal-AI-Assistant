"""
Empirical Latency, Model Load Time, and Memory Benchmark Script.

Measures actual backend API response times, cold model load durations,
warm inference latencies, and RSS process memory on the active hardware.
"""
import io
import json
import math
import os
import struct
import sys
import time
import wave
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT_DIR))

import fitz
import psutil
from fastapi.testclient import TestClient
from PIL import Image, ImageDraw

from backend.core.model_manager import model_manager
from backend.main import app


def rss_mb() -> float:
    return round(psutil.Process(os.getpid()).memory_info().rss / (1024 * 1024), 2)


def make_test_image() -> bytes:
    img = Image.new("RGB", (640, 480), color=(35, 95, 190))
    draw = ImageDraw.Draw(img)
    draw.rectangle([160, 120, 480, 360], fill=(215, 65, 65))
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    return buf.getvalue()


def make_test_wav(duration_sec: float = 2.0) -> bytes:
    sample_rate = 16000
    total_samples = int(duration_sec * sample_rate)
    buf = io.BytesIO()
    with wave.open(buf, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sample_rate)
        frames = bytearray()
        for i in range(total_samples):
            val = int(12000 * math.sin(2.0 * math.pi * 440.0 * i / sample_rate))
            frames.extend(struct.pack("<h", val))
        wf.writeframes(bytes(frames))
    return buf.getvalue()


def make_test_pdf() -> bytes:
    doc = fitz.open()
    p1 = doc.new_page()
    p1.insert_text(
        (50, 72),
        "Apollo 11 landed humans on the Moon in July 1969. "
        "Commander Neil Armstrong and lunar module pilot Buzz Aldrin explored Tranquility Base.",
    )
    p2 = doc.new_page()
    p2.insert_text(
        (50, 72),
        "Apollo 17 was the final mission of NASA's Apollo program in December 1972.",
    )
    data = doc.tobytes()
    doc.close()
    return data


def time_call(fn):
    t0 = time.perf_counter()
    res = fn()
    return round(time.perf_counter() - t0, 3), res


def main():
    model_manager.unload_all()
    baseline_rss = rss_mb()
    client = TestClient(app)

    img_bytes = make_test_image()
    wav_bytes = make_test_wav(2.0)
    pdf_bytes = make_test_pdf()
    sample_text = (
        "NASA's Apollo program achieved six crewed lunar landings between 1969 and 1972. "
        "Commander Neil Armstrong led Apollo 11 while Gene Cernan commanded Apollo 17. "
        "The program returned 382 kilograms of lunar rock samples for scientific analysis."
    )

    report = {
        "device": model_manager.device,
        "baseline_rss_mb": baseline_rss,
        "model_load_cold_s": {},
        "endpoints_s": {},
    }

    # Measure cold model loads individually
    model_manager.unload_all()
    t, _ = time_call(model_manager.get_image_caption_model)
    report["model_load_cold_s"]["blip_caption"] = {"seconds": t, "rss_mb": rss_mb()}

    t, _ = time_call(model_manager.get_image_vqa_model)
    report["model_load_cold_s"]["vilt_vqa"] = {"seconds": t, "rss_mb": rss_mb()}

    t, _ = time_call(model_manager.get_whisper_model)
    report["model_load_cold_s"]["faster_whisper_base"] = {"seconds": t, "rss_mb": rss_mb()}

    t, _ = time_call(model_manager.get_embedding_model)
    report["model_load_cold_s"]["minilm_embeddings"] = {"seconds": t, "rss_mb": rss_mb()}

    # Measure API endpoints (warm / sequential with LRU eviction)
    t, r = time_call(lambda: client.get("/health"))
    report["endpoints_s"]["GET /health"] = {"seconds": t, "status": r.status_code}

    t, r = time_call(lambda: client.get("/api/v1/status"))
    report["endpoints_s"]["GET /api/v1/status"] = {"seconds": t, "status": r.status_code}

    t, r = time_call(lambda: client.post("/api/v1/image/caption", files={"file": ("bench.jpg", img_bytes, "image/jpeg")}))
    report["endpoints_s"]["POST /api/v1/image/caption"] = {"seconds": t, "status": r.status_code}

    t, r = time_call(
        lambda: client.post(
            "/api/v1/image/ask",
            files={"file": ("bench.jpg", img_bytes, "image/jpeg")},
            data={"question": "What color is the rectangle?"},
        )
    )
    report["endpoints_s"]["POST /api/v1/image/ask"] = {"seconds": t, "status": r.status_code}

    t, r = time_call(lambda: client.post("/api/v1/audio/transcribe", files={"file": ("bench.wav", wav_bytes, "audio/wav")}))
    report["endpoints_s"]["POST /api/v1/audio/transcribe (2s wav)"] = {"seconds": t, "status": r.status_code}

    t, r = time_call(lambda: client.post("/api/v1/text/summarize", json={"text": sample_text, "max_length": 150}))
    report["endpoints_s"]["POST /api/v1/text/summarize"] = {"seconds": t, "status": r.status_code}

    t, r = time_call(
        lambda: client.post(
            "/api/v1/text/analyze",
            json={"text": sample_text, "question": "Who led Apollo 11?", "rewrite_style": "formal"},
        )
    )
    report["endpoints_s"]["POST /api/v1/text/analyze"] = {"seconds": t, "status": r.status_code}

    t, r = time_call(lambda: client.post("/api/v1/documents/upload", files={"file": ("bench.pdf", pdf_bytes, "application/pdf")}))
    report["endpoints_s"]["POST /api/v1/documents/upload"] = {"seconds": t, "status": r.status_code}

    t, r = time_call(
        lambda: client.post(
            "/api/v1/documents/ask",
            files={"file": ("bench.pdf", pdf_bytes, "application/pdf")},
            data={"question": "Which was the final Apollo mission?", "top_k": "2"},
        )
    )
    report["endpoints_s"]["POST /api/v1/documents/ask"] = {"seconds": t, "status": r.status_code}

    t, r = time_call(
        lambda: client.post(
            "/api/v1/chat",
            files={"file": ("bench.pdf", pdf_bytes, "application/pdf")},
            data={"prompt": "Who was commander of Apollo 11?", "session_id": "bench-session"},
        )
    )
    report["endpoints_s"]["POST /api/v1/chat (document)"] = {"seconds": t, "status": r.status_code}
    client.delete("/api/v1/chat/session/bench-session")

    report["peak_or_final_rss_mb"] = rss_mb()
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()

