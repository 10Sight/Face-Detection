import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision
import numpy as np
import cv2
from app.core.logging import logger as log

import os
import requests
from app.core.config import settings
from app.core.logging import logger as log

class ObjectDetectionEngine:
    def __init__(self, model_path=None, embedder_model=None, min_confidence=0.15, allowed_classes=None):
        self.model_path = model_path or str(settings.OBJECT_DETECTOR)
        self.embedder_path = embedder_model or str(settings.OBJECT_EMBEDDER)
        self.min_confidence = min_confidence
        self.allowed_classes = allowed_classes
        self.min_bbox_area = 0.005 # Default min area
        self._ensure_models()

        
        # Detector Initialization
        base_options = python.BaseOptions(model_asset_path=self.model_path)

        options = vision.ObjectDetectorOptions(
            base_options=base_options,
            score_threshold=min_confidence,
            running_mode=vision.RunningMode.VIDEO
        )
        self.detector = vision.ObjectDetector.create_from_options(options)
        
        # Embedder Initialization
        embedder_base_options = python.BaseOptions(model_asset_path=self.embedder_path)

        embedder_options = vision.ImageEmbedderOptions(
            base_options=embedder_base_options,
            running_mode=vision.RunningMode.IMAGE,
            l2_normalize=True,
            quantize=False
        )
        self.embedder = vision.ImageEmbedder.create_from_options(embedder_options)
        
    def _ensure_models(self):
        """Downloads the models if missing."""
        for path in [self.model_path, self.embedder_path]:
            if not os.path.exists(path):
                os.makedirs(os.path.dirname(path), exist_ok=True)
                model_name = os.path.basename(path)
                url = settings.URLS.get(model_name)
                if url:
                    log.info(f"ObjectEngine: Downloading {model_name}...")
                    r = requests.get(url, stream=True)
                    with open(path, "wb") as f:
                        for chunk in r.iter_content(8192):
                            f.write(chunk)
                    log.info(f"ObjectEngine: Download complete.")
                else:
                    log.error(f"ObjectEngine: No download URL for {model_name}")

        # Performance caching
        self._last_width = -1
        self._last_height = -1
        self._last_ts = -1


    def detect(self, image_rgb, frame_timestamp_ms):
        """
        Detects objects in an RGB image using VIDEO mode with embeddings.
        
        Returns:
            List of dicts: {label, confidence, class_id, bbox_norm, bbox_px, embedding}
        """
        if image_rgb is None:
            return []
            
        try:
            h, w = image_rgb.shape[:2]
            self._last_width, self._last_height = w, h
            
            # Phase 4.2: Lightweight Object Mode (Resolution Scaling)
            # Increased target_h to 480 for better accuracy with lite2
            target_h = 480
            if h > target_h:
                scale = target_h / h
                target_w = int(w * scale)
                proc_img = cv2.resize(image_rgb, (target_w, target_h), interpolation=cv2.INTER_AREA)
                proc_h, proc_w = target_h, target_w
            else:
                proc_img = image_rgb
                proc_h, proc_w = h, w

            mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=proc_img)
            
            # Ensure strictly increasing timestamp for VIDEO mode detector
            if frame_timestamp_ms <= self._last_ts:
                frame_timestamp_ms = self._last_ts + 1
            self._last_ts = frame_timestamp_ms

            detection_result = self.detector.detect_for_video(mp_image, frame_timestamp_ms)
            
            if not detection_result or not detection_result.detections:
                return []
                
            results = []
            for detection in detection_result.detections:
                category = detection.categories[0]
                score = float(category.score)
                label = category.category_name
                class_id = int(category.index) if category.index is not None else 0
                
                # 1. Confidence Filter
                if score < self.min_confidence:
                    continue
                    
                # 2. Allowed Classes Filter
                if self.allowed_classes and label not in self.allowed_classes:
                    continue
                    
                bbox = detection.bounding_box
                
                # Normalized Coordinates (Relative to Processed Frame)
                bt_w = bbox.width if bbox.width is not None else 0
                bt_h = bbox.height if bbox.height is not None else 0
                bt_x = bbox.origin_x if bbox.origin_x is not None else 0
                bt_y = bbox.origin_y if bbox.origin_y is not None else 0

                nx1 = float(bt_x / proc_w)
                ny1 = float(bt_y / proc_h)
                nw = float(bt_w / proc_w)
                nh = float(bt_h / proc_h)
                
                # 3. Minimum Area Filter (Normalized)
                if (nw * nh) < self.min_bbox_area:
                    continue
                
                # Pixel Coordinates in Original Image
                px1 = int(nx1 * w)
                py1 = int(ny1 * h)
                pw = int(nw * w)
                ph = int(nh * h)
                
                # Extract Embedding for the object crop
                embedding = []
                try:
                    x1_c, y1_c = max(0, int(bt_x)), max(0, int(bt_y))
                    x2_c, y2_c = min(proc_w, int(bt_x + bt_w)), min(proc_h, int(bt_y + bt_h))
                    
                    if x2_c > x1_c and y2_c > y1_c:
                        crop = proc_img[y1_c:y2_c, x1_c:x2_c]
                        mp_crop = mp.Image(image_format=mp.ImageFormat.SRGB, data=crop)
                        emb_result = self.embedder.embed(mp_crop)
                        if emb_result and emb_result.embeddings:
                            # Use float_embedding for MediaPipe compatibility
                            embedding = emb_result.embeddings[0].float_embedding.tolist()
                except Exception as emb_e:
                    # Silence to prevent terminal hang from log spam
                    pass


                results.append({
                    "label": label,
                    "confidence": score,
                    "class_id": class_id,
                    "xmin": nx1,
                    "ymin": ny1,
                    "xmax": nx1 + nw,
                    "ymax": ny1 + nh,
                    "width": nw,
                    "height": nh,
                    "embedding": embedding,
                    "bbox_norm": {
                        "xmin": nx1,
                        "ymin": ny1,
                        "xmax": nx1 + nw,
                        "ymax": ny1 + nh
                    },
                    "bbox_px": {
                        "x1": px1,
                        "y1": py1,
                        "x2": px1 + pw,
                        "y2": py1 + ph,
                        "width": pw,
                        "height": ph
                    }
                })
            return results
            
        except Exception as e:
            import traceback
            log.error(f"ObjectDetectionEngine Error: {e}\n{traceback.format_exc()}")
            return []

    def to_deepsort_format(self, detections):
        """
        Helper to convert engine detections into DeepSORT compatible format.
        Format: [([x, y, w, h], confidence, class_name), ...]
        """
        return [
            (
                [d['bbox_px']['x1'], d['bbox_px']['y1'], d['bbox_px']['width'], d['bbox_px']['height']],
                d['confidence'],
                d['label']
            )
            for d in detections
        ]
