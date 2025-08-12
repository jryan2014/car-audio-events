"""
Car Audio Events MCP Agent
AI agent that can interact with the Car Audio Events platform
"""

import asyncio
import os
from typing import Optional, Dict, Any
from dotenv import load_dotenv
from langchain_openai import ChatOpenAI
from langchain_anthropic import ChatAnthropic
from mcp_use import MCPAgent, MCPClient
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class CarAudioEventsAgent:
    """
    AI Agent for Car Audio Events Platform
    Can interact with the platform API, perform web searches, and manage files
    """
    
    def __init__(
        self,
        llm_provider: str = "openai",
        model: Optional[str] = None,
        config_file: Optional[str] = None,
        max_steps: int = 30,
        use_server_manager: bool = True
    ):
        """
        Initialize the Car Audio Events Agent
        
        Args:
            llm_provider: "openai" or "anthropic"
            model: Specific model to use (optional)
            config_file: Path to MCP configuration file
            max_steps: Maximum steps for agent execution
            use_server_manager: Enable dynamic server selection
        """
        # Load environment variables
        load_dotenv()
        
        # Set up LLM
        if llm_provider == "openai":
            model = model or "gpt-4o"
            self.llm = ChatOpenAI(model=model)
        elif llm_provider == "anthropic":
            model = model or "claude-3-5-sonnet-20240620"
            self.llm = ChatAnthropic(model=model)
        else:
            raise ValueError(f"Unsupported LLM provider: {llm_provider}")
        
        # Load MCP configuration
        if config_file:
            self.client = MCPClient.from_config_file(config_file)
        else:
            # Use default configuration
            config = self._get_default_config()
            self.client = MCPClient.from_dict(config)
        
        # Create agent
        self.agent = MCPAgent(
            llm=self.llm,
            client=self.client,
            max_steps=max_steps,
            use_server_manager=use_server_manager,
            verbose=True
        )
        
        logger.info(f"Car Audio Events Agent initialized with {llm_provider} ({model})")
    
    def _get_default_config(self) -> Dict[str, Any]:
        """Get default MCP configuration"""
        return {
            "mcpServers": {
                "car-audio-api": {
                    "url": "http://localhost:8000/mcp",
                    "headers": {
                        "Authorization": "Bearer car-audio-events-mcp-token"
                    }
                }
            }
        }
    
    async def run(self, query: str, max_steps: Optional[int] = None) -> str:
        """
        Run the agent with a query
        
        Args:
            query: The task or question for the agent
            max_steps: Override default max_steps
            
        Returns:
            Agent's response
        """
        try:
            logger.info(f"Running query: {query}")
            result = await self.agent.run(query, max_steps=max_steps)
            logger.info("Query completed successfully")
            return result
        except Exception as e:
            logger.error(f"Error running query: {str(e)}")
            raise
    
    async def stream(self, query: str):
        """
        Stream agent output for real-time feedback
        
        Args:
            query: The task or question for the agent
            
        Yields:
            Chunks of agent output
        """
        try:
            logger.info(f"Streaming query: {query}")
            async for chunk in self.agent.astream(query):
                if "messages" in chunk:
                    yield chunk["messages"]
                if "output" in chunk:
                    yield f"\n\nFinal Result: {chunk['output']}"
        except Exception as e:
            logger.error(f"Error streaming query: {str(e)}")
            raise
    
    async def close(self):
        """Clean up resources"""
        if self.client.sessions:
            await self.client.close_all_sessions()
            logger.info("All sessions closed")

# Specialized agent functions

async def create_event_agent():
    """Create an agent specialized for event management"""
    agent = CarAudioEventsAgent(
        llm_provider="openai",
        config_file="configs/car_audio_mcp.json"
    )
    return agent

async def create_analytics_agent():
    """Create an agent specialized for analytics"""
    agent = CarAudioEventsAgent(
        llm_provider="openai",
        model="gpt-4o",
        config_file="configs/car_audio_mcp.json"
    )
    return agent

async def create_support_agent():
    """Create an agent specialized for customer support"""
    agent = CarAudioEventsAgent(
        llm_provider="anthropic",
        model="claude-3-5-sonnet-20240620",
        config_file="configs/car_audio_mcp.json"
    )
    return agent

# Example usage functions

async def example_create_event():
    """Example: Create a new car audio event"""
    agent = await create_event_agent()
    
    try:
        result = await agent.run(
            "Create a new SPL competition event called 'Summer Bass Championship 2025' "
            "scheduled for June 15-16, 2025 in Miami, FL at the Miami Convention Center. "
            "Set early bird price at $50 and regular price at $75. "
            "Maximum 200 competitors allowed."
        )
        print(f"Result: {result}")
    finally:
        await agent.close()

async def example_get_analytics():
    """Example: Get event analytics"""
    agent = await create_analytics_agent()
    
    try:
        result = await agent.run(
            "Get analytics for all events in 2025, including registration counts, "
            "revenue totals, and attendance metrics. Summarize the key insights."
        )
        print(f"Analytics: {result}")
    finally:
        await agent.close()

async def example_handle_support():
    """Example: Handle a support ticket"""
    agent = await create_support_agent()
    
    try:
        result = await agent.run(
            "Create a support ticket for a user who is having trouble registering "
            "for an event. The issue is that the payment page is not loading. "
            "Set priority to high and category to 'payment_issues'."
        )
        print(f"Support Response: {result}")
    finally:
        await agent.close()

async def example_streaming():
    """Example: Stream agent output"""
    agent = CarAudioEventsAgent(llm_provider="openai")
    
    try:
        print("Streaming agent response:")
        async for chunk in agent.stream(
            "Find information about upcoming car audio events and summarize them"
        ):
            print(chunk, end="", flush=True)
    finally:
        await agent.close()

if __name__ == "__main__":
    # Run an example
    asyncio.run(example_create_event())