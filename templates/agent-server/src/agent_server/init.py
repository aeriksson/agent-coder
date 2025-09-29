"""
Application initialization module.

This module handles all initialization logic that should run on startup
and can be re-run for hot reloading. It's designed to be generic and
extensible for future initialization needs.
"""

import warnings
from contextlib import asynccontextmanager
from fastapi import FastAPI
from sqlmodel import SQLModel
from . import conf
from .utils import log
from .registry import AgentRegistry
from .agents import AGENT_DEFINITIONS
from .utils.agent_utils import cleanup_all_background_tasks

logger = log.get_logger(__name__)


async def init() -> None:
    """
    Generic initialization function that can be extended with various
    initialization tasks. Called on startup and can be called again
    for hot reload scenarios.

    Currently initializes:
    - Logging system

    Future extensions might include:
    - Configuration reloading
    - Cache warming
    - Health checks
    - Metric collectors
    """
    # Initialize logging
    log.init(conf.get_log_level())
    
    # Silence specific Pydantic V2 deprecation warnings from Opper SDK
    warnings.filterwarnings(
        "ignore",
        category=DeprecationWarning,
        message=".*The `dict` method is deprecated; use `model_dump` instead.*",
    )


async def init_database(app: FastAPI) -> None:
    """
    Initialize database connections if configured.

    Args:
        app: FastAPI application instance
    """
    if conf.USE_POSTGRES:
        from .clients.postgres import PostgresClient
        from .db import models  # noqa: F401  # Import to register models

        postgres_config = conf.get_postgres_conf()
        pool_config = conf.get_postgres_pool_conf()
        app.state.postgres_client = PostgresClient(postgres_config, pool_config)
        await app.state.postgres_client.initialize()
        await app.state.postgres_client.init_connection()

        await app.state.postgres_client.create_tables(SQLModel.metadata)
        logger.info("PostgreSQL client initialized")

        # Use PostgreSQL repository
        from .repositories.postgres_calls import PostgresCallRepository

        app.state.call_repository = PostgresCallRepository(app.state.postgres_client)
    else:
        # Use in-memory repository
        from .repositories.calls import InMemoryCallRepository

        app.state.call_repository = InMemoryCallRepository()

    logger.info(
        f"Using {'PostgreSQL' if conf.USE_POSTGRES else 'in-memory'} call repository"
    )


async def init_agents(app: FastAPI) -> None:
    """
    Initialize and register all configured agents.

    Args:
        app: FastAPI application instance
    """
    # Initialize agent registry with call repository
    app.state.agent_registry = AgentRegistry(app.state.call_repository)

    # Start the event worker that will process all agent events
    await app.state.agent_registry.start_event_worker()

    # Register all agents from the AGENT_DEFINITIONS list
    try:
        if AGENT_DEFINITIONS:
            for agent_def in AGENT_DEFINITIONS:
                try:
                    agent = agent_def.factory()
                    app.state.agent_registry.register_agent(agent_def.name, agent)
                except Exception as e:
                    logger.exception(f"Failed to initialize agent {agent_def.name}")

            logger.info(f"Successfully registered {len(AGENT_DEFINITIONS)} agents")
        else:
            logger.info(
                "No agents configured. Create your first agent with: bin/add-agent <name>"
            )
    except Exception as e:
        logger.error(f"Failed to initialize agents: {e}")
        raise


async def cleanup(app: FastAPI) -> None:
    """
    Cleanup function for graceful shutdown.

    Args:
        app: FastAPI application instance
    """
    logger.info("Shutting down agent call system...")

    # Clean up PostgreSQL client if enabled
    if conf.USE_POSTGRES and hasattr(app.state, "postgres_client"):
        await app.state.postgres_client.close()

    # Clean up agent registry event tasks
    if hasattr(app.state, "agent_registry"):
        await app.state.agent_registry.cleanup()

    # Clean up all remaining background tasks
    await cleanup_all_background_tasks(grace_period=3.0)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifespan context manager for FastAPI application.

    Handles startup and shutdown lifecycle events.

    Args:
        app: FastAPI application instance
    """
    logger.info("Starting Agent Server...")

    # Run generic initialization
    await init()

    # Initialize components
    await init_database(app)
    await init_agents(app)

    logger.info("Agent Server ready")

    yield

    # Cleanup on shutdown
    await cleanup(app)
