# Audio Understanding API Documentation

The Audio Understanding module provides speech-to-text (STT) transcription, automated spoken language identification, speech summarization, key-point extraction, and grounded transcript question answering.

---

## Architecture & Model Details

- **Model Engine**: `faster-whisper` (CTranslate2 inference engine)
- **Model Checkpoint**: `Systran/faster-whisper-base` (~145 MB, 74M parameters)
- **Quantization**: INT8 CPU quantization
- **Inference Speed**: ~2.5s for 15s audio (~4x faster than standard Whisper on CPU)
- **RAM Footprint**: ~200 MB resident memory

---

## Supported File Formats & Limits

- **Formats**: WAV (`.wav`), MP3 (`.mp3`), M4A (`.m4a`), FLAC (`.flac`), OGG (`.ogg`)
- **Max File Size**: 25 MB (enforced via streaming chunk validation)
- **Content Inspection**: Binary magic byte verification (`RIFF...WAVE`, `ID3`, `OggS`, `fLaC`, `ftypM4A`)

---

## 1. Speech-to-Text Transcription

Convert spoken audio into continuous text with detected language and timestamped segments.

- **Endpoint**: `POST /api/v1/audio/transcribe`
- **Content-Type**: `multipart/form-data`

### Request Parameters

| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `file` | `UploadFile` (binary) | Yes | Audio file in supported format |
| `language` | `string` (form field) | No | Optional language code (e.g. `en`, `hi`, `es`, `fr`, or `auto`) |

### Example Request (`curl`)

```bash
curl -X POST "http://127.0.0.1:8000/api/v1/audio/transcribe" \
  -H "accept: application/json" \
  -H "Content-Type: multipart/form-data" \
  -F "file=@meeting_clip.wav;type=audio/wav" \
  -F "language=en"
```

### Example Response (`200 OK`)

```json
{
  "success": true,
  "transcript": "Artificial intelligence and speech recognition are transforming technology.",
  "detected_language": "en",
  "duration_seconds": 4.52,
  "segments": [
    {
      "start": 0.0,
      "end": 4.52,
      "text": "Artificial intelligence and speech recognition are transforming technology."
    }
  ],
  "processing_time": 1.25,
  "model_name": "faster-whisper-base"
}
```

---

## 2. Spoken Audio Summarization

Transcribes audio and synthesizes a concise abstractive summary with bulleted key points.

- **Endpoint**: `POST /api/v1/audio/summarize`
- **Content-Type**: `multipart/form-data`

### Example Request (`curl`)

```bash
curl -X POST "http://127.0.0.1:8000/api/v1/audio/summarize" \
  -H "accept: application/json" \
  -H "Content-Type: multipart/form-data" \
  -F "file=@presentation.mp3;type=audio/mpeg"
```

### Example Response (`200 OK`)

```json
{
  "success": true,
  "transcript": "Welcome to the multimodal assistant platform. Speech recognition enables accurate hands-free interaction across systems. Intelligent models can extract summaries and key insights from spoken audio.",
  "detected_language": "en",
  "summary": "Welcome to the multimodal assistant platform. Speech recognition enables accurate hands-free interaction across systems. Intelligent models can extract summaries and key insights from spoken audio.",
  "key_points": [
    "Welcome to the multimodal assistant platform.",
    "Speech recognition enables accurate hands-free interaction across systems.",
    "Intelligent models can extract summaries and key insights from spoken audio."
  ],
  "duration_seconds": 9.8,
  "processing_time": 2.14,
  "model_name": "faster-whisper-base + NLPAnalyzer"
}
```

---

## 3. Question Answering on Transcript (`/ask`)

Ask questions about spoken content; the engine searches speech segments and provides grounded answers without hallucinating facts absent from the audio.

- **Endpoint**: `POST /api/v1/audio/ask`
- **Content-Type**: `multipart/form-data`

### Request Parameters

| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `file` | `UploadFile` (binary) | Yes | Audio recording file |
| `question` | `string` (form field) | Yes | Question regarding spoken content |
| `language` | `string` (form field) | No | Optional language code |

### Example Request (`curl`)

```bash
curl -X POST "http://127.0.0.1:8000/api/v1/audio/ask" \
  -H "accept: application/json" \
  -H "Content-Type: multipart/form-data" \
  -F "file=@announcement.wav;type=audio/wav" \
  -F "question=When will the new release launch?"
```

### Example Response (`200 OK`)

```json
{
  "success": true,
  "question": "When will the new release launch?",
  "answer": "According to the audio recording: \"The team will release the new version on Friday morning.\"",
  "confidence": 0.85,
  "relevant_segment": "[0.0s - 3.8s]: The team will release the new version on Friday morning.",
  "transcript": "The team will release the new version on Friday morning.",
  "detected_language": "en",
  "processing_time": 1.18,
  "model_name": "faster-whisper-base"
}
```

---

## Multilingual Capabilities & Limitations

### Capabilities
1. **99 Languages Supported**: Automatic language identification supports English (`en`), Hindi (`hi`), Spanish (`es`), French (`fr`), German (`de`), Japanese (`ja`), and more.
2. **Explicit Language Overrides**: Passing `language="hi"` skips auto-detection overhead and constrains Whisper decoder to Devanagari Hindi.

### Engineering Limitations & Recommendations
1. **Model Capacity (`base` vs `large-v3`)**:
   - `whisper-base` (74M parameters) delivers low word-error rates (WER) for English, but higher WER on complex Indic vocabulary or heavily accented Hindi compared to `whisper-small` or `whisper-large-v3`.
2. **Code-Switching (Hinglish)**:
   - When speakers alternate between Hindi and English phrases in the same sentence, language auto-detection may fluctuate. Setting explicit `language="en"` or `language="hi"` stabilizes output.
3. **Acoustic Noise & Low SNR**:
   - Audio with high background hum, reverberation, or music can cause hallucinations in low-amplitude pauses. The module enforces greedy beam search (`beam_size=1`) and speech threshold filtering to prevent fabricated words.

