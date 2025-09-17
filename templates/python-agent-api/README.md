# {{ project-name }}

FastAPI template for building AI agents with the Opper SDK. Includes optional PostgreSQL/Redis persistence and real-time WebSocket monitoring.

## Quick Start

```bash
# Test the included demo agent
polytope run {{ project-name }}-run-script script=demo

# Create a new script
polytope run {{ project-name }}-add-script script=my-analyzer

# Add dependencies
polytope run {{ project-name }}-add packages="your-package"

# Run tests
polytope run {{ project-name }}-test
```

## Environment Variables

```bash
export OPPER_API_KEY=your_api_key
# Optional: USE_POSTGRES=true, USE_REDIS=true
```

## Agent Development

Build agents using testing scripts for rapid iteration. Scripts provide isolated test environments, repeatable workflows, and clear verification of agent behavior - essential for developing reliable AI agents.

**Create test scripts**: `__polytope__run(module: api-add-script, args: {script: script-name})`

## Choosing Agent Mode

**Tools Mode** - Use for interactive, dynamic problem-solving:
- User asks varied questions that need different tool combinations
- One-shot requests that don't need state between calls
- Agent needs to dynamically reason about which tools to use
- Example: "Calculate the square root of 144 then convert to binary"

**Flow Mode** - Use for structured, multi-step processes:
- Clear sequence of steps that build on each other
- Need to maintain data/state between steps
- Complex workflows with branching or parallel processing
- Example: "Research topic → gather sources → analyze → write report"

**Quick Decision**:
- Need to remember things between steps? → Flow Mode
- One request, multiple possible tool combinations? → Tools Mode

```python
# Example agent
from opper_agent import Agent, tool

@tool
def my_tool(param: str) -> str:
    """Process a parameter and return a result."""
    return f"Processed: {param}"

def get_my_agent():
    return Agent(
        name="my-agent",
        description="An example agent that processes parameters",
        tools=[my_tool],
        verbose=True
    )
```


## Key Endpoints

- `GET /docs` - API documentation
- `GET /agents` - List agents  
- `POST /agents/{name}/test` - Test agent
- `WebSocket /ws/agents` - Real-time events