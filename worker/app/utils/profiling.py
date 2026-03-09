import time
from functools import wraps
from app.core.logging import logger

def profile_execution(name: str):
    """Decorator to profile function execution time."""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            start_time = time.time()
            result = func(*args, **kwargs)
            duration = (time.time() - start_time) * 1000
            logger.debug(f"Profiling: {name} took {duration:.2f}ms")
            return result
        return wrapper
    return decorator

class ExecutionMonitor:
    """Class to track performance metrics across different worker modules."""
    def __init__(self):
        self.metrics = {}

    def start(self, key: str):
        self.metrics[key] = time.time()

    def stop(self, key: str):
        if key in self.metrics:
            duration = (time.time() - self.metrics[key]) * 1000
            del self.metrics[key]
            return round(duration, 4)
        return 0.0

monitor = ExecutionMonitor()
