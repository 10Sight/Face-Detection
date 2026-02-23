import cv2
import numpy as np

class EmbedderEngine:
    def __init__(self, model_path: str = None):
        # In a real enterprise system, we would load an ArcFace or FaceNet model here
        # Example: self.model = cv2.dnn.readNet('model.onnx')
        self.model_path = model_path
        self.embedding_dim = 128 # or 512

    def extract(self, face_chip: np.ndarray):
        """
        Extracts a feature vector (embedding) from a cropped face image.
        """
        # Deterministic Mock: Hash the face chip to seed the RNG
        import hashlib
        import random
        
        # Create a stable hash of the image content
        chip_hash = hashlib.md5(face_chip.tobytes()).hexdigest()
        seed = int(chip_hash, 16) % (2**32)
        
        # Use a local RNG with the seed to ensure thread-safety and avoid side effects
        rng = random.Random(seed)
        mock_vector = [rng.uniform(-1, 1) for _ in range(self.embedding_dim)]
        
        return mock_vector
