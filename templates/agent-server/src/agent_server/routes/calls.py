"""
Call management routes.

This module handles call lifecycle operations:
- Retrieving call details
- Cancelling running calls
- Deleting call records
- Listing call events
"""

from uuid import UUID
from fastapi import APIRouter, HTTPException, Request
from ..models.calls import CallSummary, CallStatus, CallListRequest, CallListResponse
from ..utils.dynamic_models import create_dynamic_call_spec
from ..agents import AGENT_DEFINITIONS
from ..utils import log

# Generate the dynamic model from registered agents
DynamicCallSpec = create_dynamic_call_spec(AGENT_DEFINITIONS)

router = APIRouter(tags=["calls"])
logger = log.get_logger(__name__)


@router.post("/agents/{agent_name}/calls", response_model=CallSummary)
async def create_agent_call(agent_name: str, spec: DynamicCallSpec, request: Request):
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

    spec.agent_name = agent_name
    call = await request.app.state.call_repository.create_call(spec)

    # Start agent execution in background with cancellation support
    request.app.state.agent_registry.start_agent_execution(
        agent_name, call.id, spec.input_data, spec.max_iterations
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


@router.get("/calls/{call_id}", response_model=CallSummary)
async def get_call(call_id: UUID, request: Request):
    """
    Get call details by ID.

    Args:
        call_id: Unique identifier of the call

    Returns:
        Complete call information

    Raises:
        HTTPException: If call not found
    """
    call = await request.app.state.call_repository.get_call(call_id)
    if not call:
        raise HTTPException(status_code=404, detail=f"Call '{call_id}' not found")
    return call


@router.post("/calls/{call_id}/cancel", response_model=CallSummary)
async def cancel_call(call_id: UUID, request: Request):
    """
    Cancel a running call.

    Args:
        call_id: Unique identifier of the call to cancel

    Returns:
        Updated call information

    Raises:
        HTTPException: If call not found or already finished
    """
    call = await request.app.state.call_repository.get_call(call_id)
    if not call:
        raise HTTPException(status_code=404, detail=f"Call '{call_id}' not found")

    if call.status not in (CallStatus.PENDING, CallStatus.RUNNING):
        raise HTTPException(status_code=400, detail=f"Call is already {call.status.value}")

    # Cancel the running task if it exists
    cancelled = await request.app.state.agent_registry.cancel_agent_execution(call_id)

    # Update call status in repository
    await request.app.state.call_repository.register_call_cancelled(call_id)

    # Return updated call info
    updated_call = await request.app.state.call_repository.get_call(call_id)

    # Add cancellation info to response
    if updated_call:
        if cancelled:
            logger.info(f"Successfully cancelled execution for call {call_id}")
        else:
            logger.info(f"Call {call_id} marked as cancelled (task was not running)")

    return updated_call


@router.delete("/calls/{call_id}")
async def delete_call(call_id: UUID, request: Request):
    """
    Delete a call and all its events.

    Note: Full deletion is not yet implemented. This endpoint currently
    only verifies the call exists.

    Args:
        call_id: Unique identifier of the call to delete

    Returns:
        Success status

    Raises:
        HTTPException: If call not found
    """
    call = await request.app.state.call_repository.get_call(call_id)
    if not call:
        raise HTTPException(status_code=404, detail=f"Call '{call_id}' not found")

    # Full deletion could be implemented here if needed
    # await request.app.state.call_repository.delete_call(call_id)

    return {"success": True, "message": "Call deletion not yet implemented"}


