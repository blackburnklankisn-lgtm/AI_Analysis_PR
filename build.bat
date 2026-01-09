@echo off
echo ========================================
echo AI PR Diagnostic - Build Script
echo ========================================

echo.
echo [Step 1/4] Building Python Backend...
echo ----------------------------------------
cd /d "%~dp0backend"
call .\venv\Scripts\activate
pyinstaller --onefile --name backend --noconsole --add-data "src;src" main.py
if errorlevel 1 (
    echo ERROR: Backend build failed!
    pause
    exit /b 1
)
echo Backend build complete!

echo.
echo [Step 2/4] Building Next.js Frontend...
echo ----------------------------------------
cd /d "%~dp0frontend"
call npm run build
if errorlevel 1 (
    echo ERROR: Frontend build failed!
    pause
    exit /b 1
)
echo Frontend build complete!

echo.
echo [Step 3/4] Copying files to Electron...
echo ----------------------------------------
cd /d "%~dp0electron"

:: Copy backend executable
if not exist "backend\dist" mkdir "backend\dist"
copy /Y "..\backend\dist\backend.exe" "backend\dist\backend.exe"

:: Copy frontend output
if exist "frontend" rmdir /S /Q "frontend"
mkdir "frontend"
xcopy /E /I /Y "..\frontend\out" "frontend\out"

echo Files copied!

echo.
echo [Step 4/4] Building Electron Installer...
echo ----------------------------------------
call npm install
call npm run build
if errorlevel 1 (
    echo ERROR: Electron build failed!
    pause
    exit /b 1
)

echo.
echo ========================================
echo BUILD COMPLETE!
echo ========================================
echo Installer location: electron\dist\
echo.
pause
