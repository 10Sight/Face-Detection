from app.core.logging import logger
from app.services.perception_service import perception_service

async def startup():
    """Execution triggered on FastAPI startup."""
    logger.info("!!! WORKER INITIALIZING !!!")
    try:
        # Initialize the heavy perception service in the background
        # Note: perception_service handles its own thread creation
        perception_service.initialize()
        logger.info("Lifecycle: Perception Service initialization sequence started.")
    except Exception as e:
        logger.error(f"Lifecycle: Startup FAILURE: {e}")

async def shutdown():
    """Execution triggered on FastAPI shutdown."""
    logger.info("!!! WORKER SHUTTING DOWN !!!")
    try:
        perception_service.stop()
        logger.info("Lifecycle: Perception Service gracefully stopped.")
    except Exception as e:
        logger.error(f"Lifecycle: Error during shutdown: {e}")
