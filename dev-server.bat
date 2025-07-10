@echo off
echo Starting CAE Development Server with Memory Optimization...
echo.

REM Check if Node.js is available
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js and try again
    pause
    exit /b 1
)

REM Kill any existing Node.js processes
echo Cleaning up existing Node.js processes...
taskkill /f /im node.exe >nul 2>&1

REM Set memory optimization environment variables
set NODE_OPTIONS=--max-old-space-size=16384 --expose-gc --optimize-for-size --max-semi-space-size=512 --initial-old-space-size=4096
set VITE_MEMORY_MONITOR=true

echo Memory Settings:
echo - Max Old Space: 16GB
echo - Semi Space: 512MB
echo - Initial Old Space: 4GB
echo - GC Exposed: Yes
echo - Size Optimized: Yes
echo.

REM Start the development server
echo Starting Vite development server...
echo Press Ctrl+C to stop the server
echo.

npm run dev:memory

REM Cleanup on exit
echo.
echo Cleaning up Node.js processes...
taskkill /f /im node.exe >nul 2>&1

echo Server stopped.
pause 