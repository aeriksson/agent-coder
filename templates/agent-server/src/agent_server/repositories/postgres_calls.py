"""
PostgreSQL implementation of CallRepository.
"""

import asyncio
import json
from typing import AsyncIterator
from uuid import UUID
from datetime import datetime, timezone
from sqlalchemy import select, update, func
from sqlalchemy.ext.asyncio import AsyncSession

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
    CallStatusChange,
)
from ..db.models import CallTable, CallEventTable
from ..clients.postgres import PostgresClient
from .calls import CallRepository


class PostgresCallRepository(CallRepository):
    """PostgreSQL implementation of CallRepository."""

    def __init__(self, postgres_client: PostgresClient):
        self.postgres_client = postgres_client
        self._subscribers: dict[UUID, list[asyncio.Queue]] = {}

    async def create_call(self, spec: CallSpec) -> CallSummary:
        call = CallSummary(
            agent_name=spec.agent_name,
            input_data=spec.input_data,
            status=CallStatus.PENDING,
            metadata=spec.metadata,
        )

        async with self.postgres_client.get_session() as session:
            call_row = CallTable(
                id=str(call.id),
                agent_name=call.agent_name,
                input_data=call.input_data,
                status=call.status.value,
                created_at=call.created_at,
                call_metadata=call.metadata,
            )
            session.add(call_row)
            await session.commit()

        # Initialize subscribers for this call
        self._subscribers[call.id] = []
        return call

    async def get_call(self, call_id: UUID) -> CallSummary | None:
        async with self.postgres_client.get_session() as session:
            stmt = select(CallTable).where(CallTable.id == str(call_id))
            result = await session.execute(stmt)
            call_row = result.scalar_one_or_none()

            if not call_row:
                return None

            return CallSummary(
                id=UUID(call_row.id),
                agent_name=call_row.agent_name,
                input_data=call_row.input_data,
                status=CallStatus(call_row.status),
                created_at=call_row.created_at,
                started_at=call_row.started_at,
                completed_at=call_row.completed_at,
                metadata=call_row.call_metadata,
                total_thoughts=call_row.total_thoughts,
                total_actions=call_row.total_actions,
                execution_time_ms=call_row.execution_time_ms,
            )

    async def register_call_started(self, call_id: UUID) -> None:
        async with self.postgres_client.get_session() as session:
            stmt = (
                update(CallTable)
                .where(CallTable.id == str(call_id))
                .values(
                    status=CallStatus.RUNNING.value,
                    started_at=datetime.now(timezone.utc),
                )
            )
            await session.execute(stmt)
            await session.commit()

        await self._emit_status_change(call_id, CallStatus.PENDING, CallStatus.RUNNING)

    async def append_call_thought(self, call_id: UUID, thought: CallThought) -> None:
        async with self.postgres_client.get_session() as session:
            # Get current thought count for sequence number
            thought_count_stmt = select(func.count(CallEventTable.id)).where(
                CallEventTable.call_id == str(call_id),
                CallEventTable.event_type == "thought",
            )
            result = await session.execute(thought_count_stmt)
            thought.sequence = result.scalar() or 0

            # Insert event
            event_row = CallEventTable(
                id=str(thought.id),
                call_id=str(call_id),
                event_type="thought",
                timestamp=thought.timestamp,
                sequence=thought.sequence,
                data=thought.model_dump(),
            )
            session.add(event_row)

            # Update call stats
            update_stmt = (
                update(CallTable)
                .where(CallTable.id == str(call_id))
                .values(total_thoughts=CallTable.total_thoughts + 1)
            )
            await session.execute(update_stmt)
            await session.commit()

        await self._notify_subscribers(call_id, thought)

    async def append_call_action(self, call_id: UUID, action: CallAction) -> None:
        async with self.postgres_client.get_session() as session:
            # Get current action count for sequence number
            action_count_stmt = select(func.count(CallEventTable.id)).where(
                CallEventTable.call_id == str(call_id),
                CallEventTable.event_type == "action",
            )
            result = await session.execute(action_count_stmt)
            action.sequence = result.scalar() or 0

            # Insert event
            event_row = CallEventTable(
                id=str(action.id),
                call_id=str(call_id),
                event_type="action",
                timestamp=action.timestamp,
                sequence=action.sequence,
                data=action.model_dump(),
            )
            session.add(event_row)

            # Update call stats
            update_stmt = (
                update(CallTable)
                .where(CallTable.id == str(call_id))
                .values(total_actions=CallTable.total_actions + 1)
            )
            await session.execute(update_stmt)
            await session.commit()

        await self._notify_subscribers(call_id, action)

    async def register_call_done(self, call_id: UUID, result: CallResult) -> None:
        completed_at = datetime.now(timezone.utc)

        async with self.postgres_client.get_session() as session:
            # Get call to calculate execution time
            call_stmt = select(CallTable).where(CallTable.id == str(call_id))
            call_result = await session.execute(call_stmt)
            call_row = call_result.scalar_one_or_none()

            execution_time_ms = None
            if call_row and call_row.started_at:
                execution_time_ms = int(
                    (completed_at - call_row.started_at).total_seconds() * 1000
                )

            # Update call
            update_stmt = (
                update(CallTable)
                .where(CallTable.id == str(call_id))
                .values(
                    status=CallStatus.COMPLETED.value,
                    completed_at=completed_at,
                    execution_time_ms=execution_time_ms,
                )
            )
            await session.execute(update_stmt)

            # Insert result event
            event_row = CallEventTable(
                id=str(result.id),
                call_id=str(call_id),
                event_type="result",
                timestamp=result.timestamp,
                sequence=0,  # Results don't need sequence
                data=result.model_dump(),
            )
            session.add(event_row)
            await session.commit()

        await self._notify_subscribers(call_id, result)
        await self._emit_status_change(
            call_id, CallStatus.RUNNING, CallStatus.COMPLETED
        )
        await self._cleanup_subscribers(call_id)

    async def register_call_error(self, call_id: UUID, error: CallError) -> None:
        completed_at = datetime.now(timezone.utc)

        async with self.postgres_client.get_session() as session:
            # Get call to calculate execution time
            call_stmt = select(CallTable).where(CallTable.id == str(call_id))
            call_result = await session.execute(call_stmt)
            call_row = call_result.scalar_one_or_none()

            execution_time_ms = None
            if call_row and call_row.started_at:
                execution_time_ms = int(
                    (completed_at - call_row.started_at).total_seconds() * 1000
                )

            # Update call
            update_stmt = (
                update(CallTable)
                .where(CallTable.id == str(call_id))
                .values(
                    status=CallStatus.FAILED.value,
                    completed_at=completed_at,
                    execution_time_ms=execution_time_ms,
                )
            )
            await session.execute(update_stmt)

            # Insert error event
            event_row = CallEventTable(
                id=str(error.id),
                call_id=str(call_id),
                event_type="error",
                timestamp=error.timestamp,
                sequence=0,  # Errors don't need sequence
                data=error.model_dump(),
            )
            session.add(event_row)
            await session.commit()

        await self._notify_subscribers(call_id, error)
        await self._emit_status_change(call_id, CallStatus.RUNNING, CallStatus.FAILED)
        await self._cleanup_subscribers(call_id)

    async def register_call_cancelled(self, call_id: UUID) -> None:
        completed_at = datetime.now(timezone.utc)

        async with self.postgres_client.get_session() as session:
            # Get current status and calculate execution time
            call_stmt = select(CallTable).where(CallTable.id == str(call_id))
            call_result = await session.execute(call_stmt)
            call_row = call_result.scalar_one_or_none()

            if not call_row:
                return

            old_status = CallStatus(call_row.status)
            execution_time_ms = None
            if call_row.started_at:
                execution_time_ms = int(
                    (completed_at - call_row.started_at).total_seconds() * 1000
                )

            # Update call
            update_stmt = (
                update(CallTable)
                .where(CallTable.id == str(call_id))
                .values(
                    status=CallStatus.CANCELLED.value,
                    completed_at=completed_at,
                    execution_time_ms=execution_time_ms,
                )
            )
            await session.execute(update_stmt)
            await session.commit()

        await self._emit_status_change(call_id, old_status, CallStatus.CANCELLED)
        await self._cleanup_subscribers(call_id)

    async def list_calls(self, request: CallListRequest) -> CallListResponse:
        async with self.postgres_client.get_session() as session:
            # Build query with filters
            stmt = select(CallTable)

            if request.agent_name:
                stmt = stmt.where(CallTable.agent_name == request.agent_name)
            if request.status:
                stmt = stmt.where(CallTable.status == request.status.value)

            # Get total count
            count_stmt = select(func.count()).select_from(stmt.subquery())
            count_result = await session.execute(count_stmt)
            total = count_result.scalar() or 0

            # Apply ordering and pagination
            stmt = stmt.order_by(CallTable.created_at.desc())
            stmt = stmt.offset(request.offset).limit(request.limit)

            result = await session.execute(stmt)
            call_rows = result.scalars().all()

            calls = [
                CallSummary(
                    id=UUID(row.id),
                    agent_name=row.agent_name,
                    input_data=row.input_data,
                    status=CallStatus(row.status),
                    created_at=row.created_at,
                    started_at=row.started_at,
                    completed_at=row.completed_at,
                    metadata=row.call_metadata,
                    total_thoughts=row.total_thoughts,
                    total_actions=row.total_actions,
                    execution_time_ms=row.execution_time_ms,
                )
                for row in call_rows
            ]

            return CallListResponse(
                calls=calls, total=total, offset=request.offset, limit=request.limit
            )

    async def get_call_events(self, call_id: UUID) -> list[CallEvent]:
        async with self.postgres_client.get_session() as session:
            stmt = (
                select(CallEventTable)
                .where(CallEventTable.call_id == str(call_id))
                .order_by(CallEventTable.timestamp.asc())
            )
            result = await session.execute(stmt)
            event_rows = result.scalars().all()

            events = []
            for row in event_rows:
                # Convert back to proper Pydantic types based on event_type
                if row.event_type == "thought":
                    events.append(CallThought.model_validate(row.data))
                elif row.event_type == "action":
                    events.append(CallAction.model_validate(row.data))
                elif row.event_type == "result":
                    events.append(CallResult.model_validate(row.data))
                elif row.event_type == "error":
                    events.append(CallError.model_validate(row.data))
                elif row.event_type == "status_change":
                    events.append(CallStatusChange.model_validate(row.data))

            # Sort by timestamp, then by iteration for events with same timestamp
            return sorted(
                events, key=lambda e: (e.timestamp, getattr(e, "iteration", 0))
            )

    async def subscribe_to_call(self, call_id: UUID) -> AsyncIterator[CallEvent]:
        # First, yield all historical events from the database
        historical_events = await self.get_call_events(call_id)
        for event in historical_events:
            yield event

        # Check if the call is already done
        call = await self.get_call(call_id)
        if call and call.status in (
            CallStatus.COMPLETED,
            CallStatus.FAILED,
            CallStatus.CANCELLED,
        ):
            return

        # Otherwise, subscribe to future events
        if call_id not in self._subscribers:
            self._subscribers[call_id] = []

        queue = asyncio.Queue()
        self._subscribers[call_id].append(queue)

        try:
            while True:
                event = await queue.get()
                if event is None:  # Sentinel for stream end
                    break
                yield event

                # Check if call is done after this event
                call = await self.get_call(call_id)
                if call and call.status in (
                    CallStatus.COMPLETED,
                    CallStatus.FAILED,
                    CallStatus.CANCELLED,
                ):
                    break
        finally:
            # Clean up subscription
            if call_id in self._subscribers and queue in self._subscribers[call_id]:
                self._subscribers[call_id].remove(queue)

    async def call_exists(self, call_id: UUID) -> bool:
        async with self.postgres_client.get_session() as session:
            stmt = select(func.count(CallTable.id)).where(CallTable.id == str(call_id))
            result = await session.execute(stmt)
            count = result.scalar() or 0
            return count > 0

    async def is_call_active(self, call_id: UUID) -> bool:
        async with self.postgres_client.get_session() as session:
            stmt = select(CallTable.status).where(CallTable.id == str(call_id))
            result = await session.execute(stmt)
            status = result.scalar_one_or_none()

            if not status:
                return False

            return CallStatus(status) in (CallStatus.PENDING, CallStatus.RUNNING)

    async def _notify_subscribers(self, call_id: UUID, event: CallEvent) -> None:
        """Notify all subscribers of a new event."""
        for queue in self._subscribers.get(call_id, []):
            try:
                queue.put_nowait(event)
            except asyncio.QueueFull:
                # Skip slow subscribers
                pass

    async def _emit_status_change(
        self, call_id: UUID, old_status: CallStatus, new_status: CallStatus
    ) -> None:
        """Emit a status change event."""
        status_change = CallStatusChange(
            call_id=call_id, old_status=old_status, new_status=new_status
        )

        # Store in database
        async with self.postgres_client.get_session() as session:
            event_row = CallEventTable(
                id=str(status_change.id),
                call_id=str(call_id),
                event_type="status_change",
                timestamp=status_change.timestamp,
                sequence=0,  # Status changes don't need sequence
                data=status_change.model_dump(),
            )
            session.add(event_row)
            await session.commit()

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
        if call_id in self._subscribers:
            del self._subscribers[call_id]
