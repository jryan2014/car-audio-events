@echo off
echo Starting Car Audio Events MCP Server...
echo =====================================

REM Check if virtual environment exists
if not exist "venv" (
    echo Creating virtual environment...
    python -m venv venv
)

REM Activate virtual environment
call venv\Scripts\activate

REM Install dependencies
echo Installing dependencies...
pip install -r requirements.txt

REM Set environment variables
set MCP_HOST=0.0.0.0
set MCP_PORT=8000
set MCP_API_TOKEN=car-audio-events-mcp-token

REM Start the server
echo.
echo Starting FastAPI MCP Server...
echo Server will be available at:
echo - MCP Endpoint: http://localhost:8000/mcp
echo - API Docs: http://localhost:8000/docs
echo - Redoc: http://localhost:8000/redoc
echo.
echo Press Ctrl+C to stop the server
echo =====================================
echo.

python main.py