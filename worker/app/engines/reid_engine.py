import cv2
import numpy as np
import onnxruntime
import os
import requests
from app.core.config import settings
from app.core.logging import logger as log

class ReIDEngine:
    def __init__(self, model_path=None):
        self.model_path = model_path or str(settings.REID_MODEL)
        self._ensure_model()
        
        # Optimization: Limit ONNX threads for Windows CPU performance
        self.so = onnxruntime.SessionOptions()
        self.so.intra_op_num_threads = 1
        self.so.inter_op_num_threads = 1
        
        # Initialize ONNX Session
        self.session = onnxruntime.InferenceSession(
            self.model_path, 
            self.so, 
            providers=['CPUExecutionProvider']
        )
        
        # Get input/output names
        self.input_name = self.session.get_inputs()[0].name
        self.output_name = self.session.get_outputs()[0].name
        
        # OSNet standard input size
        self.input_size = (128, 256) # (width, height)
        
        log.info(f"ReIDEngine: Initialized with model {self.model_path}")

    def _ensure_model(self):
        """Downloads the ReID model if missing."""
        if not os.path.exists(self.model_path):
            os.makedirs(os.path.dirname(self.model_path), exist_ok=True)
            model_name = os.path.basename(self.model_path)
            url = settings.URLS.get(model_name)
            if url:
                log.info(f"ReIDEngine: Downloading {model_name}...")
                r = requests.get(url, stream=True)
                with open(self.model_path, "wb") as f:
                    for chunk in r.iter_content(8192):
                        f.write(chunk)
                log.info(f"ReIDEngine: Download complete.")
            else:
                log.error(f"ReIDEngine: No download URL for {model_name}")

    def _preprocess(self, crop):
        """Prepare person crop for OSNet."""
        # Mean/Std for Market1501/ImageNet normalization
        mean = np.array([0.485, 0.456, 0.406], dtype=np.float32)
        std = np.array([0.229, 0.224, 0.225], dtype=np.float32)
        
        img = cv2.resize(crop, self.input_size)
        img = img.astype(np.float32) / 255.0
        img = (img - mean) / std
        img = img.transpose(2, 0, 1) # HWC to CHW
        img = np.expand_dims(img, axis=0).astype(np.float32) # Add batch dimension and force float32
        return img

    def extract_embedding(self, crop):
        """
        Generates an L2-normalized embedding for a single person crop.
        """
        if crop is None or crop.size == 0:
            return []
            
        try:
            input_tensor = self._preprocess(crop)
            outputs = self.session.run([self.output_name], {self.input_name: input_tensor})
            embedding = outputs[0][0] # First batch, first output
            
            # L2 Normalization
            norm = np.linalg.norm(embedding)
            if norm > 0:
                embedding = embedding / norm
                
            return embedding.tolist()
        except Exception as e:
            log.error(f"ReIDEngine Error: {e}")
            return []

    def analyze_persons(self, image_rgb, person_detections):
        """
        Processes multiple person detections in a frame.
        @param person_detections: List of dicts with 'bbox_px' and 'confidence'.
        @returns: List of results with embeddings and bboxes.
        """
        results = []
        h, w = image_rgb.shape[:2]
        
        for det in person_detections:
            if det.get("label") != "person":
                continue
                
            bbox = det.get("bbox_px")
            if not bbox:
                continue
                
            x1, y1 = max(0, int(bbox["x1"])), max(0, int(bbox["y1"]))
            x2, y2 = min(w, int(bbox["x2"])), min(h, int(bbox["y2"]))
            
            if x2 > x1 and y2 > y1:
                crop = image_rgb[y1:y2, x1:x2]
                embedding = self.extract_embedding(crop)
                
                results.append({
                    "bbox": det.get("bbox_norm"),
                    "reid_embedding": embedding,
                    "confidence": det.get("confidence")
                })
                
        return results
