@echo off
title Grid Guard Solar Monitoring - Backend & SMTP Dispatcher Service
color 0A

echo ======================================================================
echo   GRID GUARD SOLAR MONITORING - 24/7 BACKEND & SMTP DISPATCHER
echo ======================================================================
echo.

cd /d "%~dp0"

:: 1. Check if port 8000 is already active
netstat -ano | findstr :8000 | findstr LISTENING >nul
if %errorlevel% equ 0 (
    echo [Grid Guard] Backend is ALREADY RUNNING on port 8000.
    echo [Grid Guard] Dedicated RTDB Email & OTP queue worker is active.
    echo.
    echo You can keep this window open or close it. Press any key to exit.
    pause >nul
    exit /b 0
)

echo [Grid Guard] Port 8000 is free. Starting FastAPI Backend & Queue Worker...
echo [Grid Guard] Listening on: http://127.0.0.1:8000
echo [Grid Guard] SMTP Gateway: smtp.gmail.com:587 (sriramkanuri45@gmail.com)
echo [Grid Guard] Queue Worker: Monitoring Firebase RTDB /email_queue & /otp_dispatch_queue
echo.

python -m uvicorn backend.app:app --host 127.0.0.1 --port 8000

if %errorlevel% neq 0 (
    echo.
    echo [Grid Guard Warning] Process exited with code %errorlevel%.
    echo Attempting restart in 5 seconds...
    timeout /t 5
    goto :start
)
