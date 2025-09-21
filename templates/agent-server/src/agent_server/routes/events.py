"""
Event streaming and WebSocket routes.

This module handles real-time event streaming for agent calls:
- WebSocket connections for live event streams
- Event subscription and delivery
"""

from uuid import UUID
from fastapi import APIRouter, HTTPException, Request, WebSocket, WebSocketDisconnect
from ..models.calls import WSError, WSMessage
from ..utils import log

router = APIRouter(tags=["events"])
logger = log.get_logger(__name__)


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
    logger.debug(f"GET /calls/{call_id}/events request received")

    if not await request.app.state.call_repository.call_exists(call_id):
        logger.warning(f"Call {call_id} not found")
        raise HTTPException(status_code=404, detail=f"Call '{call_id}' not found")

    events = await request.app.state.call_repository.get_call_events(call_id)
    logger.debug(f"Returning {len(events)} events for call {call_id}")
    return {"events": events}


@router.websocket("/calls/{call_id}/events/stream")
async def stream_call_events(websocket: WebSocket, call_id: UUID):
    logger.debug(f"WebSocket connection request for call {call_id}")
    """
    Stream real-time events for a specific call via WebSocket.

    Args:
        websocket: WebSocket connection
        call_id: Unique identifier of the call to stream

    The WebSocket will receive messages in the following format:
    - {"type": "event", "data": <CallEvent>} for normal events
    - {"type": "error", "data": <WSError>} for errors

    The stream automatically closes when the call completes or errors.
    """
    await websocket.accept()
    logger.debug(f"WebSocket connection accepted for call {call_id}")

    try:
        # Access app state through websocket.app
        call_repository = websocket.app.state.call_repository

        # Check if call exists
        logger.debug(f"Checking if call {call_id} exists...")
        if not await call_repository.call_exists(call_id):
            logger.warning(f"Call {call_id} does not exist")
            error = WSError(
                error_type="call_not_found",
                error_message=f"Call with ID {call_id} does not exist",
                call_id=call_id,
            )
            message = WSMessage(type="error", data=error)
            await websocket.send_text(message.model_dump_json())
            await websocket.close()
            return

        # Send initial connection status
        logger.debug(f"Getting call status for {call_id}...")
        call = await call_repository.get_call(call_id)
        if call:
            logger.debug(
                f"Call {call_id} status: {call.status.value}, thoughts: {call.total_thoughts}, actions: {call.total_actions}"
            )
            status_message = WSMessage(
                type="status",
                data={"status": call.status.value, "call_id": str(call_id)},
            )
            await websocket.send_text(status_message.model_dump_json())
            logger.debug(f"Sent initial status message for call {call_id}")

        # Subscribe to events (will get historical events if call is already done)
        logger.debug(f"Starting subscription to events for call {call_id}")
        event_count = 0
        async for event in call_repository.subscribe_to_call(call_id):
            if event is None:  # Stream end sentinel
                logger.debug(
                    f"Received stream end sentinel for call {call_id} after {event_count} events"
                )
                break

            event_count += 1
            event_type = (
                event.event_type
                if hasattr(event, "event_type")
                else type(event).__name__
            )
            logger.debug(
                f"Streaming event #{event_count} for call {call_id}: type={event_type}, iteration={getattr(event, 'iteration', 'N/A')}"
            )
            message = WSMessage(type="event", data=event)
            await websocket.send_text(message.model_dump_json())
            logger.debug(f"Successfully sent event #{event_count} via WebSocket")

        logger.debug(
            f"WebSocket stream completed for call {call_id} with {event_count} total events"
        )

    except WebSocketDisconnect:
        logger.debug(f"WebSocket disconnected by client for call {call_id}")
    except Exception as e:
        logger.error(
            f"Error in WebSocket stream for call {call_id}: {e}", exc_info=True
        )
        error = WSError(
            error_type="stream_error", error_message=str(e), call_id=call_id
        )
        message = WSMessage(type="error", data=error)
        try:
            await websocket.send_text(message.model_dump_json())
        except Exception:
            pass  # Connection might be closed
