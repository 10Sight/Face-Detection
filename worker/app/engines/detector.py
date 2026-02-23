import cv2
import numpy as np
import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision

class DetectorEngine:

    def __init__(self, model_path: str = 'detector_full.tflite'):

        self.base_options = python.BaseOptions(model_asset_path=model_path)

        self.options = vision.FaceDetectorOptions(
            base_options=self.base_options,
            running_mode=vision.RunningMode.IMAGE,
            min_detection_confidence=0.6,
            min_suppression_threshold=0.3
        )

        self.detector = vision.FaceDetector.create_from_options(self.options)

    def detect(self, img_bgr: np.ndarray):

        scale_factor = 1.5
        img_resized = cv2.resize(img_bgr, None, fx=scale_factor, fy=scale_factor)

        rgb = cv2.cvtColor(img_resized, cv2.COLOR_BGR2RGB)
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)

        detection_result = self.detector.detect(mp_image)
        faces = []

        if detection_result.detections:
            for detection in detection_result.detections:
                bbox = detection.bounding_box

                # Ignore very small detections
                if bbox.width < 40 or bbox.height < 40:
                    continue

                faces.append({
                    "xmin": bbox.origin_x / img_resized.shape[1],
                    "ymin": bbox.origin_y / img_resized.shape[0],
                    "width": bbox.width / img_resized.shape[1],
                    "height": bbox.height / img_resized.shape[0],
                    "confidence": float(detection.categories[0].score)
                })

        return faces