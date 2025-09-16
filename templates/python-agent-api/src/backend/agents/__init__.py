"""
Simple agent examples using Opper SDK.

This module contains minimal examples of:
- Tools mode agent (dynamic reasoning)
- Flow mode agent (structured workflow)

These are just starting points - customize for your specific use case.
"""

from .example_agents import get_example_tools_agent, get_example_flow_agent

__all__ = ["get_example_tools_agent", "get_example_flow_agent"]

# For main.py compatibility
get_coding_agent = get_example_tools_agent
get_workflow_agent = get_example_flow_agent