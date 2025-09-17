import uvicorn
import json
import asyncio
from contextlib import asynccontextmanager
from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from pydantic import BaseModel
from typing import Any, Dict, Optional, List
from .utils import log
from . import conf
from .agents import get_coding_agent

log.init(conf.get_log_level())
logger = log.get_logger(__name__)


class AgentRegistry:
    """Registry for tracking and managing agents."""
    
    def __init__(self):
        self.agents: Dict[str, Any] = {}
        self.websocket_manager = WebSocketManager()
    
    def register_agent(self, name: str, agent: Any):
        """Register an agent in the registry."""
        # Wrap agent callbacks to emit events via WebSocket
        original_callback = getattr(agent, 'callback', None)
        
        def enhanced_callback(event_type: str, data: Any):
            # Call original callback if it exists
            if original_callback:
                original_callback(event_type, data)
            
            # Format and emit via WebSocket
            event_data = {
                "timestamp": asyncio.get_event_loop().time(),
                "type": "agent_event",
                "agent_name": name,
                "event_type": event_type,
                "data": data
            }
            
            # Handle different event types with structured data
            if event_type == "thought":
                event_data["message"] = f"💭 {data.get('content', str(data))}"
            elif event_type == "action":
                event_data["message"] = f"🔧 Executing: {data.get('name', 'action')}"
            elif event_type == "observation":
                event_data["message"] = f"👀 Result: {str(data)[:100]}..."
            elif event_type == "error":
                event_data["message"] = f"❌ Error: {str(data)}"
            elif event_type == "goal_start":
                event_data["message"] = f"🎯 Starting goal: {str(data)}"
            elif event_type == "goal_complete":
                event_data["message"] = f"✅ Goal completed"
            else:
                event_data["message"] = f"📝 {event_type}: {str(data)[:100]}"
            
            # Broadcast to all connected WebSocket clients
            asyncio.create_task(self.websocket_manager.broadcast(event_data))
        
        agent.callback = enhanced_callback
        self.agents[name] = agent
        logger.info(f"Registered agent: {name}")
    
    def get_agent(self, name: str) -> Optional[Any]:
        """Get an agent by name."""
        return self.agents.get(name)
    
    def list_agents(self) -> Dict[str, Dict[str, Any]]:
        """List all registered agents with their metadata."""
        result = {}
        for name, agent in self.agents.items():
            result[name] = {
                "name": agent.name,
                "description": agent.description,
                "mode": agent.mode,
                "max_iterations": agent.max_iterations,
                "verbose": agent.verbose,
                "tools": [tool.name for tool in agent.tools] if hasattr(agent, 'tools') else [],
                "workflow_id": agent.flow.id if hasattr(agent, 'flow') and agent.flow else None,
            }
        return result


class WebSocketManager:
    """Manage WebSocket connections for real-time updates."""
    
    def __init__(self):
        self.active_connections: List[WebSocket] = []
    
    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(f"WebSocket connected. Total connections: {len(self.active_connections)}")
    
    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        logger.info(f"WebSocket disconnected. Total connections: {len(self.active_connections)}")
    
    async def send_personal_message(self, message: dict, websocket: WebSocket):
        try:
            await websocket.send_text(json.dumps(message))
        except Exception as e:
            logger.error(f"Error sending WebSocket message: {e}")
            self.disconnect(websocket)
    
    async def broadcast(self, message: dict):
        """Broadcast message to all connected clients."""
        if not self.active_connections:
            return
            
        disconnected = []
        for connection in self.active_connections:
            try:
                await connection.send_text(json.dumps(message))
            except Exception as e:
                logger.error(f"Error broadcasting WebSocket message: {e}")
                disconnected.append(connection)
        
        # Remove disconnected clients
        for connection in disconnected:
            self.disconnect(connection)


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
    
    # Initialize PostgreSQL client if enabled
    if conf.USE_POSTGRES:
        from .clients.postgres import PostgresClient
        from sqlmodel import SQLModel
        from .db import models  # noqa: F401  # Import to register models
        
        postgres_config = conf.get_postgres_conf()
        pool_config = conf.get_postgres_pool_conf()
        app.state.postgres_client = PostgresClient(postgres_config, pool_config)
        await app.state.postgres_client.initialize()
        await app.state.postgres_client.init_connection()
        
        # Create tables after connection is established
        await app.state.postgres_client.create_tables(SQLModel.metadata)
        logger.info("PostgreSQL client initialized")
    
    # Initialize Redis client if enabled
    if conf.USE_REDIS:
        from .clients.redis import RedisClient
        
        redis_config = conf.get_redis_conf()
        app.state.redis_client = RedisClient(redis_config)
        await app.state.redis_client.initialize()
        await app.state.redis_client.init_connection()
        logger.info("Redis client initialized")
    
    # Initialize agent registry
    app.state.agent_registry = AgentRegistry()
    
    # Initialize agents and register them
    try:
        example_agent = get_coding_agent()
        app.state.agent_registry.register_agent("example", example_agent)
        
        # Keep backward compatibility
        app.state.example_agent = example_agent
        
        logger.info("Example agent initialized and registered successfully")
    except Exception as e:
        logger.error(f"Failed to initialize agents: {e}")
        raise

    yield

    logger.info("Shutting down Opper agent SDK application...")
    
    # Clean up PostgreSQL client if enabled
    if conf.USE_POSTGRES and hasattr(app.state, 'postgres_client'):
        await app.state.postgres_client.close()
    
    # Clean up Redis client if enabled  
    if conf.USE_REDIS and hasattr(app.state, 'redis_client'):
        await app.state.redis_client.close()


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


@app.get("/agents")
async def list_agents():
    """List all registered agents with their metadata."""
    return app.state.agent_registry.list_agents()


@app.get("/agents/{agent_name}")
async def get_agent_info(agent_name: str):
    """Get detailed information about a specific agent."""
    agent = app.state.agent_registry.get_agent(agent_name)
    if not agent:
        raise HTTPException(status_code=404, detail=f"Agent '{agent_name}' not found")
    
    return {
        "name": agent.name,
        "description": agent.description,
        "mode": agent.mode,
        "max_iterations": agent.max_iterations,
        "verbose": agent.verbose,
        "tools": [tool.name for tool in agent.tools] if hasattr(agent, 'tools') else [],
        "workflow_id": agent.flow.id if hasattr(agent, 'flow') and agent.flow else None,
    }


@app.post("/agents/{agent_name}/test")
async def test_agent(agent_name: str, request: Dict[str, Any]):
    """Test an agent with a goal and stream execution via WebSocket."""
    agent = app.state.agent_registry.get_agent(agent_name)
    if not agent:
        raise HTTPException(status_code=404, detail=f"Agent '{agent_name}' not found")
    
    goal = request.get("goal", "")
    if not goal:
        raise HTTPException(status_code=400, detail="Goal is required")
    
    try:
        # Process the goal (events will be streamed via WebSocket callbacks)
        result = agent.process(goal)
        
        return {
            "success": True,
            "result": result,
            "agent_name": agent_name
        }
    except Exception as e:
        logger.error(f"Error testing agent {agent_name}: {str(e)}")
        return {
            "success": False,
            "error": str(e),
            "agent_name": agent_name
        }


@app.websocket("/ws/agents")
async def websocket_agent_events(websocket: WebSocket):
    """WebSocket endpoint for real-time agent events."""
    await app.state.agent_registry.websocket_manager.connect(websocket)
    try:
        while True:
            # Keep connection alive and wait for client messages
            await websocket.receive_text()
    except WebSocketDisconnect:
        app.state.agent_registry.websocket_manager.disconnect(websocket)


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
