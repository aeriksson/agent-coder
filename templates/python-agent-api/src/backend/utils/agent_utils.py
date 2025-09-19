"""
Utility functions for agent management and operations.
"""

import asyncio
from typing import Any
from ..utils import log

logger = log.get_logger(__name__)


def get_agent_schema(agent: Any) -> dict[str, Any]:
    """
    Extract input and output schemas from an agent using Pydantic models.

    Args:
        agent: The agent instance to extract schemas from

    Returns:
        Dictionary containing input_schema, output_schema, and mode
    """
    try:
        # Flow mode agents have Pydantic input/output models
        if hasattr(agent, 'flow') and agent.flow:
            input_schema = None
            output_schema = None

            # Get JSON schema directly from Pydantic models
            if hasattr(agent.flow, 'input_model') and agent.flow.input_model:
                input_schema = agent.flow.input_model.model_json_schema()

            if hasattr(agent.flow, 'output_model') and agent.flow.output_model:
                output_schema = agent.flow.output_model.model_json_schema()

            return {
                "input_schema": input_schema,
                "output_schema": output_schema,
                "mode": "flow"
            }
        else:
            # Tools mode agents accept free-form string input (standard pattern)
            return {
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "goal": {
                            "type": "string",
                            "description": "Natural language description of what you want the agent to do"
                        }
                    },
                    "required": ["goal"]
                },
                "output_schema": {
                    "type": "string",
                    "description": "Agent response as text"
                },
                "mode": "tools"
            }
    except Exception as e:
        logger.warning(f"Failed to extract schema for agent: {e}")
        # Fallback for any errors
        return {
            "input_schema": {
                "type": "object",
                "properties": {
                    "goal": {
                        "type": "string",
                        "description": "Natural language description of what you want the agent to do"
                    }
                },
                "required": ["goal"]
            },
            "output_schema": {"type": "string"},
            "mode": "unknown"
        }


async def cleanup_all_background_tasks(grace_period: float = 3.0) -> None:
    """
    Clean up all background tasks with graceful shutdown and force kill.

    Args:
        grace_period: Time in seconds to wait for graceful shutdown
    """
    # Get all currently running tasks except the current one and server-related tasks
    current_task = asyncio.current_task()
    all_tasks = []

    for task in asyncio.all_tasks():
        if task == current_task:
            continue

        # Try to identify server-related tasks to skip them
        try:
            coro_name = task.get_coro().__name__ if hasattr(task.get_coro(), '__name__') else ''

            # Skip FastAPI/Uvicorn server tasks
            if any(skip in coro_name.lower() for skip in ['serve', '_serve', 'shutdown', 'lifespan']):
                logger.debug(f"Skipping server task: {coro_name}")
                continue
            if 'uvicorn' in str(task).lower() or 'fastapi' in str(task).lower():
                logger.debug(f"Skipping framework task: {task}")
                continue
        except:
            pass

        all_tasks.append(task)

    if not all_tasks:
        logger.info("No agent background tasks to clean up")
        return

    # Log information about tasks we're going to clean up
    task_info = []
    for task in all_tasks:
        try:
            coro_name = task.get_coro().__name__ if hasattr(task.get_coro(), '__name__') else str(task.get_coro())
            task_info.append(f"{coro_name}({task.get_name() if hasattr(task, 'get_name') else 'unnamed'})")
        except:
            task_info.append(f"task-{id(task)}")

    logger.info(f"Cleaning up {len(all_tasks)} agent background tasks: {task_info}")
    logger.info(f"Waiting {grace_period}s for graceful shutdown...")

    # Phase 1: Graceful shutdown - cancel all tasks
    for task in all_tasks:
        if not task.done():
            task.cancel()

    # Phase 2: Wait for graceful completion
    try:
        await asyncio.wait_for(
            asyncio.gather(*all_tasks, return_exceptions=True),
            timeout=grace_period
        )
        logger.info("All background tasks completed gracefully")
    except asyncio.TimeoutError:
        # Phase 3: Force kill any remaining tasks
        remaining = [task for task in all_tasks if not task.done()]

        if remaining:
            remaining_info = []
            for task in remaining:
                try:
                    coro_name = task.get_coro().__name__ if hasattr(task.get_coro(), '__name__') else str(task.get_coro())
                    remaining_info.append(f"{coro_name}({task.get_name() if hasattr(task, 'get_name') else 'unnamed'})")
                except:
                    remaining_info.append(f"task-{id(task)}")

            logger.warning(f"Killing {len(remaining)} stubborn tasks: {remaining_info}")

            for task in remaining:
                task.cancel()

            # Wait a bit more for force cancellation
            try:
                await asyncio.wait_for(
                    asyncio.gather(*remaining, return_exceptions=True),
                    timeout=1.0
                )
                logger.info("Force cancellation completed")
            except asyncio.TimeoutError:
                # Check what's still alive
                still_alive = [task for task in remaining if not task.done()]
                if still_alive:
                    alive_info = []
                    for task in still_alive:
                        try:
                            coro_name = task.get_coro().__name__ if hasattr(task.get_coro(), '__name__') else str(task.get_coro())
                            alive_info.append(f"{coro_name}({task.get_name() if hasattr(task, 'get_name') else 'unnamed'})")
                        except:
                            alive_info.append(f"task-{id(task)}")

                    logger.error(f"The following {len(still_alive)} tasks refused to die: {alive_info}")
                    logger.error("Proceeding with shutdown anyway - some tasks may be stuck in network I/O")