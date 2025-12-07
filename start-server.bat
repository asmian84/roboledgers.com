@echo off
echo ========================================
echo   RoboLedgers - Server Launcher
echo ========================================
echo.
echo Checking for available server options...
echo.

REM Check for Node.js
where node >nul 2>nul
if %ERRORLEVEL% == 0 (
    echo ✓ Node.js found! Starting server with npx...
    echo.
    echo Server will be at: http://localhost:8000
    echo Press Ctrl+C to stop
    echo.
    cd /d "%~dp0"
    npx -y http-server -p 8000 -c-1
    goto :end
)

REM Check for Python
where python >nul 2>nul
if %ERRORLEVEL% == 0 (
    echo ✓ Python found! Starting server...
    echo.
    echo Server will be at: http://localhost:8000
    echo Press Ctrl+C to stop
    echo.
    cd /d "%~dp0"
    python -m http.server 8000
    goto :end
)

REM No server found
echo ❌ Neither Node.js nor Python found!
echo.
echo SOLUTION 1: Install Python (Recommended)
echo   1. Open Microsoft Store
echo   2. Search for "Python"
echo   3. Install Python 3.12
echo   4. Run this file again
echo.
echo SOLUTION 2: Use Firefox
echo   Firefox works fine with file:// - just double-click index.html
echo.
echo SOLUTION 3: Install Node.js
echo   Download from: https://nodejs.org
echo.

:end
pause
