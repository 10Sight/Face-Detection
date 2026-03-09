import threading
import onnxruntime as ort
import os
from typing import Dict, Any
from app.core.logging import logger
from app.core.config import settings

class ModelRegistry:
    """
    Centralized Model Management (Phase 10).
    Responsible for loading, caching, and providing thread-safe access to AI models.
    """
    def __init__(self):
        self._models: Dict[str, Any] = {}
        self._lock = threading.Lock()
        
    def get_onnx_session(self, model_path: str, provider: str = 'CPUExecutionProvider') -> ort.InferenceSession:
        with self._lock:
            if model_path not in self._models:
                if not os.path.exists(model_path):
                    logger.error(f"ModelRegistry: Model file NOT FOUND at {model_path}")
                    raise FileNotFoundError(f"Model file {model_path} not found.")
                
                logger.info(f"ModelRegistry: Loading ONNX model from {model_path}...")
                session = ort.InferenceSession(model_path, providers=[provider])
                self._models[model_path] = session
            return self._models[model_path]

    def get_tflite_interpreter(self, model_path: str):
        # Conditional import for TFLite
        import tensorflow as tf
        with self._lock:
            if model_path not in self._models:
                logger.info(f"ModelRegistry: Loading TFLite model from {model_path}...")
                interpreter = tf.lite.Interpreter(model_path=model_path)
                interpreter.allocate_tensors()
                self._models[model_path] = interpreter
            return self._models[model_path]

    def clear(self):
        with self._lock:
            self._models.clear()
            logger.info("ModelRegistry: All models cleared from memory.")

# Global Singleton
model_registry = ModelRegistry()
