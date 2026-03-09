class WorkerException(Exception):
    """Base exception for the 10Sight worker."""
    def __init__(self, message: str, code: int = 500):
        self.message = message
        self.code = code
        super().__init__(self.message)

class ModelLoadError(WorkerException):
    """Raised when an AI model fails to load."""
    def __init__(self, model_name: str):
        super().__init__(f"Failed to load model: {model_name}", code=500)

class FrameProcessingError(WorkerException):
    """Raised when frame processing fails."""
    def __init__(self, detail: str):
        super().__init__(f"Frame processing error: {detail}", code=500)
