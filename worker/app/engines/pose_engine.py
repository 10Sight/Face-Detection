import mediapipe as mp
import numpy as np
from mediapipe.tasks import python
from mediapipe.tasks.python import vision
from mediapipe.tasks.python.vision import PoseLandmarker, PoseLandmarkerOptions, RunningMode

from collections import deque

import os
import requests
from app.core.config import settings
from app.core.logging import logger as log

class PoseEngine:
    def __init__(self, model_path=None):
        self.model_path = model_path or str(settings.POSE_MODEL)
        self._ensure_model()
        
        base_options = python.BaseOptions(model_asset_path=self.model_path)
        options = PoseLandmarkerOptions(
            base_options=base_options,
            running_mode=RunningMode.VIDEO,
            min_pose_detection_confidence=0.5,
            min_pose_presence_confidence=0.5,
            min_tracking_confidence=0.5
        )
        self.detector = PoseLandmarker.create_from_options(options)
        
        # State Management
        self.track_states = {} # track_id -> {landmark_history, behavior, etc}
        self._last_ts = -1
        
        # Behavior Constants
        self.RUNNING_THRESHOLD = 600    # PPS
        self.STATIONARY_THRESHOLD = 100 # PPS
        self.MAX_VALID_VELOCITY = 2000  # PPS
        self.STATIONARY_WINDOW_S = 2.0
        self.FALL_STREAK_THRESHOLD = 3
        self.RUNNING_STREAK_THRESHOLD = 5
        self.MAX_MISSING_FRAMES = 30

    def _ensure_model(self):
        """Downloads the model if missing."""
        if not os.path.exists(self.model_path):
            os.makedirs(os.path.dirname(self.model_path), exist_ok=True)
            model_name = os.path.basename(self.model_path)
            url = settings.URLS.get(model_name)
            if url:
                log.info(f"PoseEngine: Downloading {model_name}...")
                r = requests.get(url, stream=True)
                with open(self.model_path, "wb") as f:
                    for chunk in r.iter_content(8192):
                        f.write(chunk)
                log.info(f"PoseEngine: Download complete.")
            else:
                log.error(f"PoseEngine: No download URL for {model_name}")

    def _get_track_state(self, track_id):
        """Initializes or returns state for a track_id."""
        if track_id not in self.track_states:
            self.track_states[track_id] = {
                "landmark_history": deque(maxlen=4),
                "previous_center": None,
                "stat_start_ts": None,
                "fall_streak": 0,
                "run_streak": 0,
                "missing_frames": 0,
                "last_ts": -1
            }
        self.track_states[track_id]["missing_frames"] = 0
        return self.track_states[track_id]

    def _purge_old_tracks(self):
        """Removes tracks that haven't been seen for a while."""
        to_delete = [tid for tid, state in self.track_states.items() if state["missing_frames"] > self.MAX_MISSING_FRAMES]
        for tid in to_delete:
            del self.track_states[tid]

    def _smooth_landmarks(self, track_id, current_landmarks):
        """Averages landmarks over history for a specific track."""
        state = self._get_track_state(track_id)
        history = state["landmark_history"]
        history.append(current_landmarks)
        
        count = len(history)
        if count < 2: return current_landmarks
            
        smoothed = []
        num_lms = len(current_landmarks)
        for i in range(num_lms):
            smoothed.append({
                "x": sum(h[i]['x'] for h in history) / count,
                "y": sum(h[i]['y'] for h in history) / count,
                "z": sum(h[i]['z'] for h in history) / count,
                "visibility": sum(h[i]['visibility'] for h in history) / count
            })
        return smoothed

    def is_landmark_visible(self, landmark, threshold=0.4):
        return landmark.get('visibility', 0) > threshold

    def analyze(self, image_rgb, frame_timestamp_ms, track_id="0"):
        """
        Detects behavior for a specific track_id.
        """
        if image_rgb is None: return []
        
        try:
            height, width = image_rgb.shape[:2]
            mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=image_rgb)
            
            # Timestamp safety for MediaPipe Video mode
            if frame_timestamp_ms <= self._last_ts:
                frame_timestamp_ms = self._last_ts + 1
            self._last_ts = frame_timestamp_ms

            detection_result = self.detector.detect_for_video(mp_image, frame_timestamp_ms)
            
            # Increment missing frames for all tracks, will be reset for seen ones
            for state in self.track_states.values():
                state["missing_frames"] += 1

            if not detection_result or not detection_result.pose_landmarks:
                self._purge_old_tracks()
                return []
            
            poses_data = []
            # Note: Lite model usually finds one person. For Phase 1, we match it to the provided track_id.
            for i, raw_landmarks in enumerate(detection_result.pose_landmarks):
                # Simple multi-person fallback: if more than one pose found, suffix the ID
                tid = track_id if i == 0 else f"{track_id}_{i}"
                state = self._get_track_state(tid)
                
                # 1. Convert & Smooth
                current_lms = [{"x": float(lm.x), "y": float(lm.y), "z": float(lm.z), "visibility": float(lm.visibility)} for lm in raw_landmarks]
                smoothed_lms = self._smooth_landmarks(tid, current_lms)
                
                # 2. Add pixel coords
                enriched_lms = []
                for lm in smoothed_lms:
                    lm["x_px"], lm["y_px"] = int(lm["x"] * width), int(lm["y"] * height)
                    enriched_lms.append(lm)
                
                # 3. Calculate Velocity (PPS with Stability)
                curr_center, center_norm = self.get_body_center(enriched_lms, width, height)
                delta_t = max(0.001, (frame_timestamp_ms - state["last_ts"]) / 1000.0) if state["last_ts"] > 0 else 0.033
                
                raw_vel = self.get_body_velocity(state["previous_center"], curr_center)
                pps_velocity = min(self.MAX_VALID_VELOCITY, raw_vel / delta_t) if state["previous_center"] else 0.0
                
                # 4. Behavior Logic (Prioritized Exclusivity)
                behavior = {"running": False, "fall": False, "stationary": False}
                confidence = 0.0
                
                # Priority 1: Fall
                can_detect_fall = (len(enriched_lms) > 25 and 
                                   self.is_landmark_visible(enriched_lms[11]) and 
                                   self.is_landmark_visible(enriched_lms[23]) and 
                                   self.is_landmark_visible(enriched_lms[25]))
                
                if can_detect_fall:
                    angle = self.get_body_angle(11, 23, 25, enriched_lms)
                    if angle < 60 and pps_velocity < 150:
                        state["fall_streak"] += 1
                    else:
                        state["fall_streak"] = 0
                else:
                    state["fall_streak"] = 0
                
                # Priority 2: Running
                if pps_velocity > self.RUNNING_THRESHOLD:
                    state["run_streak"] += 1
                else:
                    state["run_streak"] = 0
                    
                # Priority 3: Stationary
                if pps_velocity < self.STATIONARY_THRESHOLD:
                    if state["stat_start_ts"] is None: 
                        state["stat_start_ts"] = frame_timestamp_ms
                else:
                    state["stat_start_ts"] = None

                # Determine Exclusive Behavior
                if state["fall_streak"] >= self.FALL_STREAK_THRESHOLD:
                    behavior["fall"] = True
                    confidence = min(1.0, state["fall_streak"] / self.FALL_STREAK_THRESHOLD)
                    state["run_streak"] = 0
                    state["stat_start_ts"] = None
                elif state["run_streak"] >= self.RUNNING_STREAK_THRESHOLD:
                    behavior["running"] = True
                    confidence = min(1.0, state["run_streak"] / self.RUNNING_STREAK_THRESHOLD)
                    state["stat_start_ts"] = None
                elif state["stat_start_ts"] is not None:
                    duration = (frame_timestamp_ms - state["stat_start_ts"]) / 1000.0
                    if duration >= self.STATIONARY_WINDOW_S:
                        behavior["stationary"] = True
                        confidence = min(1.0, duration / self.STATIONARY_WINDOW_S)
                
                # Update State
                direction = self.detect_body_direction(state["previous_center"], curr_center)
                state["previous_center"] = curr_center
                state["last_ts"] = frame_timestamp_ms
                
                poses_data.append({
                    "track_id": tid,
                    "landmarks": enriched_lms,
                    "metrics": {
                        "center": curr_center,
                        "center_norm": center_norm,
                        "velocity": pps_velocity,
                        "direction": direction,
                        "behaviorConfidence": float(confidence),
                        "shoulder_width": self.get_shoulder_distance(enriched_lms),
                        **behavior
                    }
                })
            
            self._purge_old_tracks()
            return poses_data
        except Exception as e:
            log.error(f"PoseEngine Analysis Error: {e}")
            return []

    def draw_landmarks(self, image, poses_data, visibility_threshold=0.4):
        if not poses_data or image is None: return image
        import cv2
        height, width = image.shape[:2]
        connections = [(11, 12), (11, 13), (13, 15), (12, 14), (14, 16), (11, 23), (12, 24), (23, 24), (23, 25), (25, 27), (24, 26), (26, 28)]

        for pose in poses_data:
            lms = pose["landmarks"]
            color = (0, 0, 255) if pose["metrics"].get("fall") else (0, 255, 0)
            
            for i, j in connections:
                if i < len(lms) and j < len(lms):
                    p1, p2 = lms[i], lms[j]
                    if self.is_landmark_visible(p1, visibility_threshold) and self.is_landmark_visible(p2, visibility_threshold):
                        cv2.line(image, (p1["x_px"], p1["y_px"]), (p2["x_px"], p2["y_px"]), color, 2)

            # Draw Label
            metrics = pose["metrics"]
            label = "NORMAL"
            if metrics["fall"]: label = "FALL"
            elif metrics["running"]: label = "RUNNING"
            elif metrics["stationary"]: label = "STATIONARY"
            
            center = metrics["center"]
            if center:
                cv2.putText(image, f"{label} ({metrics['behaviorConfidence']:.2f})", (center[0]-30, center[1]-20), cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2)
                cv2.drawMarker(image, center, color, cv2.MARKER_CROSS, 10, 1)

        return image

    def get_body_angle(self, a_idx, b_idx, c_idx, landmarks):
        if not landmarks or max(a_idx, b_idx, c_idx) >= len(landmarks): return 0
        p1, p2, p3 = landmarks[a_idx], landmarks[b_idx], landmarks[c_idx]
        if not (self.is_landmark_visible(p1) and self.is_landmark_visible(p2) and self.is_landmark_visible(p3)): return 0
        a, b, c = np.array([p1['x'], p1['y']]), np.array([p2['x'], p2['y']]), np.array([p3['x'], p3['y']])
        radians = np.arctan2(c[1]-b[1], c[0]-b[0]) - np.arctan2(a[1]-b[1], a[0]-b[0])
        angle = np.abs(radians * 180.0 / np.pi)
        return 360 - angle if angle > 180.0 else angle

    def get_shoulder_distance(self, landmarks):
        if len(landmarks) < 13: return 0
        l_sh, r_sh = landmarks[11], landmarks[12]
        if not (self.is_landmark_visible(l_sh) and self.is_landmark_visible(r_sh)): return 0
        return np.sqrt((l_sh['x_px'] - r_sh['x_px'])**2 + (l_sh['y_px'] - r_sh['y_px'])**2)

    def get_body_center(self, landmarks, width, height):
        if len(landmarks) < 25: return None, None
        idx = [11, 12, 23, 24]
        visible_lms = [landmarks[i] for i in idx if self.is_landmark_visible(landmarks[i])]
        if len(visible_lms) < 2: return None, None
        avg_x = sum(lm['x_px'] for lm in visible_lms) / len(visible_lms)
        avg_y = sum(lm['y_px'] for lm in visible_lms) / len(visible_lms)
        return (int(avg_x), int(avg_y)), (float(avg_x/width), float(avg_y/height))

    def get_body_velocity(self, prev_center, curr_center):
        if prev_center is None or curr_center is None: return 0.0
        return float(np.sqrt((curr_center[0] - prev_center[0])**2 + (curr_center[1] - prev_center[1])**2))

    def detect_body_direction(self, prev_center, curr_center, threshold=10):
        if prev_center is None or curr_center is None: return "Still"
        dx, dy = curr_center[0] - prev_center[0], curr_center[1] - prev_center[1]
        if abs(dx) < threshold and abs(dy) < threshold: return "Still"
        return ("Right" if dx > 0 else "Left") if abs(dx) > abs(dy) else ("Down" if dy > 0 else "Up")
