import cv2
import numpy as np
import mediapipe as mpt
from mediapipe.tasks import python
from mediapipe.tasks.python import vision
from app.core.config import settings

import os
import requests
from app.core.logging import logger as log

class EmotionEngine:
    def __init__(self, model_path: str = None):
        self.model_path = model_path or str(settings.EMOTION_MODEL)
        self._ensure_model()
        
        base_options = python.BaseOptions(model_asset_path=self.model_path)
        options = vision.FaceLandmarkerOptions(
            base_options=base_options,
            output_face_blendshapes=True,
            output_facial_transformation_matrixes=True,
            num_faces=5
        )
        self.landmarker = vision.FaceLandmarker.create_from_options(options)
        self.emotions = ["Neutral", "Happy", "Sad", "Anger", "Surprise", "Fear", "Disgust"]

    def _ensure_model(self):
        """Downloads the model if missing."""
        if not os.path.exists(self.model_path):
            os.makedirs(os.path.dirname(self.model_path), exist_ok=True)
            model_name = os.path.basename(self.model_path)
            url = settings.URLS.get(model_name)
            if url:
                log.info(f"EmotionEngine: Downloading {model_name}...")
                r = requests.get(url, stream=True)
                with open(self.model_path, "wb") as f:
                    for chunk in r.iter_content(8192):
                        f.write(chunk)
                log.info(f"EmotionEngine: Download complete.")
            else:
                log.error(f"EmotionEngine: No download URL for {model_name}")


    def detect_emotion(self, face_chip: np.ndarray):
        """
        Analyzes a face chip using MediaPipe Blendshapes and maps them to emotions.
        """
        # Convert BGR to RGB
        image_rgb = cv2.cvtColor(face_chip, cv2.COLOR_BGR2RGB)
        mp_image = mpt.Image(image_format=mpt.ImageFormat.SRGB, data=image_rgb)
        
        # Run Landmarker
        result = self.landmarker.detect(mp_image)
        
        if not result.face_blendshapes:
            return {"scores": {e: 0.0 for e in self.emotions}, "dominant": "Neutral"}

        # Extract blendshapes into a dict for easy access
        # Each face_blendshape is a list of Category objects with category_name and score
        blendshapes = {b.category_name: b.score for b in result.face_blendshapes[0]}

        # Map blendshapes to emotions (Refined Heuristic mapping)
        # We also boost certain emotions and handle "Neutral" more dynamically
        scores = {
            "Neutral": 0.4, # Lowered default base
            "Happy": (blendshapes.get('mouthSmileLeft', 0) + blendshapes.get('mouthSmileRight', 0)) / 2 + blendshapes.get('cheekPuff', 0) * 0.3,
            "Sad": (blendshapes.get('mouthFrownLeft', 0) + blendshapes.get('mouthFrownRight', 0)) / 2 + blendshapes.get('browDownLeft', 0) * 0.4 + blendshapes.get('mouthPucker', 0) * 0.1,
            "Anger": (blendshapes.get('browDownLeft', 0) + blendshapes.get('browDownRight', 0)) / 2 + blendshapes.get('mouthPucker', 0) * 0.4 + (blendshapes.get('eyeSquintLeft', 0) + blendshapes.get('eyeSquintRight', 0)) * 0.2,
            "Surprise": (blendshapes.get('eyeWideLeft', 0) + blendshapes.get('eyeWideRight', 0)) / 2 + blendshapes.get('browInnerUp', 0) * 0.8 + blendshapes.get('jawOpen', 0) * 0.6,
            "Fear": (blendshapes.get('eyeWideLeft', 0) + blendshapes.get('eyeWideRight', 0)) / 2 + blendshapes.get('browInnerUp', 0) * 0.5 + blendshapes.get('browDownLeft', 0) * 0.2,
            "Disgust": (blendshapes.get('noseSneerLeft', 0) + blendshapes.get('noseSneerRight', 0)) / 2 + blendshapes.get('mouthUpperUpLeft', 0) * 0.6 + blendshapes.get('mouthLowerDownLeft', 0) * 0.2,
        }

        # Normalize scores (softmax-like or simple normalization)
        total = sum(scores.values())
        normalized_scores = {k: round(v / total, 4) for k, v in scores.items()}
        
        dominant = max(normalized_scores, key=normalized_scores.get)
        
        return {
            "scores": normalized_scores,
            "dominant": dominant
        }
