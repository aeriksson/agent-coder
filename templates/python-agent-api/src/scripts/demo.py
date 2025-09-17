#!/usr/bin/env python3
"""
Demo script for testing the example agent.

This script demonstrates how to test agents via the API endpoints.
It shows the complete workflow: build agent → test via API → verify results.
"""

import httpx
import sys
import os

# API base URL - use service discovery in Polytope environment
API_BASE = os.getenv("API_URL", "http://{{ project-name }}:{{ port | default(3030) }}")

def print_header(title: str):
    """Print a formatted header."""
    print(f"\n{'='*60}")
    print(f"🔍 {title}")
    print(f"{'='*60}")

def print_section(title: str):
    """Print a formatted section header."""
    print(f"\n📋 {title}")
    print("-" * 40)

def test_agent_demo(goal: str, description: str):
    """Test the example agent with a goal."""
    print_section(f"Testing: {description}")

    try:
        with httpx.Client() as client:
            response = client.post(
                f"{API_BASE}/agents/example/test",
                json={"goal": goal},
                timeout=30
            )

        if response.status_code == 200:
            result = response.json()
            print("✅ Agent test successful")

            if result.get('success'):
                agent_result = result.get('result', 'No result returned')
                print(f"🤖 Agent response: {agent_result}")
            else:
                error_msg = result.get('error', 'Unknown error')
                print(f"❌ Agent error: {error_msg}")
        else:
            print(f"❌ API call failed: {response.status_code}")
            print(f"   Error: {response.text}")

    except httpx.ConnectError:
        print("❌ Could not connect to API. Make sure the service is running.")
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False

    return True

def test_api_health():
    """Test if the API is responding."""
    print_section("API Health Check")

    try:
        with httpx.Client() as client:
            response = client.get(f"{API_BASE}/health", timeout=10)
        if response.status_code == 200:
            print("✅ API is healthy and responding")
            return True
        else:
            print(f"❌ API health check failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Cannot reach API: {e}")
        print("   Make sure the service is running with: polytope run {{ project-name }}")
        return False

def main():
    """Run the complete demo.

    This demonstrates the example agent included with this template.
    Shows the complete workflow: build agent → test via API → verify results.
    """
    print_header("Example Agent Demo")

    # Check API health first
    if not test_api_health():
        sys.exit(1)

    # Test greet tool
    success = test_agent_demo(
        "Greet me with the name Alice",
        "Greeting Tool Test"
    )

    if not success:
        sys.exit(1)

    # Test calculate tool
    test_agent_demo(
        "Calculate 15 + 27",
        "Calculator Tool Test"
    )

    # Test count_words tool
    test_agent_demo(
        "Count the words in this sentence: 'The quick brown fox jumps over the lazy dog'",
        "Word Counter Tool Test"
    )

    print_header("Demo Complete! 🎉")
    print("The example agent is working correctly.")
    print("\nIMPORTANT: This is a demo agent for template demonstration purposes.")
    print("Replace src/backend/agents/example_agents.py with your own agent logic.")
    print("\nNext steps:")
    print("- Try the API endpoints directly at http://api:{{ port | default(3030) }}/docs")
    print("- Test with your own goals via POST /agents/example/test")
    print("- Build your own agents by modifying example_agents.py or creating new agents")

if __name__ == "__main__":
    main()
