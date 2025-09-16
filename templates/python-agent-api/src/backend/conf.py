from pydantic import BaseModel
from .utils import env, log
from .utils.env import EnvVarSpec

logger = log.get_logger(__name__)

#### Types ####

class HttpServerConf(BaseModel):
    host: str
    port: int
    autoreload: bool

#### Env Vars ####

## Logging ##
LOG_LEVEL = EnvVarSpec(id="LOG_LEVEL", default="INFO")

## HTTP ##
HTTP_HOST = EnvVarSpec(id="HTTP_HOST", default="0.0.0.0")
HTTP_PORT = EnvVarSpec(id="HTTP_PORT", default="8000")
HTTP_AUTORELOAD = EnvVarSpec(
    id="HTTP_AUTORELOAD",
    parse=lambda x: x.lower() == "true",
    default="false",
    type=(bool, ...),
)

## Opper API ##
OPPER_API_KEY = EnvVarSpec(
    id="OPPER_API_KEY",
    is_secret=True,
    is_optional=False  # Required for Opper agents
)

#### Validation ####

def validate() -> bool:
    """Validate required environment variables."""
    env_vars = [
        LOG_LEVEL,
        HTTP_HOST,
        HTTP_PORT,
        HTTP_AUTORELOAD,
        OPPER_API_KEY,
    ]

    is_valid = env.validate(env_vars)

    if not is_valid:
        logger.error("Environment validation failed. Make sure OPPER_API_KEY is set.")

    return is_valid

#### Getters ####

def get_log_level() -> str:
    """Get the log level."""
    return env.parse(LOG_LEVEL)

def get_http_conf() -> HttpServerConf:
    """Get HTTP server configuration."""
    return HttpServerConf(
        host=env.parse(HTTP_HOST),
        port=env.parse(HTTP_PORT),
        autoreload=env.parse(HTTP_AUTORELOAD),
    )

def get_opper_api_key() -> str:
    """Get Opper API key."""
    return env.parse(OPPER_API_KEY)
