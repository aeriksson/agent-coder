# {{ project-name }}

FastAPI template for building AI agents with the Opper SDK. Includes optional PostgreSQL/Redis persistence and real-time WebSocket monitoring.

## Quick Start

```bash
# Create a new agent
__polytope__run(module: {{ project-name }}-add-agent, args: {name: research-assistant, description: "Helps with research tasks", mode: tools})

# Add dependencies
__polytope__run(module: {{ project-name }}-add, args: {packages: "your-package"})
```

## API Endpoints

- List agents: `GET /api/v1/agents`
- Get agent details: `GET /api/v1/agents/{name}`
- Execute agent: `POST /api/v1/agents/{name}/calls` - Body: `{"input_data": {"goal": "..."}}`
- Get call result: `GET /api/v1/calls/{call_id}`
- List all calls: `GET /api/v1/calls`
- Cancel call: `POST /api/v1/calls/{call_id}/cancel`
- Stream events: `WebSocket /api/v1/calls/{call_id}/events/stream`

## Creating Agents

**Create a new agent**: `__polytope__run(module: {{ project-name }}-add-agent, args: {name: agent-name, description: "What it does", mode: tools})`

This generates:
- Agent file with proper scaffolding
- Tools or workflow structure based on mode
- Automatic registration in the agent registry

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

## Testing Agents

If you need to create standalone test scripts, you can use:
`__polytope__run(module: {{ project-name }}-add-script, args: {script: script-name})`

This creates a script in `src/scripts/` that you can run with `python -m scripts.script_name`
