"""
Basic tests for agent functionality.

These are simple smoke tests. Add more comprehensive tests for your specific agents.
"""

import pytest
from backend.agents import get_example_tools_agent, get_example_flow_agent


def test_tools_agent_creation():
    """Test that tools agent can be created."""
    agent = get_example_tools_agent()
    assert agent.name == "ExampleToolsAgent"
    assert len(agent.tools) > 0


def test_flow_agent_creation():
    """Test that flow agent can be created."""
    agent = get_example_flow_agent()
    assert agent.name == "ExampleFlowAgent"
    assert agent.flow is not None


@pytest.mark.asyncio
async def test_tools_agent_basic_processing():
    """Test basic tools agent processing."""
    agent = get_example_tools_agent()
    agent.verbose = False
    agent.max_iterations = 3

    # Simple test that should work with example tools
    result = agent.process("Say hello to test")
    assert result is not None


@pytest.mark.asyncio
async def test_flow_agent_basic_processing():
    """Test basic flow agent processing."""
    agent = get_example_flow_agent()
    agent.verbose = False

    # Simple test with workflow
    result = agent.process("Test message")
    assert result is not None
