import logging
import sys
import os
from logging.handlers import RotatingFileHandler

# Phase 6: Centralized Structured Logging
class WorkerLogger:
    def __init__(self, name="worker", log_level=logging.INFO):
        self.logger = logging.getLogger(name)
        self.logger.setLevel(log_level)
        self.logger.propagate = False
        
        # Avoid duplicate handlers
        if not self.logger.handlers:
            self._setup_handlers()

    def _setup_handlers(self):
        # 1. Console Handler (Standard Output)
        console_formatter = logging.Formatter(
            '[%(asctime)s] [%(levelname)s] [%(name)s] [%(module)s:%(lineno)d] - %(message)s',
            datefmt='%Y-%m-%d %H:%M:%S'
        )
        console_handler = logging.StreamHandler(sys.stdout)
        console_handler.setFormatter(console_formatter)
        self.logger.addHandler(console_handler)

        # 2. File Handler (Rotating)
        os.makedirs("logs", exist_ok=True)
        file_formatter = logging.Formatter(
            '{"timestamp": "%(asctime)s", "level": "%(levelname)s", "logger": "%(name)s", "module": "%(module)s", "line": %(lineno)d, "message": "%(message)s"}',
            datefmt='%Y-%m-%dT%H:%M:%S%z'
        )
        file_handler = RotatingFileHandler(
            "logs/worker.log", maxBytes=10*1024*1024, backupCount=5
        )
        file_handler.setFormatter(file_formatter)
        self.logger.addHandler(file_handler)

    def get_logger(self):
        return self.logger

# Global instance
logger = WorkerLogger().get_logger()
log = logger # Backward compatibility alias
