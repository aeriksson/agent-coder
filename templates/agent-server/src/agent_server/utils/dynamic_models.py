"""
Dynamic Pydantic model generation for agent endpoints.

Creates properly typed models at runtime based on registered agents,
allowing FastAPI to handle all validation automatically.
"""

from typing import Any, Type, Literal
from pydantic import BaseModel, Field, create_model
from ..models.agent_definition import AgentDefinition
from ..utils import log

logger = log.get_logger(__name__)


def create_dynamic_call_spec(
    agent_definitions: list[AgentDefinition],
) -> Type[BaseModel]:
    """
    Create a dynamic CallSpec model based on all registered agents.

    This creates a discriminated union where each agent has its own
    properly typed input model, allowing FastAPI to validate automatically.

    Args:
        agent_definitions: List of AgentDefinition objects

    Returns:
        A Pydantic model class that validates based on agent_name
    """
    if not agent_definitions:
        # No agents registered yet - return a basic model
        return create_model(
            "CallSpec",
            agent_name=(str, Field(..., description="Agent name")),
            input_data=(dict[str, Any], Field(..., description="Input data")),
            max_iterations=(int | None, Field(default=None, ge=1, le=100)),
        )

    agent_models = []
    for agent_def in agent_definitions:
        input_model = agent_def.input_schema
        agent_name = agent_def.name

        AgentCallSpec = create_model(
            f"{agent_name.replace('-', '_').title()}CallSpec",
            agent_name=(
                Literal[agent_name],
                Field(default=agent_name, description=f"Must be '{agent_name}'"),
            ),
            input_data=(
                input_model,
                Field(..., description=f"Input for {agent_def.description}"),
            ),
            max_iterations=(
                int | None,
                Field(default=None, ge=1, le=100, description="Max iterations"),
            ),
        )

        agent_models.append(AgentCallSpec)

    from typing import Union

    DynamicCallSpec = Union[tuple(agent_models)]

    return DynamicCallSpec
