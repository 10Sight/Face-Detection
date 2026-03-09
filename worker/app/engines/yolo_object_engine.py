import cv2
import numpy as np
import time
import os
from ultralytics import YOLO
from app.core.config import settings
from app.core.logging import logger as log

class YOLOObjectEngine:
    def __init__(self, model_path=None, conf_threshold=0.25):
        """
        Initialize YOLOv8 Object Detection Engine.
        """
        self.model_path = model_path or str(settings.YOLO_OBJ_MODEL)
        self.conf_threshold = conf_threshold
        
        log.info(f"YOLOObjectEngine: Loading model from {self.model_path}")
        try:
            # Load the model once
            self.model = YOLO(self.model_path)
            # COCO classes mapping (YOLOv8 default)
            self.names = self.model.names
        except Exception as e:
            log.error(f"YOLOObjectEngine: Failed to load model: {e}")
            raise e

    def detect(self, frame, timestamp_ms=None):
        """
        Performs object detection using YOLOv8.
        
        Args:
            frame: OpenCV image (BGR or RGB).
            timestamp_ms: Optional timestamp (ignored, kept for compatibility).
        
        Returns:
            List of dicts: {label, confidence, class_id, bbox, bbox_px}
        """
        if frame is None:
            return []

        t0 = time.time()
        
        # Run inference
        results = self.model.predict(
            source=frame,
            conf=self.conf_threshold,
            verbose=False,
            device='cpu'  # Default to CPU as per current system capability
        )
        
        detection_time = int((time.time() - t0) * 1000)
        
        detections = []
        if results and len(results) > 0:
            result = results[0]
            boxes = result.boxes
            
            for box in boxes:
                # Bounding box in [x1, y1, x2, y2] pixel coordinates
                xyxy = box.xyxy[0].tolist()
                conf = float(box.conf[0])
                cls_id = int(box.cls[0])
                label = self.names[cls_id]
                
                # Normalize coordinates for downstream compatibility if needed
                h, w = frame.shape[:2]
                nx1, ny1, nx2, ny2 = xyxy[0]/w, xyxy[1]/h, xyxy[2]/w, xyxy[3]/h
                
                detections.append({
                    "label": label,
                    "confidence": conf,
                    "class_id": cls_id,
                    "bbox": [nx1, ny1, nx2, ny2], # Normalized [x1, y1, x2, y2]
                    "bbox_norm": {
                        "xmin": nx1, "ymin": ny1, "xmax": nx2, "ymax": ny2
                    },
                    "bbox_px": {
                        "x1": int(xyxy[0]), "y1": int(xyxy[1]), 
                        "x2": int(xyxy[2]), "y2": int(xyxy[3]),
                        "width": int(xyxy[2] - xyxy[0]),
                        "height": int(xyxy[3] - xyxy[1])
                    },
                    # For compatibility with existing ReID/Tracker logic
                    "xmin": nx1, "ymin": ny1, "xmax": nx2, "ymax": ny2
                })
        
        log.info(f"[PERF] object_detect_ms={detection_time} objects={len(detections)}")
        return detections
