# Image Understanding API Documentation

The Image Understanding module provides deep vision capabilities including natural-language image captioning, grounded visual question answering (VQA), and holistic scene/palette analysis.

---

## Supported File Formats & Limits

- **Formats**: JPEG (`.jpg`, `.jpeg`), PNG (`.png`), WebP (`.webp`), BMP (`.bmp`)
- **Max File Size**: 10 MB (enforced via streaming chunk validation)
- **Content Inspection**: Binary magic byte validation + PIL byte verification

---

## 1. Image Captioning

Generate an accurate, descriptive natural-language caption grounded in the uploaded image.

- **Endpoint**: `POST /api/v1/image/caption`
- **Content-Type**: `multipart/form-data`
- **Model**: `Salesforce/blip-image-captioning-base`

### Request Parameters

| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `file` | `UploadFile` (binary) | Yes | Image file in supported format |

### Example Request (`curl`)

```bash
curl -X POST "http://127.0.0.1:8000/api/v1/image/caption" \
  -H "accept: application/json" \
  -H "Content-Type: multipart/form-data" \
  -F "file=@sample_photo.jpg;type=image/jpeg"
```

### Example Request (Python `requests`)

```python
import requests

url = "http://127.0.0.1:8000/api/v1/image/caption"
with open("sample_photo.jpg", "rb") as f:
    files = {"file": ("sample_photo.jpg", f, "image/jpeg")}
    response = requests.post(url, files=files)
    print(response.json())
```

### Example Response (`200 OK`)

```json
{
  "success": true,
  "image_description": "A close up of a red apple on a wooden kitchen table.",
  "caption": "A close up of a red apple on a wooden kitchen table.",
  "processing_time": 1.42,
  "latency_ms": 1420.0,
  "model_name": "Salesforce/blip-image-captioning-base",
  "image_metadata": {
    "width": 1920,
    "height": 1080,
    "format": "JPEG",
    "mode": "RGB",
    "aspect_ratio": "16:9",
    "file_size_kb": 245.8
  }
}
```

---

## 2. Visual Question Answering (VQA)

Ask any free-form natural language question about an image and receive a grounded answer with model confidence.

- **Endpoint**: `POST /api/v1/image/ask`
- **Content-Type**: `multipart/form-data`
- **Model**: `dandelin/vilt-b32-finetuned-vqa`

### Request Parameters

| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `file` | `UploadFile` (binary) | Yes | Image file in supported format |
| `question` | `string` (form field) | Yes | Natural language question about the image |

### Example Request (`curl`)

```bash
curl -X POST "http://127.0.0.1:8000/api/v1/image/ask" \
  -H "accept: application/json" \
  -H "Content-Type: multipart/form-data" \
  -F "file=@park_bench.png;type=image/png" \
  -F "question=What is sitting on the bench?"
```

### Example Request (Python `requests`)

```python
import requests

url = "http://127.0.0.1:8000/api/v1/image/ask"
with open("park_bench.png", "rb") as f:
    files = {"file": ("park_bench.png", f, "image/png")}
    data = {"question": "What is sitting on the bench?"}
    response = requests.post(url, files=files, data=data)
    print(response.json())
```

### Example Response (`200 OK`)

```json
{
  "success": true,
  "question": "What is sitting on the bench?",
  "answer": "Dog",
  "confidence": 0.942,
  "processing_time": 0.89,
  "latency_ms": 890.0,
  "model_name": "dandelin/vilt-b32-finetuned-vqa"
}
```

---

## 3. Comprehensive Image Analysis

Holistic visual decomposition combining neural captioning, scene categorization, color histogram and luminosity breakdown, key object elements, and a synthesized visual narrative.

- **Endpoint**: `POST /api/v1/image/analyze`
- **Content-Type**: `multipart/form-data`

### Example Request (`curl`)

```bash
curl -X POST "http://127.0.0.1:8000/api/v1/image/analyze" \
  -H "accept: application/json" \
  -H "Content-Type: multipart/form-data" \
  -F "file=@landscape.webp;type=image/webp"
```

### Example Response (`200 OK`)

```json
{
  "success": true,
  "image_description": "A scenic view of a mountain range with green valleys under a blue sky.",
  "scene_type": "Outdoor Natural",
  "key_elements": ["Mountain", "Green", "Sky", "Cloud"],
  "dominant_colors": ["Blue", "Green", "Neutral Gray"],
  "image_metadata": {
    "width": 1280,
    "height": 720,
    "format": "WEBP",
    "mode": "RGB",
    "aspect_ratio": "16:9",
    "file_size_kb": 134.2
  },
  "explanation": "The image depicts an outdoor natural scene (1280x720 px, aspect ratio 16:9). It shows: a scenic view of a mountain range with green valleys under a blue sky. The composition features prominent Blue, Green, Neutral Gray hues with balanced natural lighting.",
  "processing_time": 1.68,
  "model_name": "Salesforce/blip-image-captioning-base + VisionAnalyzer"
}
```

---

## Error Codes & Security Handling

| Status Code | Error Reason | Example Response |
| :--- | :--- | :--- |
| `400 Bad Request` | Corrupted image or empty question | `{"detail": "Corrupted or invalid image data: ..."}` |
| `413 Payload Too Large` | Image exceeds 10 MB | `{"detail": "File size exceeds the limit of 10 MB."}` |
| `415 Unsupported Media` | Disallowed extension / invalid magic bytes | `{"detail": "File extension '.exe' is not permitted..."}` |
| `500 Server Error` | Model inference failure | `{"detail": "Image captioning inference failed: ..."}` |

