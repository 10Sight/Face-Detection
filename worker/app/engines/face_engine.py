import cv2
import numpy as np
import insightface
from insightface.app import FaceAnalysis
import os
import time

class InsightFaceEngine:
    def __init__(self, model_name='buffalo_s', ctx_id=-1, det_size=(640, 640)):
        """
        Unified InsightFaceEngine for detection, recognition, and demographics.
        Optimized for CPU speed (buffalo_s).
        """
        self.det_size = det_size
        
        # Determine execution provider
        providers = ['CPUExecutionProvider']
        
        # Optimization: Limit ONNX threads to avoid context-switch overhead (critical for Windows)
        import onnxruntime
        so = onnxruntime.SessionOptions()
        so.intra_op_num_threads = 1
        so.inter_op_num_threads = 1
        
        # Limit to essential modules: detection, recognition, genderage
        self.app = FaceAnalysis(name=model_name, providers=providers, allowed_modules=['detection', 'recognition', 'genderage'], sess_options=so)
        self.app.prepare(ctx_id=ctx_id, det_size=self.det_size, det_thresh=0.30)

    def analyze(self, img_bgr: np.ndarray):
        """
        Processes a full frame for faces, embeddings, and demographics.
        Returns a list of face objects.
        """
        from app.core.logging import logger as log
        t0 = time.time()
        try:
            faces = self.app.get(img_bgr)
            if len(faces) == 0:
                log.info("InsightFaceEngine: No faces detected in image buffer.")
        except Exception as e:
            # Important: Log the error if possible, but for now just raise to be caught by service
            raise e
        det_time = time.time() - t0
        
        results = []
        for face in faces:
            # bbox is [x1, y1, x2, y2]
            bbox = face.bbox.astype(int).tolist()
            log.info(f"InsightFaceEngine: Detected face with score {face.det_score:.4f}")
            
            # Use actual demographics from InsightFace
            age = int(getattr(face, 'age', 25) or 25)
            # InsightFace gender: 0 is female, 1 is male
            gender_val = getattr(face, 'gender', 1)
            gender = "Male" if gender_val == 1 else "Female"
            
            results.append({
                "bbox": bbox,
                "embedding": face.embedding.tolist() if face.embedding is not None else [],
                "age": age,
                "gender": gender,
                "det_score": float(face.det_score) if face.det_score is not None else 0.0
            })
            
        return results, {"det_rec_time": round(det_time, 4)}
