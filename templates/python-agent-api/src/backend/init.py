"""
Application initialization module.

This module handles all initialization logic that should run on startup
and can be re-run for hot reloading. It's designed to be generic and
extensible for future initialization needs.
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from sqlmodel import SQLModel
from . import conf
from .utils import log
from .registry import AgentRegistry
from .agents import AGENTS
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

    # Add more initialization tasks here as needed
    # Examples:
    # - await init_metrics()
    # - await validate_environment()
    # - await warm_caches()


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

        # Create tables after connection is established
        await app.state.postgres_client.create_tables(SQLModel.metadata)
        logger.info("PostgreSQL client initialized")

        # Use PostgreSQL repository
        from .repositories.postgres_calls import PostgresCallRepository
        app.state.call_repository = PostgresCallRepository(app.state.postgres_client)
    else:
        # Use in-memory repository
        from .repositories.calls import InMemoryCallRepository
        app.state.call_repository = InMemoryCallRepository()

    logger.info(f"Using {'PostgreSQL' if conf.USE_POSTGRES else 'in-memory'} call repository")


async def init_cache(app: FastAPI) -> None:
    """
    Initialize cache connections if configured.

    Args:
        app: FastAPI application instance
    """
    if conf.USE_REDIS:
        from .clients.redis import RedisClient

        redis_config = conf.get_redis_conf()
        app.state.redis_client = RedisClient(redis_config)
        await app.state.redis_client.initialize()
        await app.state.redis_client.init_connection()
        logger.info("Redis client initialized")


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

    # Register all agents from the AGENTS list
    try:
        if AGENTS:
            for agent_name, agent_func in AGENTS:
                try:
                    agent = agent_func()
                    app.state.agent_registry.register_agent(agent_name, agent)
                except Exception as e:
                    logger.error(f"Failed to initialize agent {agent_name}: {e}")

            logger.info(f"Successfully registered {len(AGENTS)} agents")
        else:
            logger.info("No agents configured. Create your first agent with: bin/add-agent <name>")
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
    if conf.USE_POSTGRES and hasattr(app.state, 'postgres_client'):
        await app.state.postgres_client.close()

    # Clean up Redis client if enabled
    if conf.USE_REDIS and hasattr(app.state, 'redis_client'):
        await app.state.redis_client.close()

    # Clean up agent registry event tasks
    if hasattr(app.state, 'agent_registry'):
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
    logger.info("Starting Opper Agent API...")

    # Run generic initialization
    await init()

    # Initialize components
    await init_database(app)
    await init_cache(app)
    await init_agents(app)

    logger.info("Opper Agent API ready")

    yield

    # Cleanup on shutdown
    await cleanup(app)