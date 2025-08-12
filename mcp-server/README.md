# Car Audio Events FastAPI MCP Server

## Overview

This is a FastAPI MCP (Model Context Protocol) server for the Car Audio Events Platform. It exposes API endpoints as MCP tools, allowing AI agents to interact with the platform's functionality programmatically.

## Features

- **Event Management**: Create and manage car audio competition events
- **Registration System**: Handle competitor registrations
- **Analytics Dashboard**: Access event and platform analytics
- **Payment Processing**: Process payments for registrations
- **Support System**: Create and manage support tickets
- **Authentication**: Secure API access with bearer tokens
- **MCP Integration**: Seamless integration with AI agents through MCP protocol

## Architecture

```
mcp-server/
├── main.py                 # Main FastAPI application and MCP server
├── api/                    # API route modules
├── models/                 # Pydantic models
├── services/               # Business logic and services
│   └── supabase_service.py # Supabase database integration
├── utils/                  # Utility functions
├── requirements.txt        # Python dependencies
├── .env.example           # Environment variables template
├── mcp-config.json        # MCP client configuration
├── start_server.bat       # Windows startup script
└── start_server.sh        # Unix/Linux startup script
```

## Installation

### Prerequisites

- Python 3.10 or higher
- pip package manager
- Access to Supabase project (optional, will run in mock mode without it)

### Setup Steps

1. **Navigate to the MCP server directory:**
   ```bash
   cd mcp-server
   ```

2. **Create a virtual environment:**
   ```bash
   python -m venv venv
   ```

3. **Activate the virtual environment:**
   - Windows:
     ```bash
     venv\Scripts\activate
     ```
   - Unix/Linux/Mac:
     ```bash
     source venv/bin/activate
     ```

4. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

5. **Configure environment variables:**
   - Copy `.env.example` to `.env`
   - Fill in your configuration values:
     ```env
     MCP_HOST=0.0.0.0
     MCP_PORT=8000
     MCP_API_TOKEN=your-secure-token-here
     VITE_SUPABASE_URL=your-supabase-url
     SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
     ```

## Running the Server

### Option 1: Using Startup Scripts

**Windows:**
```bash
start_server.bat
```

**Unix/Linux/Mac:**
```bash
chmod +x start_server.sh
./start_server.sh
```

### Option 2: Direct Python Execution

```bash
python main.py
```

### Option 3: Using Uvicorn

```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

## Accessing the Server

Once running, the server provides several endpoints:

- **MCP Endpoint**: `http://localhost:8000/mcp` - For AI agent integration
- **API Documentation**: `http://localhost:8000/docs` - Interactive Swagger UI
- **Alternative Docs**: `http://localhost:8000/redoc` - ReDoc documentation
- **Health Check**: `http://localhost:8000/health` - Server status

## API Endpoints

### Events
- `POST /api/events` - Create a new event
- `GET /api/events` - List events with optional filters

### Registrations
- `POST /api/registrations` - Register a competitor
- `GET /api/registrations` - List registrations

### Analytics
- `POST /api/analytics` - Get analytics data

### Payments
- `POST /api/payments` - Process a payment

### Support
- `POST /api/support` - Create a support ticket

## Authentication

All POST endpoints require authentication via Bearer token. Include the token in your request headers:

```http
Authorization: Bearer your-mcp-api-token
```

## MCP Integration

### For Claude Desktop

Add to your Claude configuration file:

```json
{
  "mcpServers": {
    "car-audio-events": {
      "command": "python",
      "args": ["path/to/mcp-server/main.py"],
      "env": {
        "MCP_API_TOKEN": "your-token"
      }
    }
  }
}
```

### For Other MCP Clients

Use the provided `mcp-config.json` as a reference for configuring your MCP client.

## Development

### Adding New Endpoints

1. Define Pydantic models in `models/`
2. Create service functions in `services/`
3. Add API routes in `main.py`
4. Update documentation

### Testing

Test the API using:
- Swagger UI at `/docs`
- curl commands
- Postman or similar API testing tools

Example curl command:
```bash
curl -X POST "http://localhost:8000/api/events" \
  -H "Authorization: Bearer your-token" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Summer Bass Championship",
    "event_type": "SPL",
    "start_date": "2025-06-15",
    "end_date": "2025-06-16",
    "location": "Miami, FL",
    "venue_name": "Miami Convention Center",
    "early_bird_price": 50.00,
    "regular_price": 75.00
  }'
```

## Mock Mode

The server can run in mock mode without Supabase credentials. It will return simulated data for testing and development purposes.

## Security Considerations

1. **Never commit `.env` files** with real credentials
2. **Use strong API tokens** in production
3. **Configure CORS** appropriately for your environment
4. **Use HTTPS** in production deployments
5. **Implement rate limiting** for production use

## Troubleshooting

### Common Issues

1. **Port already in use:**
   - Change the port in `.env` or command line arguments

2. **Import errors:**
   - Ensure all dependencies are installed: `pip install -r requirements.txt`

3. **Supabase connection issues:**
   - Verify credentials in `.env`
   - Check network connectivity
   - Server will run in mock mode if credentials are invalid

4. **MCP client can't connect:**
   - Verify the server is running
   - Check firewall settings
   - Ensure correct token is configured

## Support

For issues related to:
- **FastAPI MCP**: See [FastAPI MCP Documentation](https://fastapi-mcp.tadata.com/)
- **Car Audio Events Platform**: Contact platform administrators
- **This implementation**: Check the project's issue tracker

## License

This MCP server is part of the Car Audio Events Platform and follows the same licensing terms.

---

**Version**: 1.0.0  
**Last Updated**: January 2025