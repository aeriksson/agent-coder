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
from ..models.calls import CallSummary, CallStatus
from ..utils import log

router = APIRouter(tags=["calls"])
logger = log.get_logger(__name__)


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


@router.get("/calls/{call_id}/events")
async def get_call_events(call_id: UUID, request: Request):
    """
    Get all events for a call.

    Args:
        call_id: Unique identifier of the call

    Returns:
        List of all events for the call

    Raises:
        HTTPException: If call not found
    """
    logger.info(f"GET /calls/{call_id}/events request received")

    if not await request.app.state.call_repository.call_exists(call_id):
        logger.warning(f"Call {call_id} not found")
        raise HTTPException(status_code=404, detail=f"Call '{call_id}' not found")

    events = await request.app.state.call_repository.get_call_events(call_id)
    logger.info(f"Returning {len(events)} events for call {call_id}")

    # Log event types for debugging
    event_types = {}
    for event in events:
        event_type = event.event_type if hasattr(event, 'event_type') else type(event).__name__
        event_types[event_type] = event_types.get(event_type, 0) + 1
    logger.debug(f"Event type breakdown: {event_types}")

    return {"events": events}