import os
import time
from pathlib import Path
from typing import Dict, Any, List, Tuple
import torch
from PIL import Image, ImageStat
from fastapi import HTTPException, status

# Protect server memory against decompression bomb images
Image.MAX_IMAGE_PIXELS = 40_000_000

from backend.core.config import settings
from backend.core.model_manager import model_manager
from backend.schemas.responses import (
    ImageCaptionResponse,
    ImageAskResponse,
    ImageAnalyzeResponse,
    ImageVQAResponse,
)
from backend.utils.logging import logger


class ImageService:
    """
    Comprehensive Image Understanding Service.
    
    Provides:
    - Safe image decoding and integrity validation.
    - Neural image caption generation using BLIP.
    - Visual Question Answering (VQA) using ViLT.
    - Deep scene classification, color palette analysis, and visual content explanation.
    """

    def __init__(self) -> None:
        self.manager = model_manager

    def _load_and_validate_image(self, image_path: Path) -> Tuple[Image.Image, Dict[str, Any]]:
        """
        Safely loads an image file from disk, verifies byte integrity,
        converts to RGB, and extracts metadata.
        """
        if not image_path.exists():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Image file not found on server.",
            )

        try:
            # First pass: open and verify image file structure
            with Image.open(image_path) as test_img:
                test_img.verify()

            # Second pass: open fresh copy for processing
            img = Image.open(image_path)
            raw_format = img.format or image_path.suffix.lstrip(".").upper()
            width, height = img.size

            if width <= 0 or height <= 0:
                raise ValueError("Image dimensions must be greater than zero.")

            # Convert to standard RGB representation and resize oversized images for CPU memory efficiency
            rgb_image = img.convert("RGB")
            max_dim = settings.MAX_IMAGE_DIMENSION
            if max(width, height) > max_dim:
                rgb_image.thumbnail((max_dim, max_dim), Image.Resampling.LANCZOS)
            proc_w, proc_h = rgb_image.size
            file_size_kb = round(image_path.stat().st_size / 1024, 2)

            # Calculate aspect ratio
            gcd_val = self._gcd(width, height)
            aspect_ratio = f"{width // gcd_val}:{height // gcd_val}"

            metadata = {
                "width": width,
                "height": height,
                "processed_width": proc_w,
                "processed_height": proc_h,
                "format": raw_format,
                "mode": "RGB",
                "aspect_ratio": aspect_ratio,
                "file_size_kb": file_size_kb,
            }
            return rgb_image, metadata

        except Exception as e:
            logger.error(f"Image validation/decoding failed for {image_path.name}: {e}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Corrupted or invalid image data: {str(e)}",
            )

    @staticmethod
    def _gcd(a: int, b: int) -> int:
        """Helper to calculate greatest common divisor for aspect ratio."""
        while b:
            a, b = b, a % b
        return a if a > 0 else 1

    def generate_caption(self, image_path: Path) -> ImageCaptionResponse:
        """
        Generates a descriptive natural-language caption for an image using BLIP.
        """
        start_time = time.time()
        image, metadata = self._load_and_validate_image(image_path)

        logger.info(f"Generating caption for {image_path.name} ({metadata['width']}x{metadata['height']})")

        try:
            processor, model = self.manager.get_image_caption_model()

            inputs = processor(images=image, return_tensors="pt").to(self.manager.device)

            with torch.no_grad():
                outputs = model.generate(
                    **inputs,
                    max_new_tokens=40,
                    num_beams=3,
                    early_stopping=True,
                )

            caption = processor.decode(outputs[0], skip_special_tokens=True).strip()
            if not caption:
                caption = "An image containing visual elements."
            else:
                caption = caption[0].upper() + caption[1:]

            processing_time = round(time.time() - start_time, 3)
            latency_ms = round(processing_time * 1000, 2)

            return ImageCaptionResponse(
                success=True,
                image_description=caption,
                caption=caption,
                processing_time=processing_time,
                latency_ms=latency_ms,
                model_name=settings.IMAGE_CAPTION_MODEL_ID,
                image_metadata=metadata,
            )

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Inference error during image captioning: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Image captioning inference failed: {str(e)}",
            )

    def answer_question(self, image_path: Path, question: str) -> ImageAskResponse:
        """
        Answers a natural-language question grounded in the uploaded image content using ViLT.
        """
        start_time = time.time()

        clean_question = question.strip() if question else ""
        if not clean_question:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="The 'question' parameter cannot be empty.",
            )

        image, metadata = self._load_and_validate_image(image_path)
        logger.info(f"Answering VQA for {image_path.name} | Question: '{clean_question}'")

        try:
            processor, model = self.manager.get_image_vqa_model()

            encoding = processor(image, clean_question, return_tensors="pt").to(self.manager.device)

            with torch.no_grad():
                outputs = model(**encoding)
                logits = outputs.logits
                idx = logits.argmax(-1).item()
                confidence = float(torch.softmax(logits, dim=-1)[0, idx].item())
                answer = model.config.id2label.get(idx, "unknown")

            # Clean and capitalize answer
            answer = answer.strip()
            answer = answer[0].upper() + answer[1:] if answer else "Uncertain"

            processing_time = round(time.time() - start_time, 3)

            return ImageAskResponse(
                success=True,
                question=clean_question,
                answer=answer,
                confidence=round(confidence, 3),
                processing_time=processing_time,
                model_name=settings.IMAGE_VQA_MODEL_ID,
            )

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Inference error during VQA answering: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Visual question answering failed: {str(e)}",
            )

    def analyze_image(self, image_path: Path) -> ImageAnalyzeResponse:
        """
        Performs holistic visual analysis:
        - Deep captioning.
        - Color palette and luminosity extraction.
        - Scene classification (outdoor/indoor/document/object/abstract).
        - Key visual elements detection.
        - Synthesized natural language explanation.
        """
        start_time = time.time()
        image, metadata = self._load_and_validate_image(image_path)

        logger.info(f"Performing comprehensive image analysis on {image_path.name}")

        # 1. Generate descriptive caption
        caption_resp = self.generate_caption(image_path)
        caption = caption_resp.image_description

        # 2. Extract Color Palette & Luminosity
        dominant_colors, brightness_desc = self._analyze_colors_and_lighting(image)

        # 3. Classify Scene Category
        scene_type, key_elements = self._classify_scene(caption, image, metadata)

        # 4. Generate Narrative Explanation
        explanation = (
            f"The image depicts an {scene_type.lower()} scene ({metadata['width']}x{metadata['height']} px, "
            f"aspect ratio {metadata['aspect_ratio']}). It shows: {caption.lower() if caption.endswith('.') else caption.lower() + '.'} "
            f"The composition features prominent {', '.join(dominant_colors[:3])} hues with {brightness_desc} lighting."
        )

        processing_time = round(time.time() - start_time, 3)

        return ImageAnalyzeResponse(
            success=True,
            image_description=caption,
            scene_type=scene_type,
            key_elements=key_elements,
            dominant_colors=dominant_colors,
            image_metadata=metadata,
            explanation=explanation,
            processing_time=processing_time,
            model_name=f"{settings.IMAGE_CAPTION_MODEL_ID} + VisionAnalyzer",
        )

    def _analyze_colors_and_lighting(self, image: Image.Image) -> Tuple[List[str], str]:
        """Analyzes RGB distribution, dominant colors, and lighting level."""
        # Resize to small thumbnail for fast statistical analysis
        thumb = image.resize((64, 64))
        stat = ImageStat.Stat(thumb)
        r, g, b = stat.mean[:3]

        # Brightness / Luminosity
        brightness = (0.299 * r + 0.587 * g + 0.114 * b)
        if brightness < 60:
            lighting = "low-light / dark"
        elif brightness > 190:
            lighting = "bright / high-key"
        else:
            lighting = "balanced natural"

        # Dominant color identification
        colors = []
        if r > 160 and g < 100 and b < 100:
            colors.append("Red")
        if g > 130 and r < 140 and b < 140:
            colors.append("Green")
        if b > 140 and r < 140 and g < 140:
            colors.append("Blue")
        if r > 160 and g > 160 and b < 100:
            colors.append("Yellow")
        if r > 120 and g > 70 and b < 60:
            colors.append("Brown / Earth")
        if r > 200 and g > 200 and b > 200:
            colors.append("White")
        if r < 50 and g < 50 and b < 50:
            colors.append("Black / Charcoal")
        if abs(r - g) < 20 and abs(g - b) < 20 and 50 <= r <= 200:
            colors.append("Neutral Gray")

        if not colors:
            colors = ["Natural Multi-tone", "Warm neutral"]

        return colors, lighting

    def _classify_scene(
        self, caption: str, image: Image.Image, metadata: Dict[str, Any]
    ) -> Tuple[str, List[str]]:
        """Categorizes scene type and identifies key visual elements from caption and image cues."""
        text = caption.lower()

        outdoor_keywords = [
            "sky", "cloud", "tree", "mountain", "beach", "ocean", "road", "grass",
            "park", "sun", "nature", "forest", "field", "street", "building exterior",
        ]
        indoor_keywords = [
            "room", "kitchen", "bedroom", "living", "table", "chair", "sofa", "shelf",
            "indoor", "desk", "computer", "screen", "lamp", "wall", "carpet",
        ]
        document_keywords = [
            "text", "letter", "paper", "document", "page", "sign", "diagram",
            "chart", "receipt", "screenshot", "form",
        ]

        key_elements = []
        for kw in outdoor_keywords + indoor_keywords + document_keywords:
            if kw in text:
                key_elements.append(kw.title())

        # Determine category
        if any(kw in text for kw in document_keywords):
            scene_type = "Document / Textual"
        elif any(kw in text for kw in outdoor_keywords):
            scene_type = "Outdoor Natural"
        elif any(kw in text for kw in indoor_keywords):
            scene_type = "Indoor Architectural"
        elif "person" in text or "man" in text or "woman" in text or "dog" in text or "cat" in text:
            scene_type = "Subject / Portrait"
        else:
            scene_type = "General Object / Scene"

        if not key_elements:
            key_elements = [word.title() for word in text.split()[:4] if len(word) > 3]

        return scene_type, list(dict.fromkeys(key_elements))


image_service = ImageService()
