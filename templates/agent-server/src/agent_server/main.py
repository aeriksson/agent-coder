"""
Opper Agent API Server

A clean, extensible API server for AI agents built with the Opper SDK.
This is the main entry point - all initialization logic is in init.py,
and routes are organized in the routes/ directory.
"""

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from . import conf
from .init import lifespan
from .routes import register_routes
from .utils import log

logger = log.get_logger(__name__)


def create_app() -> FastAPI:
    """
    Create and configure the FastAPI application.

    Returns:
        Configured FastAPI application instance
    """
    app = FastAPI(
        title="Opper Agent API",
        description="AI agents powered by Opper SDK with call-based execution",
        version="1.0.0",
        docs_url="/docs",
        lifespan=lifespan,
    )

    # Configure CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Register all routes
    register_routes(app)

    return app


app = create_app()


def main() -> None:
    """
    Main entry point for the application.

    Validates configuration and starts the uvicorn server.
    """
    if not conf.validate():
        raise ValueError("Invalid configuration. Check your environment variables.")

    http_conf = conf.get_http_conf()
    logger.info(f"Starting Opper Agent API on {http_conf.host}:{http_conf.port}")

    import os

    log_level = os.getenv("LOG_LEVEL", "INFO").lower()

    uvicorn.run(
        "agent_server.main:app",
        host=http_conf.host,
        port=http_conf.port,
        reload=http_conf.autoreload,
        log_level=log_level,
        log_config=None,
    )
