"""
Database models for agent calls and events.
"""

from datetime import datetime, timezone
from typing import Any
import uuid
from sqlmodel import SQLModel, Field
from sqlalchemy import JSON, Column
from ..models.utils import uuid7


class CallTable(SQLModel, table=True):
    """Store agent calls."""

    __tablename__ = "agent_calls"

    id: uuid.UUID = Field(default_factory=uuid7, primary_key=True)
    agent_name: str = Field(index=True)
    input_data: dict[str, Any] = Field(sa_column=Column(JSON))
    status: str = Field(index=True)

    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc), index=True
    )
    started_at: datetime | None = Field(default=None)
    completed_at: datetime | None = Field(default=None)

    call_metadata: dict[str, Any] | None = Field(default=None, sa_column=Column(JSON))

    # Summary stats
    total_thoughts: int = Field(default=0)
    total_actions: int = Field(default=0)
    execution_time_ms: int | None = Field(default=None)


class CallEventTable(SQLModel, table=True):
    """Store call events."""

    __tablename__ = "call_events"

    id: uuid.UUID = Field(default_factory=uuid7, primary_key=True)
    call_id: uuid.UUID = Field(index=True)
    event_type: str = Field(index=True)
    timestamp: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc), index=True
    )
    sequence: int = Field(index=True)

    data: dict[str, Any] = Field(sa_column=Column(JSON))
