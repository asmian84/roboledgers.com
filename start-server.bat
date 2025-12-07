@echo off
echo ========================================
echo   RoboLedgers - Local Web Server
echo ========================================
echo.
echo Starting server at http://localhost:8000
echo.
echo Press Ctrl+C to stop the server
echo.
echo ========================================
echo.

cd /d "%~dp0"
python -m http.server 8000

pause
