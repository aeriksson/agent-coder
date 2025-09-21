"""
API routes for the agent server.

Routes are organized into logical groups:
- agents.py: Agent management and execution endpoints
- calls.py: Call tracking and management endpoints
- events.py: Event streaming and WebSocket endpoints
"""

from fastapi import FastAPI
from .agents import router as agents_router
from .calls import router as calls_router
from .events import router as events_router


def register_routes(app: FastAPI) -> None:
    """
    Register all route handlers with the FastAPI application.

    Args:
        app: The FastAPI application instance
    """
    app.include_router(agents_router, prefix="/api/v1")
    app.include_router(calls_router, prefix="/api/v1")
    app.include_router(events_router, prefix="/api/v1")
