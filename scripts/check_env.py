"""Environment and hardware diagnostic utility for Multimodal AI Assistant."""
import importlib
import os
import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT_DIR))


def check_packages() -> dict:
    required = [
        "fastapi",
        "uvicorn",
        "pydantic",
        "torch",
        "torchvision",
        "transformers",
        "accelerate",
        "faster_whisper",
        "sentence_transformers",
        "fitz",
        "PIL",
        "psutil",
        "numpy",
        "pandas",
        "pytest",
        "httpx",
    ]
    results = {}
    for pkg in required:
        try:
            mod = importlib.import_module(pkg)
            results[pkg] = getattr(mod, "__version__", "installed")
        except Exception as exc:
            results[pkg] = f"MISSING ({exc})"
    return results


def main() -> int:
    import psutil
    import torch

    vm = psutil.virtual_memory()
    print("=== Hardware & Runtime Diagnostics ===")
    print(f"Python:         {sys.version.split()[0]} ({sys.executable})")
    print(f"PyTorch:        {torch.__version__}")
    print(f"CUDA Available: {torch.cuda.is_available()}")
    print(f"CPU Cores:      {psutil.cpu_count(logical=False)} physical / {psutil.cpu_count(logical=True)} logical")
    print(f"RAM:            {vm.available / (1024**3):.2f} GB free / {vm.total / (1024**3):.2f} GB total ({vm.percent}% used)")
    print(f"PyMuPDF Temp:   {(ROOT_DIR / 'data' / 'temp').exists()}")
    print("\n=== Package Check ===")
    pkgs = check_packages()
    missing = []
    for name, status in pkgs.items():
        print(f"  {name:24s} -> {status}")
        if str(status).startswith("MISSING"):
            missing.append(name)

    if missing:
        print(f"\nERROR: Missing required packages: {', '.join(missing)}")
        return 1
    print("\nAll required packages are installed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

