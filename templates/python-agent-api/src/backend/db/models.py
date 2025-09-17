"""
Database models for agent persistence.

These models store agent execution history, user sessions, and agent memory
for building persistent, stateful agents.
"""

from datetime import datetime
from typing import Optional, Dict, Any
from sqlmodel import SQLModel, Field, JSON, Column
from sqlalchemy import Text


class AgentConversation(SQLModel, table=True):
    """Store conversation history for agents."""
    __tablename__ = "agent_conversations"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    agent_name: str = Field(index=True)
    user_id: Optional[str] = Field(default=None, index=True)
    session_id: Optional[str] = Field(default=None, index=True)
    
    goal: str = Field(sa_column=Column(Text))
    result: Optional[Dict[str, Any]] = Field(default=None, sa_column=Column(JSON))
    
    success: bool = Field(default=False)
    iterations: Optional[int] = Field(default=None)
    execution_time: Optional[float] = Field(default=None)
    error_message: Optional[str] = Field(default=None, sa_column=Column(Text))
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class AgentMemory(SQLModel, table=True):
    """Store persistent memory/context for agents."""
    __tablename__ = "agent_memory"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    agent_name: str = Field(index=True)
    user_id: Optional[str] = Field(default=None, index=True)
    
    memory_key: str = Field(index=True)  # e.g., "user_preferences", "conversation_context"
    memory_value: Dict[str, Any] = Field(sa_column=Column(JSON))
    
    expires_at: Optional[datetime] = Field(default=None)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class UserSession(SQLModel, table=True):
    """Store user session data."""
    __tablename__ = "user_sessions"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    session_id: str = Field(unique=True, index=True)
    user_id: Optional[str] = Field(default=None, index=True)
    
    session_data: Dict[str, Any] = Field(sa_column=Column(JSON))
    
    expires_at: Optional[datetime] = Field(default=None)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class AgentExecutionLog(SQLModel, table=True):
    """Store detailed agent execution logs for debugging."""
    __tablename__ = "agent_execution_logs"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    agent_name: str = Field(index=True)
    conversation_id: Optional[int] = Field(default=None, index=True)
    
    event_type: str = Field(index=True)  # "goal_start", "thought_created", "action_executed", etc.
    event_data: Dict[str, Any] = Field(sa_column=Column(JSON))
    
    created_at: datetime = Field(default_factory=datetime.utcnow)