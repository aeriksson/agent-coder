"""
Agent registry for Opper SDK agents.

Add your agents to AGENT_DEFINITIONS to have them automatically registered.
Use the add-agent tool to scaffold new agents:
  __polytope__run(module: {{ project-name }}-add-agent, args: {name: agent-name})
"""

from ..models.agent_definition import AgentDefinition

# Registry of all agent definitions
# Each agent exports an AgentDefinition with metadata and factory
AGENT_DEFINITIONS: list[AgentDefinition] = [
    # Agents will be added here by the add-agent tool
    # Example: from .example_agent import EXAMPLE_AGENT
    #          Then add to list: EXAMPLE_AGENT,
]

__all__ = ["AGENT_DEFINITIONS"]
