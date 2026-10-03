@echo off
title Grid Guard Solar Monitoring - Backend & PostgreSQL Service
color 0A

echo ======================================================================
echo   GRID GUARD SOLAR MONITORING - POSTGRESQL 18 & FASTAPI BACKEND
echo ======================================================================
echo.

cd /d "%~dp0"

:: 1. Ensure PostgreSQL 18 Windows Service is Running
echo [1/3] Checking PostgreSQL 18 Windows Service...
sc query postgresql-x64-18 | findstr /i "RUNNING" >nul
if %errorlevel% neq 0 (
    echo [Grid Guard] Starting PostgreSQL 18 service...
    net start postgresql-x64-18
) else (
    echo [Grid Guard] PostgreSQL 18 service is RUNNING.
)
echo.

:: 2. Check if port 8000 is already active
echo [2/3] Checking FastAPI Backend on port 8000...
netstat -ano | findstr :8000 | findstr LISTENING >nul
if %errorlevel% equ 0 (
    echo [Grid Guard] FastAPI Backend is ALREADY RUNNING on http://127.0.0.1:8000.
    echo.
    echo Press any key to exit this launcher or close this window.
    pause >nul
    exit /b 0
)

:: 3. Start FastAPI Backend with Uvicorn
echo [3/3] Starting FastAPI Backend with auto-reload...
echo [Grid Guard] Listening on: http://127.0.0.1:8000
echo [Grid Guard] PostgreSQL: postgresql://localhost:5432/Gridguardsolarmonitoring
echo [Grid Guard] SMTP Gateway: smtp.gmail.com:587 (sriramkanuri45@gmail.com)
echo.

python -m uvicorn backend.app:app --host 127.0.0.1 --port 8000 --reload

if %errorlevel% neq 0 (
    echo.
    echo [Grid Guard Error] Uvicorn exited with error code %errorlevel%.
    echo Retrying in 5 seconds...
    timeout /t 5
    python -m uvicorn backend.app:app --host 127.0.0.1 --port 8000 --reload
)
