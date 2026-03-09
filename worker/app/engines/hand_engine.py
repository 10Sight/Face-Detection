import mediapipe as mp
import numpy as np
import cv2
import time
from mediapipe.tasks import python
from mediapipe.tasks.python.vision import HandLandmarker, HandLandmarkerOptions, RunningMode
from app.core.logging import logger as log


class HandEngine:
    """
    High-performance hand tracking + gesture recognition engine.
    Optimized for real-time perception pipelines.
    """

import os
import requests
from app.core.config import settings
from app.core.logging import logger as log

class HandEngine:
    def __init__(
        self,
        model_path=None,
        detection_interval=1,
        target_height=256,
        history_size=5,
        debug=False
    ):
        self.model_path = model_path or str(settings.HAND_MODEL)
        self._ensure_model()
        
        base_options = python.BaseOptions(model_asset_path=self.model_path)


        options = HandLandmarkerOptions(
            base_options=base_options,
            running_mode=RunningMode.VIDEO,
            num_hands=2,
            min_hand_detection_confidence=0.6,
            min_hand_presence_confidence=0.6,
            min_tracking_confidence=0.6
        )

        self.detector = HandLandmarker.create_from_options(options)

        # performance config
        self.detection_interval = detection_interval
        self.target_height = target_height
        self.debug = debug

        # frame counter
        self.frame_count = 0

        # gesture smoothing
        self.history_size = history_size
        self.gesture_history = {}

        # cache results
        self.last_result = []
        self._last_ts = -1

    def _ensure_model(self):
        """Downloads the model if missing."""
        if not os.path.exists(self.model_path):
            os.makedirs(os.path.dirname(self.model_path), exist_ok=True)
            model_name = os.path.basename(self.model_path)
            url = settings.URLS.get(model_name)
            if url:
                log.info(f"HandEngine: Downloading {model_name}...")
                r = requests.get(url, stream=True)
                with open(self.model_path, "wb") as f:
                    for chunk in r.iter_content(8192):
                        f.write(chunk)
                log.info(f"HandEngine: Download complete.")
            else:
                log.error(f"HandEngine: No download URL for {model_name}")

        # timing stats
        self.last_process_time = 0


    # -----------------------------------------------------

    def analyze(self, image_rgb, frame_timestamp_ms):

        start_time = time.time()

        if image_rgb is None:
            return []

        self.frame_count += 1

        height, width, _ = image_rgb.shape

        # -----------------------------------------------------
        # RESIZE FOR PERFORMANCE
        # -----------------------------------------------------

        if height > self.target_height:
            scale = self.target_height / height
            target_w = int(width * scale)

            proc_img = cv2.resize(
                image_rgb,
                (target_w, self.target_height),
                interpolation=cv2.INTER_LINEAR
            )
        else:
            proc_img = image_rgb

        # -----------------------------------------------------
        # MEDIAPIPE INPUT
        # -----------------------------------------------------

        mp_image = mp.Image(
            image_format=mp.ImageFormat.SRGB,
            data=proc_img
        )

        # Ensure strictly increasing timestamp for VIDEO mode
        if frame_timestamp_ms <= self._last_ts:
            frame_timestamp_ms = self._last_ts + 1
        self._last_ts = frame_timestamp_ms

        detection_result = self.detector.detect_for_video(
            mp_image,
            frame_timestamp_ms
        )

        if not detection_result.hand_landmarks:
            self.last_result = []
            return []

        hands_data = []

        # -----------------------------------------------------
        # PROCESS HANDS
        # -----------------------------------------------------

        for idx, landmarks in enumerate(detection_result.hand_landmarks):

            handedness = detection_result.handedness[idx][0].category_name

            pixel_landmarks = []

            for lm in landmarks:
                pixel_landmarks.append({
                    "x": int(lm.x * width),
                    "y": int(lm.y * height),
                    "z": float(lm.z),
                    "x_norm": float(lm.x),
                    "y_norm": float(lm.y)
                })

            # -----------------------------------------------------
            # GESTURE CLASSIFICATION
            # -----------------------------------------------------

            raw_gesture = self._classify_gesture(landmarks)

            # -----------------------------------------------------
            # TEMPORAL SMOOTHING
            # -----------------------------------------------------

            if handedness not in self.gesture_history:
                self.gesture_history[handedness] = []

            history = self.gesture_history[handedness]
            history.append(raw_gesture)

            if len(history) > self.history_size:
                history.pop(0)

            smoothed_gesture = max(set(history), key=history.count)
            confidence = history.count(smoothed_gesture) / len(history)

            hands_data.append({
                "hand": handedness,
                "landmarks": pixel_landmarks,
                "gesture": smoothed_gesture,
                "gesture_confidence": round(confidence, 2)
            })

        self.last_result = hands_data

        if self.debug:
            self.last_process_time = round((time.time() - start_time) * 1000, 2)
            log.debug(f"[HandEngine] {self.last_process_time} ms")

        return hands_data

    # -----------------------------------------------------
    # GESTURE RECOGNITION
    # -----------------------------------------------------

    def _classify_gesture(self, landmarks):

        def dist_sq(p1, p2):
            return (p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2

        palm_size = np.sqrt(dist_sq(landmarks[0], landmarks[9])) + 1e-6

        def finger_extended(tip, pip, mcp):
            return dist_sq(landmarks[tip], landmarks[mcp]) > dist_sq(
                landmarks[pip], landmarks[mcp]
            )

        index_ext = finger_extended(8, 6, 5)
        middle_ext = finger_extended(12, 10, 9)
        ring_ext = finger_extended(16, 14, 13)
        pinky_ext = finger_extended(20, 18, 17)

        thumb_ext = dist_sq(landmarks[4], landmarks[2]) > dist_sq(
            landmarks[3], landmarks[2]
        )

        pinch_dist = np.sqrt(dist_sq(landmarks[4], landmarks[8]))

        if pinch_dist < palm_size * 0.25:
            return "PINCH"

        ext_count = sum([index_ext, middle_ext, ring_ext, pinky_ext])

        if ext_count == 4 and thumb_ext:
            return "OPEN_PALM"

        if ext_count == 0 and not thumb_ext:
            return "FIST"

        if index_ext and middle_ext and ext_count == 2:
            return "V_SIGN"

        if index_ext and ext_count == 1:
            return "POINTING"

        if thumb_ext and ext_count == 0:
            return "THUMBS_UP"

        return "UNKNOWN"

    # -----------------------------------------------------
    # DRAW LANDMARKS
    # -----------------------------------------------------

    def draw_landmarks(self, image, hands_data):

        connections = [
            (0, 1), (1, 2), (2, 3), (3, 4),
            (0, 5), (5, 6), (6, 7), (7, 8),
            (0, 9), (9, 10), (10, 11), (11, 12),
            (0, 13), (13, 14), (14, 15), (15, 16),
            (0, 17), (17, 18), (18, 19), (19, 20),
            (5, 9), (9, 13), (13, 17)
        ]

        for hand in hands_data:

            lms = hand["landmarks"]
            gesture = hand["gesture"]
            conf = hand.get("gesture_confidence", 1.0)

            # draw bones
            for c in connections:
                p1 = lms[c[0]]
                p2 = lms[c[1]]

                cv2.line(
                    image,
                    (p1["x"], p1["y"]),
                    (p2["x"], p2["y"]),
                    (255, 120, 0),
                    2
                )

            # draw joints
            for lm in lms:
                cv2.circle(
                    image,
                    (lm["x"], lm["y"]),
                    3,
                    (0, 0, 255),
                    -1
                )

            # draw label
            label = f"{gesture} ({conf})"
            pos = (lms[8]["x"], lms[8]["y"] - 15)

            cv2.putText(
                image,
                label,
                pos,
                cv2.FONT_HERSHEY_SIMPLEX,
                0.5,
                (255, 255, 255),
                1,
                cv2.LINE_AA
            )

        return image