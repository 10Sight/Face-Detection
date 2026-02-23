import cv2
import numpy as np
import insightface
from insightface.app import FaceAnalysis
import os

class InsightFaceEngine:
    def __init__(self, model_name='buffalo_l', ctx_id=-1, det_size=(640, 640)):
        """
        Unified InsightFaceEngine for detection, recognition, and demographics.
        """
        self.det_size = det_size
        
        # Determine execution provider
        providers = ['CPUExecutionProvider']
        
        self.app = FaceAnalysis(name=model_name, providers=providers)
        self.app.prepare(ctx_id=ctx_id, det_size=self.det_size, det_thresh=0.15)

    def analyze(self, img_bgr: np.ndarray):
        """
        Processes a full frame for faces, embeddings, and demographics.
        Returns a list of face objects.
        """
        try:
            faces = self.app.get(img_bgr)
        except Exception as e:
            # Important: Log the error if possible, but for now just raise to be caught by service
            raise e
        
        results = []
        for face in faces:
            # bbox is [x1, y1, x2, y2]
            bbox = face.bbox.astype(int).tolist()
            
            # Use safe defaults for demographics
            age = 25
            gender = 1
            
            if hasattr(face, 'age') and face.age is not None:
                try:
                    age = int(face.age)
                except:
                    pass
            
            if hasattr(face, 'gender') and face.gender is not None:
                try:
                    gender = int(face.gender)
                except:
                    pass
            
            results.append({
                "bbox": bbox,
                "embedding": face.embedding.tolist() if face.embedding is not None else [],
                "age": age,
                "gender": gender,
                "det_score": float(face.det_score) if face.det_score is not None else 0.0
            })
            
        return results
