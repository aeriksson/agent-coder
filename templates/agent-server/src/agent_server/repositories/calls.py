"""
Repository interface and implementations for agent calls.
"""

import asyncio
from abc import ABC, abstractmethod
from typing import AsyncIterator
from uuid import UUID
from datetime import datetime, timezone

from ..models.calls import (
    CallSpec,
    CallSummary,
    CallThought,
    CallAction,
    CallResult,
    CallError,
    CallEvent,
    CallStatus,
    CallListRequest,
    CallListResponse,
    WSError,
)


class CallRepository(ABC):
    """Abstract repository for managing agent calls and events."""

    @abstractmethod
    async def create_call(self, spec: CallSpec) -> CallSummary:
        """Create a new call from specification."""
        pass

    @abstractmethod
    async def get_call(self, call_id: UUID) -> CallSummary | None:
        """Get call summary by ID."""
        pass

    @abstractmethod
    async def register_call_started(self, call_id: UUID) -> None:
        """Mark call as started/running."""
        pass

    @abstractmethod
    async def append_call_thought(self, call_id: UUID, thought: CallThought) -> None:
        """Append a thought to the call."""
        pass

    @abstractmethod
    async def append_call_action(self, call_id: UUID, action: CallAction) -> None:
        """Append an action to the call."""
        pass

    @abstractmethod
    async def register_call_done(self, call_id: UUID, result: CallResult) -> None:
        """Mark call as completed with result."""
        pass

    @abstractmethod
    async def register_call_error(self, call_id: UUID, error: CallError) -> None:
        """Mark call as failed with error."""
        pass

    @abstractmethod
    async def register_call_cancelled(self, call_id: UUID) -> None:
        """Mark call as cancelled."""
        pass

    @abstractmethod
    async def list_calls(self, request: CallListRequest) -> CallListResponse:
        """List calls with filtering and pagination."""
        pass

    @abstractmethod
    async def get_call_events(self, call_id: UUID) -> list[CallEvent]:
        """Get all events for a call in chronological order."""
        pass

    @abstractmethod
    async def subscribe_to_call(self, call_id: UUID) -> AsyncIterator[CallEvent]:
        """Subscribe to real-time events for a call."""
        pass

    @abstractmethod
    async def call_exists(self, call_id: UUID) -> bool:
        """Check if call exists."""
        pass

    @abstractmethod
    async def is_call_active(self, call_id: UUID) -> bool:
        """Check if call is still active (pending or running)."""
        pass


class InMemoryCallRepository(CallRepository):
    """In-memory implementation of CallRepository."""

    def __init__(self):
        self._calls: dict[UUID, CallSummary] = {}
        self._events: dict[UUID, list[CallEvent]] = {}
        self._subscribers: dict[UUID, list[asyncio.Queue]] = {}

    async def create_call(self, spec: CallSpec) -> CallSummary:
        call = CallSummary(
            agent_name=spec.agent_name,
            input_data=spec.input_data.model_dump()
            if hasattr(spec.input_data, "model_dump")
            else spec.input_data,
            status=CallStatus.PENDING,
        )
        self._calls[call.id] = call
        self._events[call.id] = []
        self._subscribers[call.id] = []
        return call

    async def get_call(self, call_id: UUID) -> CallSummary | None:
        return self._calls.get(call_id)

    async def register_call_started(self, call_id: UUID) -> None:
        if call := self._calls.get(call_id):
            call.status = CallStatus.RUNNING
            call.started_at = datetime.now(timezone.utc)
            await self._emit_status_change(
                call_id, CallStatus.PENDING, CallStatus.RUNNING
            )

    async def append_call_thought(self, call_id: UUID, thought: CallThought) -> None:
        from ..utils import log

        logger = log.get_logger(__name__)

        if call_id not in self._calls:
            logger.error(f"Cannot append thought - call {call_id} not found")
            return

        # Update sequence number
        thought.sequence = len(
            [e for e in self._events[call_id] if isinstance(e, CallThought)]
        )
        # Update sequence number quietly

        # Update call stats
        call = self._calls[call_id]
        call.total_thoughts += 1

        # Store event and notify subscribers
        self._events[call_id].append(thought)
        # Store event and notify subscribers
        await self._notify_subscribers(call_id, thought)

    async def append_call_action(self, call_id: UUID, action: CallAction) -> None:
        from ..utils import log

        logger = log.get_logger(__name__)

        if call_id not in self._calls:
            logger.error(f"Cannot append action - call {call_id} not found")
            return

        # Update sequence number
        action.sequence = len(
            [e for e in self._events[call_id] if isinstance(e, CallAction)]
        )
        # Update sequence number quietly

        # Update call stats
        call = self._calls[call_id]
        call.total_actions += 1

        # Store event and notify subscribers
        self._events[call_id].append(action)
        # Store event and notify subscribers
        await self._notify_subscribers(call_id, action)

    async def register_call_done(self, call_id: UUID, result: CallResult) -> None:
        if call := self._calls.get(call_id):
            # Store result event and notify BEFORE changing status
            self._events[call_id].append(result)
            await self._notify_subscribers(call_id, result)

            # Now change status and emit status change
            old_status = call.status
            call.status = CallStatus.COMPLETED
            call.completed_at = datetime.now(timezone.utc)
            if call.started_at:
                call.execution_time_ms = int(
                    (call.completed_at - call.started_at).total_seconds() * 1000
                )

            await self._emit_status_change(call_id, old_status, CallStatus.COMPLETED)

            # Clean up subscribers for completed call
            await self._cleanup_subscribers(call_id)

    async def register_call_error(self, call_id: UUID, error: CallError) -> None:
        if call := self._calls.get(call_id):
            # Store error event and notify BEFORE changing status
            self._events[call_id].append(error)
            await self._notify_subscribers(call_id, error)

            # Now change status and emit status change
            old_status = call.status
            call.status = CallStatus.FAILED
            call.completed_at = datetime.now(timezone.utc)
            if call.started_at:
                call.execution_time_ms = int(
                    (call.completed_at - call.started_at).total_seconds() * 1000
                )
            call.error = error.error_message

            await self._emit_status_change(call_id, old_status, CallStatus.FAILED)

            # Clean up subscribers for failed call
            await self._cleanup_subscribers(call_id)

    async def register_call_cancelled(self, call_id: UUID) -> None:
        if call := self._calls.get(call_id):
            old_status = call.status
            call.status = CallStatus.CANCELLED
            call.completed_at = datetime.now(timezone.utc)
            if call.started_at:
                call.execution_time_ms = int(
                    (call.completed_at - call.started_at).total_seconds() * 1000
                )

            await self._emit_status_change(call_id, old_status, CallStatus.CANCELLED)

            # Clean up subscribers for cancelled call
            await self._cleanup_subscribers(call_id)

    async def list_calls(self, request: CallListRequest) -> CallListResponse:
        calls = list(self._calls.values())

        # Apply filters
        if request.agent_name:
            calls = [c for c in calls if c.agent_name == request.agent_name]
        if request.status:
            calls = [c for c in calls if c.status == request.status]

        # Sort by creation time (newest first)
        calls.sort(key=lambda c: c.created_at, reverse=True)

        # Apply pagination
        total = len(calls)
        start = request.offset
        end = start + request.limit
        paginated_calls = calls[start:end]

        return CallListResponse(
            calls=paginated_calls,
            total=total,
            offset=request.offset,
            limit=request.limit,
        )

    async def get_call_events(self, call_id: UUID) -> list[CallEvent]:
        from ..utils import log

        logger = log.get_logger(__name__)

        events = self._events.get(call_id, [])
        logger.info(f"get_call_events for {call_id}: returning {len(events)} events")
        for i, event in enumerate(events):
            event_type = (
                event.event_type
                if hasattr(event, "event_type")
                else type(event).__name__
            )
            logger.debug(
                f"  Event {i + 1}: {event_type}, iteration={getattr(event, 'iteration', 'N/A')}"
            )
        # Sort by timestamp, then by iteration for events with same timestamp
        return sorted(events, key=lambda e: (e.timestamp, getattr(e, "iteration", 0)))

    async def subscribe_to_call(self, call_id: UUID) -> AsyncIterator[CallEvent]:
        from ..utils import log
        from ..models.calls import CallStatusChange

        logger = log.get_logger(__name__)

        logger.debug(f"Subscribe request for call {call_id}")
        if call_id not in self._calls:
            logger.warning(f"Call {call_id} not found in repository")
            return

        # First, yield all historical events
        historical_events = self._events.get(call_id, [])
        logger.debug(
            f"Found {len(historical_events)} historical events for call {call_id}"
        )
        for i, event in enumerate(historical_events):
            event_type = (
                event.event_type
                if hasattr(event, "event_type")
                else type(event).__name__
            )
            logger.debug(
                f"Yielding historical event {i + 1}/{len(historical_events)}: {event_type}"
            )
            yield event

        # If the call is already done, return immediately
        call = self._calls.get(call_id)
        if call and call.status in (
            CallStatus.COMPLETED,
            CallStatus.FAILED,
            CallStatus.CANCELLED,
        ):
            logger.debug(
                f"Call {call_id} already completed with status {call.status.value}, ending subscription"
            )
            return

        logger.debug(
            f"Call {call_id} is active (status={call.status.value if call else 'unknown'}), subscribing to future events"
        )

        # Otherwise, subscribe to future events
        queue = asyncio.Queue()
        self._subscribers[call_id].append(queue)
        logger.debug(
            f"Created queue for call {call_id}, now {len(self._subscribers[call_id])} subscribers"
        )

        try:
            future_event_count = 0
            while True:
                logger.debug(f"Waiting for next event on queue for call {call_id}...")
                event = await queue.get()
                if event is None:  # Sentinel to stop
                    logger.debug(
                        f"Received stop sentinel for call {call_id} after {future_event_count} future events"
                    )
                    break
                future_event_count += 1
                event_type = (
                    event.event_type
                    if hasattr(event, "event_type")
                    else type(event).__name__
                )
                logger.debug(
                    f"Yielding future event #{future_event_count} for call {call_id}: {event_type}"
                )
                yield event

                # Don't check status here - wait for explicit status_change event
                # The status_change event itself will tell us when we're done
                if isinstance(event, CallStatusChange):
                    if event.new_status in (
                        CallStatus.COMPLETED,
                        CallStatus.FAILED,
                        CallStatus.CANCELLED,
                    ):
                        logger.debug(
                            f"Received terminal status change to {event.new_status.value}, ending subscription"
                        )
                        break
        finally:
            # Clean up subscription
            if queue in self._subscribers.get(call_id, []):
                self._subscribers[call_id].remove(queue)

    async def call_exists(self, call_id: UUID) -> bool:
        return call_id in self._calls

    async def is_call_active(self, call_id: UUID) -> bool:
        if call := self._calls.get(call_id):
            return call.status in (CallStatus.PENDING, CallStatus.RUNNING)
        return False

    async def _notify_subscribers(self, call_id: UUID, event: CallEvent) -> None:
        """Notify all subscribers of a new event."""
        from ..utils import log

        logger = log.get_logger(__name__)

        subscribers = self._subscribers.get(call_id, [])
        event_type = (
            event.event_type if hasattr(event, "event_type") else type(event).__name__
        )
        logger.debug(
            f"Notifying {len(subscribers)} subscribers of {event_type} event for call {call_id}"
        )

        for i, queue in enumerate(subscribers):
            try:
                queue.put_nowait(event)
                logger.debug(
                    f"Successfully notified subscriber {i + 1}/{len(subscribers)}"
                )
            except asyncio.QueueFull:
                # Skip slow subscribers
                logger.warning(
                    f"Subscriber {i + 1}/{len(subscribers)} queue is full, skipping"
                )
                pass

    async def _emit_status_change(
        self, call_id: UUID, old_status: CallStatus, new_status: CallStatus
    ) -> None:
        """Emit a status change event."""
        from ..models.calls import CallStatusChange

        status_change = CallStatusChange(
            call_id=call_id, old_status=old_status, new_status=new_status
        )
        await self._notify_subscribers(call_id, status_change)

    async def _cleanup_subscribers(self, call_id: UUID) -> None:
        """Clean up subscribers for a finished call."""
        for queue in self._subscribers.get(call_id, []):
            try:
                # Send a sentinel to indicate stream end
                queue.put_nowait(None)
            except asyncio.QueueFull:
                pass

        # Clear subscribers list
        self._subscribers[call_id] = []
