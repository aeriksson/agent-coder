"""
Pydantic models for agent calls and events.
"""

from datetime import datetime, timezone
from enum import Enum
from typing import Any
from uuid import UUID, uuid4
from pydantic import BaseModel, Field


class CallStatus(str, Enum):
    """Status of an agent call."""

    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class CallSpec(BaseModel):
    """Specification for creating a new agent call."""

    agent_name: str | None = None  # Set by the API endpoint
    input_data: dict[str, Any]
    max_iterations: int | None = Field(
        default=None, ge=1, le=100, description="Maximum reasoning iterations (1-100)"
    )
    metadata: dict[str, Any] | None = None


class CallSummary(BaseModel):
    """High-level summary of a call's state and metadata."""

    id: UUID = Field(default_factory=uuid4)
    agent_name: str
    input_data: dict[str, Any]
    status: CallStatus
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    started_at: datetime | None = None
    completed_at: datetime | None = None
    metadata: dict[str, Any] | None = None

    # Summary stats
    total_thoughts: int = 0
    total_actions: int = 0
    execution_time_ms: int | None = None


class CallThought(BaseModel):
    """A thought/reasoning step from the agent."""

    id: UUID = Field(default_factory=uuid4)
    call_id: UUID
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    iteration: int = 0  # From Opper SDK
    sequence: int = 0  # Order within the call's events
    event_type: str = Field(default="thought", description="Type of event")

    # Core Thought fields from Opper SDK
    reasoning: str = Field(
        description="Analysis of current situation and what needs to be done"
    )
    goal_achieved: bool = Field(
        default=False, description="Whether the main goal has been achieved"
    )
    todo_list: str | None = Field(
        default=None, description="Markdown list of tasks checked off and todo"
    )
    next_action_needed: bool = Field(
        default=False, description="Whether an action is needed"
    )

    # Extended fields
    tool_name: str | None = Field(default=None, description="Name of tool to execute")
    tool_parameters: dict[str, Any] | None = Field(
        default=None, description="Parameters for the tool"
    )
    expected_outcome: str | None = Field(
        default=None, description="Expected outcome of the action"
    )
    user_message: str | None = Field(
        default=None, description="Message to show the user"
    )

    # Raw event data from Opper SDK
    raw_data: dict[str, Any] | None = Field(
        default=None, description="Raw event data from Opper SDK"
    )


class CallAction(BaseModel):
    """An action executed by the agent."""

    id: UUID = Field(default_factory=uuid4)
    call_id: UUID
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    iteration: int = 0  # From Opper SDK
    sequence: int = 0  # Order within the call's events
    event_type: str = Field(default="action", description="Type of event")

    # ActionResult fields from Opper SDK
    tool_name: str = Field(description="Name of the tool that was executed")
    parameters: dict[str, Any] = Field(
        default_factory=dict, description="Parameters passed to the tool"
    )
    result: Any = Field(description="Result from the tool execution")
    success: bool = Field(default=True, description="Whether the action succeeded")
    execution_time: float = Field(default=0.0, description="Execution time in seconds")
    error_message: str | None = Field(
        default=None, description="Error message if action failed"
    )

    # Raw event data from Opper SDK
    raw_data: dict[str, Any] | None = Field(
        default=None, description="Raw event data from Opper SDK"
    )


class CallResult(BaseModel):
    """Final result of a completed call."""

    id: UUID = Field(default_factory=uuid4)
    call_id: UUID
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    event_type: str = Field(default="result", description="Type of event")

    success: bool
    result: Any
    executive_summary: str | None = None
    key_findings: list[str] | None = None
    citations: list[dict[str, Any]] | None = None
    metadata: dict[str, Any] | None = None  # For extra fields like iterations

    # Raw event data from Opper SDK
    raw_data: dict[str, Any] | None = Field(
        default=None, description="Raw event data from Opper SDK"
    )


class CallError(BaseModel):
    """Error that occurred during call execution."""

    id: UUID = Field(default_factory=uuid4)
    call_id: UUID
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    event_type: str = Field(default="error", description="Type of event")

    error_type: str
    error_message: str
    error_details: dict[str, Any] | None = None
    recoverable: bool = False

    # Raw event data from Opper SDK
    raw_data: dict[str, Any] | None = Field(
        default=None, description="Raw event data from Opper SDK"
    )


class CallStatusChange(BaseModel):
    """Status change event for a call."""

    id: UUID = Field(default_factory=uuid4)
    call_id: UUID
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    event_type: str = Field(default="status_change", description="Type of event")

    old_status: CallStatus
    new_status: CallStatus
    reason: str | None = None


# Union type for all events that can be streamed
CallEvent = CallThought | CallAction | CallResult | CallError | CallStatusChange


class WSError(BaseModel):
    """WebSocket error response."""

    error_type: str
    error_message: str
    call_id: UUID | None = None

    class Config:
        json_schema_extra = {
            "examples": [
                {
                    "error_type": "call_not_found",
                    "error_message": "Call with ID abc123 does not exist",
                    "call_id": "abc123",
                },
                {
                    "error_type": "call_already_finished",
                    "error_message": "Call is already completed",
                    "call_id": "def456",
                },
            ]
        }


class WSMessage(BaseModel):
    """WebSocket message wrapper."""

    type: str  # "event" | "error" | "status"
    data: CallEvent | WSError | dict[str, Any]


# For pagination
class CallListRequest(BaseModel):
    """Request parameters for listing calls."""

    agent_name: str | None = None
    status: CallStatus | None = None
    limit: int = Field(default=50, ge=1, le=100)
    offset: int = Field(default=0, ge=0)


class CallListResponse(BaseModel):
    """Response for call listing."""

    calls: list[CallSummary]
    total: int
    offset: int
    limit: int
