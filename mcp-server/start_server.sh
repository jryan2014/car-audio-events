#!/bin/bash

echo "Starting Car Audio Events MCP Server..."
echo "====================================="

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Install dependencies
echo "Installing dependencies..."
pip install -r requirements.txt

# Set environment variables
export MCP_HOST=0.0.0.0
export MCP_PORT=8000
export MCP_API_TOKEN=car-audio-events-mcp-token

# Start the server
echo ""
echo "Starting FastAPI MCP Server..."
echo "Server will be available at:"
echo "- MCP Endpoint: http://localhost:8000/mcp"
echo "- API Docs: http://localhost:8000/docs"
echo "- Redoc: http://localhost:8000/redoc"
echo ""
echo "Press Ctrl+C to stop the server"
echo "====================================="
echo ""

python main.py