import asyncio
import logging
from typing import Optional, Dict, Any
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass
class RedisConf:
    """Redis configuration"""
    host: str
    port: int
    password: str
    db: int

    def get_connection_string(self) -> str:
        """Get Redis connection string"""
        if self.password:
            return f"redis://:{self.password}@{self.host}:{self.port}/{self.db}"
        else:
            return f"redis://{self.host}:{self.port}/{self.db}"


class RedisClient:
    """
    Lightweight Redis client for caching and session management.
    
    Handles connection management and provides common operations
    for agent state caching and real-time data.
    
    Only initializes if USE_REDIS is True in configuration.
    """

    def __init__(self, config: Optional[RedisConf] = None):
        self._config = config
        self._redis = None
        self._initialized = False
        self._connected = False
        self._connection_task = None
        self._last_connection_error = None

    async def initialize(self):
        """Initialize the Redis client"""
        if not self._config:
            raise ValueError("RedisConf required")
        
        self._initialized = True
        logger.info("Redis client initialized")

    async def init_connection(self):
        """Initialize connection with retry loop - call in background task"""
        if not self._initialized:
            return

        self._connection_task = asyncio.create_task(self._connection_retry_loop())

    async def _connection_retry_loop(self):
        """Retry connection loop that runs in background"""
        while not self._connected:
            try:
                import redis.asyncio as redis
                
                logger.info("Connecting to Redis...")
                self._redis = redis.from_url(
                    self._config.get_connection_string(),
                    decode_responses=True,
                    socket_connect_timeout=5,
                    socket_timeout=5
                )
                
                # Test the connection
                await self._redis.ping()
                
                self._connected = True
                logger.info("Redis connection established successfully")
                break

            except ImportError:
                logger.error("redis package not installed. Add it with: uv add redis")
                self._last_connection_error = "redis package not installed"
                await asyncio.sleep(10)
                
            except Exception as e:
                self._last_connection_error = str(e)
                logger.warning(f"Redis connection failed, retrying: {e}")
                await asyncio.sleep(1)  # Wait 1 second before retry

    def _ensure_initialized(self):
        """Ensure client is initialized"""
        if not self._initialized:
            raise RuntimeError("Redis client not initialized")

    async def _ensure_connected(self):
        """Ensure client is connected (blocks until connected)"""
        self._ensure_initialized()
        while not self._connected:
            await asyncio.sleep(0.1)  # Wait for connection

    async def close(self):
        """Close the Redis client"""
        if self._connection_task:
            self._connection_task.cancel()
            try:
                await self._connection_task
            except asyncio.CancelledError:
                pass
            self._connection_task = None

        if self._redis:
            await self._redis.close()
            self._redis = None
            self._connected = False
            self._initialized = False
            logger.info("Redis client closed")

    async def get(self, key: str) -> Optional[str]:
        """Get a value from Redis"""
        await self._ensure_connected()
        if not self._redis:
            return None
        
        try:
            return await self._redis.get(key)
        except Exception as e:
            logger.error(f"Redis GET error: {e}")
            return None

    async def set(self, key: str, value: str, ex: Optional[int] = None) -> bool:
        """Set a value in Redis with optional expiration"""
        await self._ensure_connected()
        if not self._redis:
            return False
        
        try:
            await self._redis.set(key, value, ex=ex)
            return True
        except Exception as e:
            logger.error(f"Redis SET error: {e}")
            return False

    async def delete(self, key: str) -> bool:
        """Delete a key from Redis"""
        await self._ensure_connected()
        if not self._redis:
            return False
        
        try:
            result = await self._redis.delete(key)
            return result > 0
        except Exception as e:
            logger.error(f"Redis DELETE error: {e}")
            return False

    async def exists(self, key: str) -> bool:
        """Check if a key exists in Redis"""
        await self._ensure_connected()
        if not self._redis:
            return False
        
        try:
            result = await self._redis.exists(key)
            return result > 0
        except Exception as e:
            logger.error(f"Redis EXISTS error: {e}")
            return False

    async def publish(self, channel: str, message: str) -> bool:
        """Publish a message to a Redis channel"""
        await self._ensure_connected()
        if not self._redis:
            return False
        
        try:
            await self._redis.publish(channel, message)
            return True
        except Exception as e:
            logger.error(f"Redis PUBLISH error: {e}")
            return False

    async def is_connected(self) -> bool:
        """Check if Redis is connected and responsive (blocking)"""
        await self._ensure_connected()
        
        if not self._redis:
            return False

        try:
            await self._redis.ping()
            return True
        except Exception:
            return False

    def health_check(self) -> Dict[str, Any]:
        """Check if Redis connection is healthy (non-blocking for health endpoints)"""
        if not self._initialized:
            return {"connected": False, "status": "not_initialized"}

        if not self._connected:
            return {
                "connected": False,
                "status": "connecting",
                "last_error": self._last_connection_error
            }

        return {"connected": True, "status": "healthy"}