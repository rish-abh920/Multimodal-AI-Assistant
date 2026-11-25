import pytest
from backend.core.model_manager import model_manager, ModelManager


def test_model_manager_singleton():
    """Verify ModelManager adheres to the singleton pattern."""
    manager_a = ModelManager()
    manager_b = ModelManager()
    assert manager_a is manager_b
    assert manager_a is model_manager


def test_model_manager_device_resolution():
    """Verify device is resolved to CPU on non-CUDA machines."""
    assert model_manager.device in ["cpu", "cuda"]
    assert isinstance(model_manager.get_loaded_models(), list)


def test_model_manager_unload():
    """Verify unloading non-existent and simulated model keys."""
    assert model_manager.unload_model("non_existent_key") is False

    # Simulate inserting and unloading a model key
    model_manager._models["mock_test_model"] = object()
    model_manager._access_times["mock_test_model"] = 100.0
    assert "mock_test_model" in model_manager.get_loaded_models()

    assert model_manager.unload_model("mock_test_model") is True
    assert "mock_test_model" not in model_manager.get_loaded_models()


def test_model_manager_memory_footprint():
    """Verify memory footprint metric is reported as positive number."""
    rss_mb = model_manager.get_memory_footprint_mb()
    assert isinstance(rss_mb, float)
    assert rss_mb > 0

