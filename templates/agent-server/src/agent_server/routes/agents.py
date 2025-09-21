"""
Agent management and execution routes.

This module handles all agent-related endpoints including:
- Listing available agents
- Getting agent information and schemas
- Creating and managing agent calls
"""

from fastapi import APIRouter, HTTPException, Request
from ..utils.agent_utils import get_agent_schema

router = APIRouter(tags=["agents"])


@router.get("/agents")
async def list_agents(request: Request):
    """
    List all registered agents with their metadata.

    Returns:
        Dictionary of all agents with their configurations and schemas
    """
    return request.app.state.agent_registry.list_agents()


@router.get("/agents/{agent_name}")
async def get_agent_info(agent_name: str, request: Request):
    """
    Get detailed information about a specific agent.

    Args:
        agent_name: Name of the agent to retrieve

    Returns:
        Detailed agent information including schemas and configuration

    Raises:
        HTTPException: If agent not found
    """
    agent = request.app.state.agent_registry.get_agent(agent_name)
    if not agent:
        raise HTTPException(status_code=404, detail=f"Agent '{agent_name}' not found")

    schema_info = get_agent_schema(agent)
    return {
        "name": agent.name,
        "description": agent.description,
        "mode": agent.mode,
        "max_iterations": agent.max_iterations,
        "verbose": agent.verbose,
        "tools": [tool.name for tool in agent.tools] if hasattr(agent, 'tools') else [],
        "input_schema": schema_info["input_schema"],
        "output_schema": schema_info["output_schema"],
    }


