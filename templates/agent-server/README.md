# {{ project-name }}

FastAPI agent server with the Opper SDK. Includes optional PostgreSQL persistence and real-time WebSocket monitoring.

## Development Notes

**The server runs with hot reload enabled** - Your changes are automatically applied when you save files.

**ALWAYS check logs after making changes**: After any code change, verify it worked by checking the server logs:
```bash
__polytope__logs(container: {{ project-name }}, tail: 100)
```
Look for import errors, syntax errors, or runtime exceptions. The hot reload will show if your agent loaded successfully or if there are any errors.

## Quick Start

```bash
# Create a new agent
__polytope__run(module: {{ project-name }}-add-agent, args: {name: research-assistant, description: "Helps with research tasks"})

# Add dependencies
__polytope__run(module: {{ project-name }}-add-dependencies, args: {packages: "your-package"})
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

**Create a new agent**: `__polytope__run(module: {{ project-name }}-add-agent, args: {name: agent-name, description: "What it does"})`

This generates:
- Agent file with proper scaffolding and example tools
- Clear warnings about how tools work (they're called by the agent, not your code)
- Automatic registration in the agent registry

## How Agents Work

Agents use a Think → Act reasoning loop:
- The agent receives a goal and thinks about what to do
- It selects which tool(s) to call based on the goal
- Tools return results which inform the next step
- The process continues until the goal is achieved

**Important Tool Rules**:
- Each `@tool` decorated function should do ONE specific task
- Tools CANNOT call other `@tool` functions - the agent handles orchestration
- Keep tools simple and self-contained
- The agent decides which tools to call and in what order

## Testing Agents

Test your agents using MCP tools:

### Call an Agent (Recommended)
```bash
# Call an agent through MCP
__polytope__run(module: {{ project-name }}-call-agent, args: {agent: hello, inputs: {"goal": "Say hello"}})

# With custom iterations limit
__polytope__run(module: {{ project-name }}-call-agent, args: {agent: hello, inputs: {"goal": "Test this"}, max_iterations: 10})

# With external API instead of spawning local server
__polytope__run(module: {{ project-name }}-call-agent, args: {agent: hello, inputs: {"goal": "Test"}, api: true})
```

### Custom Test Scripts
For agents with complex testing needs, create and run custom test scripts:

```bash
# Create a custom test script
__polytope__run(module: {{ project-name }}-add-script, args: {script: "test_complex_agent"})

# Edit the script at src/scripts/test_complex_agent.py to add your test logic

# Run the custom test script
__polytope__run(module: {{ project-name }}-run-script, args: {script: "test-complex-agent"})
```

Each agent also gets an auto-generated test script when created (e.g., `test_<agent_name>`):
```bash
# Run an agent's default test script
__polytope__run(module: {{ project-name }}-run-script, args: {script: "test-<agent_name>"})
```

### Test Features
- **Always goes through the API** - Tests the real agent behavior
- **Clear output** - Shows progress with color-coded log levels
- **Iteration control** - Set `max_iterations` to limit reasoning loops (default: 3)
- **Local server spawning** - Automatically spawns a test server by default

### Test Utilities
The `agent_server.test_utils` module provides helpers for custom tests:
- `AgentTestClient` - Full-featured test client
- `test_agent()` - Simple function for quick tests
- Clear output helpers: `print_success()`, `print_error()`, `print_info()`
