"""
Agent management and execution routes.

This module handles all agent-related endpoints including:
- Listing available agents
- Getting agent information and schemas
- Creating and managing agent calls
"""

from uuid import UUID
from fastapi import APIRouter, HTTPException, Request
from ..models.calls import CallSpec, CallSummary, CallListRequest, CallListResponse, CallStatus
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
        "workflow_id": agent.flow.id if hasattr(agent, 'flow') and agent.flow else None,
        "input_schema": schema_info["input_schema"],
        "output_schema": schema_info["output_schema"],
    }


@router.post("/agents/{agent_name}/calls", response_model=CallSummary)
async def create_agent_call(agent_name: str, spec: CallSpec, request: Request):
    """
    Create a new agent call and return immediately.

    The agent execution happens asynchronously in the background.

    Args:
        agent_name: Name of the agent to execute
        spec: Call specification with input data

    Returns:
        Call summary with tracking ID

    Raises:
        HTTPException: If agent not found
    """
    # Validate agent exists
    agent = request.app.state.agent_registry.get_agent(agent_name)
    if not agent:
        raise HTTPException(status_code=404, detail=f"Agent '{agent_name}' not found")

    # Create call spec with agent name
    spec.agent_name = agent_name

    # Create call in repository
    call = await request.app.state.call_repository.create_call(spec)

    # Start agent execution in background with cancellation support
    request.app.state.agent_registry.start_agent_execution(
        agent_name, call.id, spec.input_data
    )

    return call


@router.get("/agents/{agent_name}/calls", response_model=CallListResponse)
async def list_agent_calls(
    agent_name: str,
    request: Request,
    status: CallStatus | None = None,
    limit: int = 50,
    offset: int = 0
):
    """
    List calls for a specific agent.

    Args:
        agent_name: Name of the agent
        status: Optional filter by call status
        limit: Maximum number of results
        offset: Pagination offset

    Returns:
        List of calls for the agent

    Raises:
        HTTPException: If agent not found
    """
    # Validate agent exists
    agent = request.app.state.agent_registry.get_agent(agent_name)
    if not agent:
        raise HTTPException(status_code=404, detail=f"Agent '{agent_name}' not found")

    request_params = CallListRequest(
        agent_name=agent_name,
        status=status,
        limit=limit,
        offset=offset
    )
    return await request.app.state.call_repository.list_calls(request_params)