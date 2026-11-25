# Start Multimodal AI Assistant (Backend + Frontend) on Windows PowerShell
$RootDir = Split-Path -Parent $PSScriptRoot
$PythonExe = Join-Path $RootDir ".venv\Scripts\python.exe"

if (-not (Test-Path $PythonExe)) {
    Write-Error "Virtual environment python not found at $PythonExe. Run setup first."
    exit 1
}

Write-Host "Starting FastAPI backend at http://127.0.0.1:8000 ..." -ForegroundColor Cyan
$BackendProc = Start-Process -FilePath $PythonExe `
    -ArgumentList "-m", "uvicorn", "backend.main:app", "--host", "127.0.0.1", "--port", "8000" `
    -WorkingDirectory $RootDir -PassThru

Write-Host "Starting React + Vite frontend at http://localhost:5173 ..." -ForegroundColor Cyan
Set-Location (Join-Path $RootDir "frontend")
try {
    npm run dev
} finally {
    if ($BackendProc -and -not $BackendProc.HasExited) {
        Write-Host "Stopping FastAPI backend process..." -ForegroundColor Yellow
        Stop-Process -Id $BackendProc.Id -Force
    }
}

