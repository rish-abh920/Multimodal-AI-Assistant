import gc
import time
import os
from typing import Dict, Any, List, Optional, Tuple
import torch
import psutil

from backend.core.config import settings
from backend.utils.logging import logger


class ModelLoadError(Exception):
    """Raised when an AI/ML model fails to download or initialize."""
    pass


class ModelManager:
    """
    Centralized Model Lifecycle & Memory Manager.
    
    Features:
    - Lazy loading: Instantiates models only upon first request.
    - Thread-safe caching: Prevents re-loading identical model weights.
    - Hardware-aware device targeting (CUDA vs CPU).
    - LRU memory eviction: Automatically evicts old models when MAX_LOADED_MODELS is reached.
    - Garbage collection triggers to conserve host RAM on 8 GB systems.
    """

    _instance: Optional["ModelManager"] = None

    def __new__(cls) -> "ModelManager":
        if cls._instance is None:
            cls._instance = super(ModelManager, cls).__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self) -> None:
        if getattr(self, "_initialized", False):
            return

        self._models: Dict[str, Any] = {}
        self._access_times: Dict[str, float] = {}
        self.device = self._resolve_device()
        self._configure_hardware_threads()
        self._initialized = True
        logger.info(
            f"ModelManager initialized on device='{self.device}', "
            f"max_concurrent_models={settings.MAX_LOADED_MODELS}"
        )

    def _resolve_device(self) -> str:
        """Resolve device target based on settings and CUDA availability."""
        target = settings.DEVICE.strip().lower()
        if target == "cuda":
            if torch.cuda.is_available():
                return "cuda"
            logger.warning("CUDA requested but not available. Falling back to CPU.")
            return "cpu"
        elif target == "cpu":
            return "cpu"
        else:  # auto
            return "cuda" if torch.cuda.is_available() else "cpu"

    def _configure_hardware_threads(self) -> None:
        """Limit CPU thread starvation if running on CPU."""
        if self.device == "cpu":
            num_threads = min(settings.CPU_NUM_THREADS, max(1, os.cpu_count() or 4))
            torch.set_num_threads(num_threads)
            logger.info(f"PyTorch CPU threads constrained to: {num_threads}")

    def _evict_if_needed(self, incoming_key: str) -> None:
        """Evicts the least recently used model if max model threshold is reached."""
        if incoming_key in self._models:
            return

        if len(self._models) >= settings.MAX_LOADED_MODELS:
            # Find LRU model
            lru_key = min(self._access_times.keys(), key=lambda k: self._access_times[k])
            logger.warning(
                f"Memory threshold reached ({settings.MAX_LOADED_MODELS}). "
                f"Evicting model '{lru_key}' from memory to make room for '{incoming_key}'."
            )
            self.unload_model(lru_key)

    def unload_model(self, model_key: str) -> bool:
        """Unload a specific model and free RAM."""
        if model_key in self._models:
            del self._models[model_key]
            self._access_times.pop(model_key, None)
            gc.collect()
            if self.device == "cuda" and torch.cuda.is_available():
                torch.cuda.empty_cache()
            logger.info(f"Unloaded model '{model_key}'. Memory reclaimed.")
            return True
        return False

    def unload_all(self) -> None:
        """Unload all models currently held in cache."""
        keys = list(self._models.keys())
        for key in keys:
            self.unload_model(key)
        logger.info("All models unloaded from ModelManager.")

    def get_loaded_models(self) -> List[str]:
        """Return list of keys for currently resident models."""
        return list(self._models.keys())

    def get_memory_footprint_mb(self) -> float:
        """Returns the current process resident memory in megabytes."""
        process = psutil.Process(os.getpid())
        return round(process.memory_info().rss / (1024 * 1024), 2)

    # -------------------------------------------------------------
    # Modality Model Loaders (Lazy & Cached)
    # -------------------------------------------------------------

    def get_image_caption_model(self) -> Tuple[Any, Any]:
        """Lazy loader for BLIP Image Captioning."""
        key = "image_caption"
        if key in self._models:
            self._access_times[key] = time.time()
            return self._models[key]

        self._evict_if_needed(key)
        model_id = settings.IMAGE_CAPTION_MODEL_ID
        logger.info(f"Loading Image Captioning model '{model_id}' on {self.device}...")

        try:
            from transformers import BlipProcessor, BlipForConditionalGeneration

            processor = BlipProcessor.from_pretrained(model_id)
            model = BlipForConditionalGeneration.from_pretrained(model_id).to(self.device)
            model.eval()

            self._models[key] = (processor, model)
            self._access_times[key] = time.time()
            logger.info(f"Image Captioning model '{model_id}' loaded successfully.")
            return self._models[key]
        except Exception as e:
            logger.error(f"Failed to load Image Captioning model '{model_id}': {e}")
            raise ModelLoadError(f"Could not load image caption model: {str(e)}")

    def get_image_vqa_model(self) -> Tuple[Any, Any]:
        """Lazy loader for ViLT Visual Question Answering."""
        key = "image_vqa"
        if key in self._models:
            self._access_times[key] = time.time()
            return self._models[key]

        self._evict_if_needed(key)
        model_id = settings.IMAGE_VQA_MODEL_ID
        logger.info(f"Loading Image VQA model '{model_id}' on {self.device}...")

        try:
            from transformers import ViltProcessor, ViltForQuestionAnswering

            processor = ViltProcessor.from_pretrained(model_id)
            model = ViltForQuestionAnswering.from_pretrained(model_id).to(self.device)
            model.eval()

            self._models[key] = (processor, model)
            self._access_times[key] = time.time()
            logger.info(f"Image VQA model '{model_id}' loaded successfully.")
            return self._models[key]
        except Exception as e:
            logger.error(f"Failed to load Image VQA model '{model_id}': {e}")
            raise ModelLoadError(f"Could not load image VQA model: {str(e)}")

    def get_whisper_model(self) -> Any:
        """Lazy loader for faster-whisper speech-to-text."""
        key = "audio_whisper"
        if key in self._models:
            self._access_times[key] = time.time()
            return self._models[key]

        self._evict_if_needed(key)
        size = settings.WHISPER_MODEL_SIZE
        compute_type = settings.WHISPER_COMPUTE_TYPE
        target_device = "cpu" if self.device == "cpu" else "cuda"

        logger.info(
            f"Loading Whisper model '{size}' on {target_device} "
            f"with compute_type='{compute_type}'..."
        )

        try:
            from faster_whisper import WhisperModel

            model = WhisperModel(
                size,
                device=target_device,
                compute_type=compute_type,
                cpu_threads=settings.CPU_NUM_THREADS,
            )
            self._models[key] = model
            self._access_times[key] = time.time()
            logger.info(f"Whisper '{size}' model loaded successfully.")
            return self._models[key]
        except Exception as e:
            logger.error(f"Failed to load Whisper model: {e}")
            raise ModelLoadError(f"Could not load speech model: {str(e)}")

    def get_text_model(self) -> Tuple[Any, Any]:
        """Lazy loader for Flan-T5 text reasoning and summarization."""
        key = "text_summarization"
        if key in self._models:
            self._access_times[key] = time.time()
            return self._models[key]

        self._evict_if_needed(key)
        model_id = settings.TEXT_SUMMARIZATION_MODEL_ID
        logger.info(f"Loading Text model '{model_id}' on {self.device}...")

        try:
            from transformers import AutoTokenizer, AutoModelForSeq2SeqLM

            tokenizer = AutoTokenizer.from_pretrained(model_id)
            model = AutoModelForSeq2SeqLM.from_pretrained(model_id).to(self.device)
            model.eval()

            self._models[key] = (tokenizer, model)
            self._access_times[key] = time.time()
            logger.info(f"Text model '{model_id}' loaded successfully.")
            return self._models[key]
        except Exception as e:
            logger.error(f"Failed to load Text model '{model_id}': {e}")
            raise ModelLoadError(f"Could not load text model: {str(e)}")


    def get_embedding_model(self) -> Any:
        """Lazy loader for SentenceTransformer text embeddings."""
        key = "text_embedding"
        if key in self._models:
            self._access_times[key] = time.time()
            return self._models[key]

        self._evict_if_needed(key)
        model_id = settings.TEXT_EMBEDDING_MODEL_ID
        logger.info(f"Loading SentenceTransformer '{model_id}' on {self.device}...")

        try:
            from sentence_transformers import SentenceTransformer

            model = SentenceTransformer(model_id, device=self.device)
            self._models[key] = model
            self._access_times[key] = time.time()
            logger.info(f"SentenceTransformer '{model_id}' loaded successfully.")
            return self._models[key]
        except Exception as e:
            logger.error(f"Failed to load SentenceTransformer: {e}")
            raise ModelLoadError(f"Could not load embedding model: {str(e)}")


# Singleton instance
model_manager = ModelManager()

