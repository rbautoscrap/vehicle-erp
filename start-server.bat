@echo off
setlocal
cd /d "%~dp0.."

echo ========================================
echo  KOREA AUTO AUTION - local server
echo ========================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is not installed or not in PATH.
  echo Install Node.js 18+ and try again.
  pause
  exit /b 1
)

if not exist "node_modules\next" (
  echo Installing dependencies...
  call npm install
  if errorlevel 1 (
    echo npm install failed.
    pause
    exit /b 1
  )
)

echo Starting server (auto-recovers if cache breaks)...
echo Open: http://localhost:3000
echo Keep this window open while using the site.
echo.

call npm run dev -- --clean
echo.
echo Server stopped.
pause
