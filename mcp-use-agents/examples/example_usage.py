"""
Example usage of Car Audio Events MCP Agents
Demonstrates various agent capabilities
"""

import asyncio
import sys
sys.path.append('..')

from agents.car_audio_agent import (
    CarAudioEventsAgent,
    create_event_agent,
    create_analytics_agent,
    create_support_agent
)

async def example_basic_usage():
    """Basic agent usage example"""
    print("=== Basic Agent Usage ===\n")
    
    # Create a basic agent
    agent = CarAudioEventsAgent(
        llm_provider="openai",
        config_file="../configs/car_audio_mcp.json"
    )
    
    try:
        # Run a simple query
        result = await agent.run(
            "List all available API endpoints for the Car Audio Events platform"
        )
        print(f"Result: {result}\n")
    finally:
        await agent.close()

async def example_event_management():
    """Event management example"""
    print("=== Event Management ===\n")
    
    agent = await create_event_agent()
    
    try:
        # Create an event
        result = await agent.run(
            "Create a new SPL competition event called 'Winter Bass Wars 2025' "
            "scheduled for December 7-8, 2025 in Chicago, IL at the United Center. "
            "Set early bird price at $45 and regular price at $65. "
            "Maximum 150 competitors allowed."
        )
        print(f"Event Creation: {result}\n")
        
        # List events
        result = await agent.run(
            "List all SPL competition events scheduled for 2025"
        )
        print(f"Event List: {result}\n")
    finally:
        await agent.close()

async def example_analytics():
    """Analytics example"""
    print("=== Analytics Dashboard ===\n")
    
    agent = await create_analytics_agent()
    
    try:
        result = await agent.run(
            "Get comprehensive analytics for all events in 2025. "
            "Include registration counts, revenue breakdowns, and attendance metrics. "
            "Provide insights on growth trends and popular event types."
        )
        print(f"Analytics Report: {result}\n")
    finally:
        await agent.close()

async def example_support():
    """Support ticket example"""
    print("=== Support System ===\n")
    
    agent = await create_support_agent()
    
    try:
        result = await agent.run(
            "Create a high-priority support ticket for a user experiencing "
            "payment processing errors during event registration. "
            "The user's email is admin@caraudioevents.com and they're trying "
            "to register for the Summer Bass Championship."
        )
        print(f"Support Response: {result}\n")
    finally:
        await agent.close()

async def example_complex_workflow():
    """Complex multi-step workflow example"""
    print("=== Complex Workflow ===\n")
    
    agent = CarAudioEventsAgent(
        llm_provider="openai",
        model="gpt-4o",
        config_file="../configs/car_audio_mcp.json",
        max_steps=50  # Allow more steps for complex workflow
    )
    
    try:
        result = await agent.run(
            "Help me organize a complete car audio competition event: "
            "1. Create an event called 'National Championship 2025' for July 4th weekend in Las Vegas "
            "2. Set up pricing tiers (early bird $60, regular $80, late $100) "
            "3. Create competition classes for SPL, SQ, and Show categories "
            "4. Generate an analytics report for similar past events to predict attendance "
            "5. Set up a support FAQ for common competitor questions"
        )
        print(f"Workflow Result: {result}\n")
    finally:
        await agent.close()

async def example_streaming():
    """Streaming output example"""
    print("=== Streaming Output ===\n")
    
    agent = CarAudioEventsAgent(
        llm_provider="openai",
        config_file="../configs/car_audio_mcp.json"
    )
    
    try:
        print("Streaming response:\n")
        async for chunk in agent.stream(
            "Analyze the current state of car audio events and provide recommendations "
            "for improving competitor engagement and increasing event attendance."
        ):
            print(chunk, end="", flush=True)
        print("\n")
    finally:
        await agent.close()

async def main():
    """Run all examples"""
    print("=" * 50)
    print("Car Audio Events MCP Agent Examples")
    print("=" * 50)
    print()
    
    # Run examples based on user choice
    examples = {
        "1": ("Basic Usage", example_basic_usage),
        "2": ("Event Management", example_event_management),
        "3": ("Analytics", example_analytics),
        "4": ("Support System", example_support),
        "5": ("Complex Workflow", example_complex_workflow),
        "6": ("Streaming Output", example_streaming),
        "7": ("Run All Examples", None)
    }
    
    print("Available Examples:")
    for key, (name, _) in examples.items():
        if key != "7":
            print(f"{key}. {name}")
    print("7. Run All Examples")
    print("0. Exit")
    print()
    
    choice = input("Select an example to run (0-7): ").strip()
    
    if choice == "0":
        print("Exiting...")
        return
    elif choice == "7":
        # Run all examples
        for key, (name, func) in examples.items():
            if key != "7" and func:
                print(f"\n{'=' * 50}")
                await func()
                print()
    elif choice in examples and examples[choice][1]:
        await examples[choice][1]()
    else:
        print("Invalid choice. Please try again.")

if __name__ == "__main__":
    # Note: Ensure the FastAPI MCP server is running before executing these examples
    print("\n⚠️  Prerequisites:")
    print("1. Ensure the FastAPI MCP server is running (cd mcp-server && python main.py)")
    print("2. Set up your OpenAI or Anthropic API key in .env file")
    print()
    
    asyncio.run(main())