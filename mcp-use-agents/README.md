# MCP-Use Agents for Car Audio Events Platform

## Overview

This directory contains MCP-Use agents that enable AI-powered interactions with the Car Audio Events Platform. These agents can connect to the FastAPI MCP server and perform various tasks through natural language commands.

## Features

- **Event Management Agent**: Create and manage car audio competition events
- **Analytics Agent**: Generate comprehensive analytics reports
- **Support Agent**: Handle customer support tickets
- **Multi-Agent Orchestration**: Coordinate multiple agents for complex workflows
- **LLM Flexibility**: Support for OpenAI and Anthropic models
- **Streaming Support**: Real-time output streaming for better user experience

## Architecture

```
mcp-use-agents/
├── agents/
│   └── car_audio_agent.py      # Main agent implementation
├── configs/
│   └── car_audio_mcp.json      # MCP server configuration
├── examples/
│   └── example_usage.py        # Usage examples
├── .env.example                 # Environment configuration template
├── requirements.txt             # Python dependencies
└── README.md                    # This file
```

## Prerequisites

1. **Python 3.10+** installed
2. **FastAPI MCP Server** running (see `../mcp-server/`)
3. **API Keys** for OpenAI or Anthropic (depending on your choice)
4. **MCP-Use** SDK installed

## Installation

### Step 1: Install Dependencies

```bash
cd mcp-use-agents
pip install -r requirements.txt
```

### Step 2: Configure Environment

1. Copy the example configuration:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and add your API keys:
   ```env
   # For OpenAI
   OPENAI_API_KEY=your-openai-api-key
   
   # For Anthropic
   ANTHROPIC_API_KEY=your-anthropic-api-key
   ```

### Step 3: Start the MCP Server

Ensure the FastAPI MCP server is running:

```bash
cd ../mcp-server
python main.py
```

The server should be accessible at `http://localhost:8000`

## Usage

### Basic Usage

```python
from agents.car_audio_agent import CarAudioEventsAgent

# Create an agent
agent = CarAudioEventsAgent(
    llm_provider="openai",  # or "anthropic"
    config_file="configs/car_audio_mcp.json"
)

# Run a query
result = await agent.run(
    "Create a new SPL competition event for summer 2025"
)
print(result)

# Clean up
await agent.close()
```

### Specialized Agents

```python
from agents.car_audio_agent import (
    create_event_agent,
    create_analytics_agent,
    create_support_agent
)

# Event Management
event_agent = await create_event_agent()
await event_agent.run("Create a championship event")

# Analytics
analytics_agent = await create_analytics_agent()
await analytics_agent.run("Generate Q1 2025 report")

# Support
support_agent = await create_support_agent()
await support_agent.run("Handle payment issue ticket")
```

### Streaming Output

```python
agent = CarAudioEventsAgent(llm_provider="openai")

async for chunk in agent.stream(
    "Analyze event trends and provide recommendations"
):
    print(chunk, end="", flush=True)
```

## Running Examples

The `examples/` directory contains comprehensive usage examples:

```bash
cd mcp-use-agents/examples
python example_usage.py
```

Available examples:
1. Basic Usage - Simple agent queries
2. Event Management - Creating and managing events
3. Analytics - Generating reports
4. Support System - Handling tickets
5. Complex Workflow - Multi-step operations
6. Streaming Output - Real-time responses

## Configuration

### MCP Server Configuration

The `configs/car_audio_mcp.json` file defines the MCP servers:

```json
{
  "mcpServers": {
    "car-audio-api": {
      "url": "http://localhost:8000/mcp",
      "headers": {
        "Authorization": "Bearer car-audio-events-mcp-token"
      }
    },
    "playwright": {
      "command": "npx",
      "args": ["@playwright/mcp@latest"]
    },
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem"],
      "env": {
        "ALLOWED_DIRECTORIES": "E:\\2025-car-audio-events\\car-audio-events"
      }
    }
  }
}
```

### Agent Parameters

- `llm_provider`: Choose between "openai" or "anthropic"
- `model`: Specific model version (optional)
- `config_file`: Path to MCP configuration
- `max_steps`: Maximum execution steps (default: 30)
- `use_server_manager`: Enable dynamic server selection (default: true)

## API Capabilities

The agents can interact with these Car Audio Events API endpoints:

### Events
- Create new competition events
- List and filter events
- Update event details
- Manage event schedules

### Registrations
- Register competitors
- List registrations
- Update registration status
- Handle cancellations

### Analytics
- Generate event reports
- Track revenue metrics
- Monitor attendance
- Analyze trends

### Payments
- Process registrations payments
- Handle refunds
- Generate invoices
- Track payment status

### Support
- Create support tickets
- Update ticket status
- Assign priorities
- Track resolutions

## Best Practices

1. **API Keys Security**: Never commit `.env` files with real API keys
2. **Error Handling**: Always use try-finally blocks to ensure cleanup
3. **Resource Management**: Close agents after use to free resources
4. **Rate Limiting**: Be mindful of API rate limits
5. **Logging**: Enable verbose mode for debugging

## Troubleshooting

### Common Issues

1. **Connection Error to MCP Server**
   - Ensure the FastAPI MCP server is running
   - Check the server URL in configuration
   - Verify network connectivity

2. **Authentication Failed**
   - Check API keys in `.env` file
   - Verify MCP token matches server configuration

3. **Import Errors**
   - Install all dependencies: `pip install -r requirements.txt`
   - Ensure Python 3.10+ is being used

4. **Agent Timeout**
   - Increase `max_steps` parameter
   - Check if MCP server is responding
   - Review agent logs for errors

### Debug Mode

Enable detailed logging:

```python
import logging
logging.basicConfig(level=logging.DEBUG)

agent = CarAudioEventsAgent(verbose=True)
```

## Integration with BMAD

These agents integrate with the BMAD Method framework:

```bash
# Use BMAD orchestrator to coordinate agents
*orchestrator
"Use the Car Audio Events agent to create a summer championship event"

# Direct agent invocation
*event-agent
"Create SPL competition for Miami"
```

## Advanced Features

### Multi-Agent Workflows

Coordinate multiple agents for complex tasks:

```python
# Create specialized agents
event_agent = await create_event_agent()
analytics_agent = await create_analytics_agent()

# Coordinate workflow
event_result = await event_agent.run("Create event")
analytics_result = await analytics_agent.run(
    f"Analyze similar events to {event_result}"
)
```

### Custom Agent Configuration

Create agents with specific configurations:

```python
custom_agent = CarAudioEventsAgent(
    llm_provider="anthropic",
    model="claude-3-opus-20240229",
    max_steps=100,
    use_server_manager=True
)
```

### Parallel Processing

Run multiple queries in parallel:

```python
import asyncio

async def parallel_queries():
    agent = CarAudioEventsAgent()
    
    tasks = [
        agent.run("List all events"),
        agent.run("Get analytics"),
        agent.run("Check support tickets")
    ]
    
    results = await asyncio.gather(*tasks)
    return results
```

## Performance Considerations

- **Caching**: Results are cached within sessions
- **Connection Pooling**: HTTP connections are reused
- **Async Operations**: All operations are async for efficiency
- **Resource Limits**: Default 30 steps per query

## Security

- Bearer token authentication for API access
- Environment-based configuration
- No hardcoded credentials
- Secure communication with MCP servers

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review example code
3. Check MCP server logs
4. Consult BMAD documentation

## License

Part of the Car Audio Events Platform

---

**Version**: 1.0.0  
**Last Updated**: January 2025  
**Status**: Ready for Use