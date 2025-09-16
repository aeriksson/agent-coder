import uvicorn
from contextlib import asynccontextmanager
from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Any, Dict, Optional
from .utils import log
from . import conf
from .agents import get_coding_agent, get_workflow_agent

log.init(conf.get_log_level())
logger = log.get_logger(__name__)


class AgentRequest(BaseModel):
    goal: str
    agent_type: str = "coding"  # "coding" or "workflow"
    max_iterations: Optional[int] = 10
    verbose: Optional[bool] = True


class AgentResponse(BaseModel):
    result: Any
    success: bool
    agent_type: str
    iterations: Optional[int] = None
    error: Optional[str] = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing Opper agent SDK application...")

    # Initialize agents on startup
    try:
        app.state.coding_agent = get_coding_agent()
        app.state.workflow_agent = get_workflow_agent()
        logger.info("Agents initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize agents: {e}")
        raise

    yield

    logger.info("Shutting down Opper agent SDK application...")


app = FastAPI(
    title="Opper Agent API",
    description="AI agents powered by Opper SDK for coding assistance and workflow automation",
    version="0.1.0",
    docs_url="/docs",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    """Root endpoint with API information."""
    return {
        "message": "Opper Agent API",
        "version": "0.1.0",
        "available_endpoints": {
            "/process": "Process goals with AI agents",
            "/agents/coding": "Coding assistant agent",
            "/agents/workflow": "Workflow automation agent",
            "/health": "Health check",
            "/docs": "API documentation"
        }
    }


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "agents_available": True}


@app.post("/process", response_model=AgentResponse)
async def process_goal(request: AgentRequest):
    """Process a goal using the specified agent."""
    try:
        if request.agent_type == "coding":
            agent = app.state.coding_agent
        elif request.agent_type == "workflow":
            agent = app.state.workflow_agent
        else:
            raise HTTPException(
                status_code=400,
                detail=f"Unknown agent type: {request.agent_type}. Available: 'coding', 'workflow'"
            )

        logger.info(f"Processing goal with {request.agent_type} agent: {request.goal}")

        # Update agent settings if provided
        if request.max_iterations:
            agent.max_iterations = request.max_iterations
        if request.verbose is not None:
            agent.verbose = request.verbose

        # Process the goal
        result = agent.process(request.goal)

        # Extract iteration count if available
        iterations = None
        if hasattr(result, 'get') and 'iterations' in result:
            iterations = result.get('iterations')
        elif hasattr(result, '__dict__') and hasattr(result, 'metadata'):
            iterations = result.metadata.get('steps', None)

        return AgentResponse(
            result=result,
            success=True,
            agent_type=request.agent_type,
            iterations=iterations
        )

    except Exception as e:
        logger.error(f"Error processing goal: {str(e)}")
        return AgentResponse(
            result=None,
            success=False,
            agent_type=request.agent_type,
            error=str(e)
        )


@app.post("/agents/coding", response_model=AgentResponse)
async def coding_agent_endpoint(request: Dict[str, Any]):
    """Direct endpoint for the coding agent."""
    goal = request.get("goal", "")
    if not goal:
        raise HTTPException(status_code=400, detail="Goal is required")

    agent_request = AgentRequest(goal=goal, agent_type="coding")
    return await process_goal(agent_request)


@app.post("/agents/workflow", response_model=AgentResponse)
async def workflow_agent_endpoint(request: Dict[str, Any]):
    """Direct endpoint for the workflow agent."""
    goal = request.get("goal", "")
    if not goal:
        raise HTTPException(status_code=400, detail="Goal is required")

    agent_request = AgentRequest(goal=goal, agent_type="workflow")
    return await process_goal(agent_request)


@app.get("/agents/info")
async def agents_info():
    """Get information about available agents."""
    return {
        "coding": {
            "name": "Coding Assistant",
            "description": "Helps with code analysis, generation, debugging, and refactoring",
            "mode": "tools",
            "available_tools": app.state.coding_agent.list_tools() if hasattr(app.state, 'coding_agent') else []
        },
        "workflow": {
            "name": "Workflow Agent",
            "description": "Executes structured workflows for complex multi-step tasks",
            "mode": "flow",
            "workflow_id": app.state.workflow_agent.flow.id if hasattr(app.state, 'workflow_agent') and app.state.workflow_agent.flow else None
        }
    }


def main() -> None:
    """Main entry point for the application."""
    if not conf.validate():
        raise ValueError("Invalid configuration.")

    http_conf = conf.get_http_conf()
    logger.info(f"Starting Opper Agent API on port {http_conf.port}")
    uvicorn.run(
        "backend.main:app",
        host=http_conf.host,
        port=http_conf.port,
        reload=http_conf.autoreload,
        log_level="info",
        log_config=None
    )
