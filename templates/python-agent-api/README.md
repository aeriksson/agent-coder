# {{ project-name }}

An AI agent API powered by the [Opper Agent SDK](https://github.com/opper-ai/opperai-agent-sdk). This template provides a clean starting point for building intelligent agents that can reason, use tools, and execute structured workflows.

## 🚀 Running the API

**The API is automatically started when you created it using `add-{{ project-name }}`.**

To inspect which steps run, use: `list-services-in-job`
To view logs, use: `get-logs-in-job{"step":"backend"}`

**Do not manually run the `{{ project-name }}` module - it's already running by calling `add-{{ project-name }}`.**

## 🤖 What You Get

This template includes:

- **FastAPI backend** with clean agent endpoints
- **Example agents** showing both tools and flow modes
- **Simple tools** as starting points for your own
- **Clean project structure** optimized for agent development

## 🛠️ Development Instructions

### 1. Set up your Opper API key

Add your Opper API key to the `polytope.yml` environment variables:

```yaml
env:
  - { name: OPPER_API_KEY, value: your-api-key-here }
```

Get your API key at [https://platform.opper.ai](https://platform.opper.ai).

### 2. Customize the agents

The template includes simple example agents in `src/backend/agents/`:

- `example_agents.py` - Shows both tools mode and flow mode patterns
- Replace these with your own agent logic

### 3. Add your own tools

Create tools in `src/backend/tools/`:

```python
from opper_agent import tool

@tool
def my_custom_tool(param: str) -> str:
    """Description of what this tool does."""
    return f"Processed: {param}"
```

### 4. Create workflows (Flow Mode)

For structured multi-step tasks, create workflows:

```python
from opper_agent import step, Workflow, ExecutionContext

@step
async def my_step(data: MyInput, ctx: ExecutionContext) -> MyOutput:
    result = await ctx.llm(
        name="my_step",
        instructions="Process this data...",
        input_schema=MyInput,
        output_schema=MyOutput,
        input=data,
    )
    return MyOutput.model_validate(result)
```

## 🔗 API Endpoints

Once running, your API provides:

- `GET /` - API information
- `GET /health` - Health check  
- `POST /process` - Main agent processing endpoint
- `POST /agents/coding` - Direct access to tools mode agent
- `POST /agents/workflow` - Direct access to flow mode agent
- `GET /agents/info` - Agent information
- `GET /docs` - Interactive API documentation

## 📝 Example Usage

```bash
# Process a goal with the tools agent
curl -X POST "http://localhost:3030/process" \
  -H "Content-Type: application/json" \
  -d '{
    "goal": "Calculate 25 * 4 and greet Alice",
    "agent_type": "coding", 
    "max_iterations": 5
  }'

# Process with the workflow agent
curl -X POST "http://localhost:3030/process" \
  -H "Content-Type: application/json" \
  -d '{
    "goal": "Process this message: Hello World",
    "agent_type": "workflow"
  }'
```

## 🔧 Configuration

Configuration is handled via environment variables (see `src/backend/conf.py`):

- `OPPER_API_KEY` - Your Opper API key (required)
- `LOG_LEVEL` - Logging level (default: INFO)
- `HTTP_HOST` - Server host (default: 0.0.0.0)
- `HTTP_PORT` - Server port (default: 8000)
- `HTTP_AUTORELOAD` - Auto-reload on changes (default: false)

Add new environment variables to both `conf.py` and `polytope.yml`.

## 📚 Learn More

- [Opper Agent SDK Documentation](https://docs.opper.ai)
- [Opper Platform](https://platform.opper.ai)
- [FastAPI Documentation](https://fastapi.tiangolo.com)
