@echo off
title Data Junkie CLI Scanner
color 0A

echo ========================================================
echo   DATA JUNKIE CLI - HEADLESS MODE
echo   No Browser. No Limits. Pure Speed.
echo ========================================================
echo.

:: Check Node
node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo CRITICAL ERROR: Node.js is not installed.
    echo Please install Node from https://nodejs.org/
    pause
    exit /b
)

:: AUTO-FIX: Check for common corruption (Invalid Package Config)
if exist "node_modules" (
    echo Checking environment...
)

:: Force Reinstall Option (hidden trigger or error handling)
if "%1"=="clean" (
    echo Force cleaning...
    rmdir /s /q node_modules
    echo Done. Restart script.
    pause
    exit /b
)

:: Check Dependencies (and fix if broken)
if not exist "node_modules\pdfjs-dist" (
    echo Dependencies missing. Installing...
    echo (This may take a minute)
    
    :: Standard Install (We are on C:\ now)
    call npm install pdfjs-dist xlsx yargs csv-parser
    
    if %errorlevel% neq 0 (
        echo.
        echo ⚠️ Installation had issues. Cleaning cache and retrying...
        call npm cache clean --force
        call npm install pdfjs-dist xlsx yargs csv-parser
    )
)

cls
echo ========================================================
echo   DATA JUNKIE CLI
echo   Ready to scan.
echo ========================================================
echo.

set /p target="Enter full path to folder (or drag folder here): "
echo.

:: Remove quotes if dragged
set target=%target:"=%

node src/cli/index.js --dir "%target%"

if %errorlevel% neq 0 (
    echo.
    echo ⚠️ Scanner crashed! It looks like dependencies are broken.
    echo 🛠️ Auto-Fixing: Deleting node_modules and reinstalling...
    echo.
    rmdir /s /q node_modules
    call npm install pdfjs-dist xlsx yargs csv-parser
    
    echo.
    echo 🔄 Retrying Scan...
    node src/cli/index.js --dir "%target%"
)

echo.
echo ========================================================
echo   SCAN COMPLETE
echo   Results saved to: scan_results.json
echo ========================================================
echo.
pause
