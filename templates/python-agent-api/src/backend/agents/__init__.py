# Agent registry for Opper SDK agents.
# Add your agents to the AGENTS list to have them automatically registered.
# Use the add-agent tool to scaffold new agents:
#   __polytope__run(module: api-add-agent, args: {name: agent-name, mode: tools})

# Registry of all agents with their registration names
# Format: [("registration-name", agent_function), ...]
AGENTS = [
    # Agents will be added here by the add-agent tool
]

__all__ = ["AGENTS"]
