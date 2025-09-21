# {{ project-name }}

FastAPI agent server with the Opper SDK. Includes optional PostgreSQL/Redis persistence and real-time WebSocket monitoring.

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

Every agent automatically gets a test script when created. Test your agents using:

### Quick Test
```bash
# Use the auto-generated test script for your agent
python -m scripts.test_<agent_name>

# Or use the universal test script
python -m scripts.test_agent --agent <agent-name> --goal "Your test prompt"

# With custom iterations limit
python -m scripts.test_agent --agent <agent-name> --goal "Test this" --max-iterations 10

# With additional input data
python -m scripts.test_agent --agent <agent-name> --goal "Process this" --input '{"key": "value"}'
```

### Test Features
- **Always goes through the API** - Tests the real agent behavior
- **Clear output** - Shows progress, events, and results in an easy-to-read format
- **Iteration control** - Set `max_iterations` to limit reasoning loops (1-100)
- **Auto-spawn server** - Use `--spawn-server` to start a test server automatically

### Writing Custom Tests
Tests use the `agent_server.test_utils` module which provides:
- `AgentTestClient` - Full-featured test client
- `test_agent()` - Simple function for quick tests
- Clear output helpers: `print_success()`, `print_error()`, `print_info()`

The test utilities are designed to help coding agents verify their implementations work correctly.
