import cv2
import numpy as np
import mediapipe as mpt
from mediapipe.tasks import python
from mediapipe.tasks.python import vision

class EmotionEngine:
    def __init__(self, model_path: str = 'face_landmarker.task'):
        base_options = python.BaseOptions(model_asset_path=model_path)
        options = vision.FaceLandmarkerOptions(
            base_options=base_options,
            output_face_blendshapes=True,
            output_facial_transformation_matrixes=True,
            num_faces=5
        )
        self.landmarker = vision.FaceLandmarker.create_from_options(options)
        self.emotions = ["Neutral", "Happy", "Sad", "Anger", "Surprise", "Fear", "Disgust"]

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

        # Map blendshapes to emotions (Heuristic mapping based on FACS)
        scores = {
            "Neutral": 0.5, # Base score
            "Happy": (blendshapes.get('mouthSmileLeft', 0) + blendshapes.get('mouthSmileRight', 0)) / 2 + blendshapes.get('cheekPuff', 0) * 0.5,
            "Sad": (blendshapes.get('mouthFrownLeft', 0) + blendshapes.get('mouthFrownRight', 0)) / 2 + blendshapes.get('browDownLeft', 0) * 0.3,
            "Anger": (blendshapes.get('browDownLeft', 0) + blendshapes.get('browDownRight', 0)) / 2 + blendshapes.get('mouthPucker', 0) * 0.5 + blendshapes.get('eyeSquintLeft', 0) * 0.2,
            "Surprise": (blendshapes.get('eyeWideLeft', 0) + blendshapes.get('eyeWideRight', 0)) / 2 + blendshapes.get('browInnerUp', 0) * 0.7 + blendshapes.get('jawOpen', 0) * 0.5,
            "Fear": (blendshapes.get('eyeWideLeft', 0) + blendshapes.get('eyeWideRight', 0)) / 2 + blendshapes.get('browInnerUp', 0) * 0.4 + blendshapes.get('mouthPucker', 0) * 0.3,
            "Disgust": (blendshapes.get('noseSneerLeft', 0) + blendshapes.get('noseSneerRight', 0)) / 2 + blendshapes.get('mouthUpperUpLeft', 0) * 0.5,
        }

        # Normalize scores (softmax-like or simple normalization)
        total = sum(scores.values())
        normalized_scores = {k: round(v / total, 4) for k, v in scores.items()}
        
        dominant = max(normalized_scores, key=normalized_scores.get)
        
        return {
            "scores": normalized_scores,
            "dominant": dominant
        }
