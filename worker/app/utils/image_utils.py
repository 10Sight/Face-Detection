import cv2
import numpy as np

def resize_frame(frame: np.ndarray, scale: float):
    """Resizes a frame by a given scale factor."""
    if scale == 1.0:
        return frame
    h, w = frame.shape[:2]
    return cv2.resize(frame, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_AREA)

def bgr_to_rgb(frame: np.ndarray):
    """Converts a BGR frame (OpenCV) to RGB (MediaPipe/InsightFace)."""
    return cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
