
@echo off
title CareerRAG Launcher

echo Starting CareerRAG Backend...
start "CareerRAG Backend" powershell -NoExit -Command "Set-Location 'C:\CareerRAG'; .\venv\Scripts\Activate.ps1; python -m uvicorn backend.main:app"

timeout /t 3 /nobreak >nul

echo Starting CareerRAG Frontend...
start "CareerRAG Frontend" powershell -NoExit -Command "Set-Location 'C:\CareerRAG\frontend'; npm run dev"

timeout /t 5 /nobreak >nul

echo Opening CareerRAG Frontend in Chrome...
start "" chrome.exe "http://localhost:5173/"

echo Opening CareerRAG Backend Docs in Chrome...
start "" chrome.exe "http://127.0.0.1:8000/docs"

exit
