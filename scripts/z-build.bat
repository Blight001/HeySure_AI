@echo off
chcp 65001 >nul
cd ..
title HeySure AI - Packaging to EXE
echo ============================================
echo   HeySure AI - Packaging Process
echo ============================================
echo.

echo [1/3] Installing dependencies...
call cnpm install
if %errorlevel% neq 0 (
    echo [Error] Dependency installation failed.
    pause
    exit /b %errorlevel%
)

echo.
echo [2/3] Building source code...
call npm run build
if %errorlevel% neq 0 (
    echo [Error] Source build failed.
    pause
    exit /b %errorlevel%
)

echo.
echo [3/3] Building Windows EXE...
call npm run build:win
if %errorlevel% neq 0 (
    echo [Error] Build failed.
    pause
    exit /b %errorlevel%
)

echo.
echo ============================================
echo   Build Successful!
echo   The executable can be found in the 'release' folder.
echo ============================================
echo.
pause
