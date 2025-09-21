"""
Agent definition model for metadata and schemas.
"""

from typing import Type, Callable, Any
from pydantic import BaseModel, Field


class AgentDefinition(BaseModel):
    """Definition of an agent including its metadata and schemas."""

    name: str = Field(..., description="Unique agent identifier")
    description: str = Field(..., description="What this agent does")
    input_schema: Type[BaseModel] = Field(..., description="Pydantic model for input validation")
    output_schema: Type[BaseModel] = Field(..., description="Pydantic model for output structure")
    factory: Callable[[], Any] = Field(..., description="Function that creates the agent instance")

    class Config:
        arbitrary_types_allowed = True  # Allow Type[BaseModel] and Callable