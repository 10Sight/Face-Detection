import mediapipe as mp
import numpy as np
from collections import deque
from mediapipe.tasks import python
from mediapipe.tasks.python import vision
from mediapipe.tasks.python.vision import FaceLandmarker, FaceLandmarkerOptions, RunningMode

import os
import requests
from app.core.config import settings
from app.core.logging import logger as log

class MeshEngine:
    def __init__(self, model_path=None, history_size=4, max_faces=5):
        self.model_path = model_path or str(settings.EMOTION_MODEL)
        self._ensure_model()
        
        base_options = python.BaseOptions(model_asset_path=self.model_path)
        options = FaceLandmarkerOptions(
            base_options=base_options,
            running_mode=RunningMode.IMAGE,
            output_face_blendshapes=True,
            output_facial_transformation_matrixes=True,
            num_faces=max_faces
        )
        self.detector = FaceLandmarker.create_from_options(options)
        
        # Tracking & Smoothing
        self.history_size = history_size
        self.max_faces = max_faces
        self.face_tracks = {}  # {track_id: deque([face_lms_1, face_lms_2, ...])}
        self.next_track_id = 0
        self.max_dist_threshold = 0.15  # Max normalized distance for matching


    def _ensure_model(self):
        """Downloads the model if missing."""
        if not os.path.exists(self.model_path):
            os.makedirs(os.path.dirname(self.model_path), exist_ok=True)
            model_name = os.path.basename(self.model_path)
            url = settings.URLS.get(model_name)
            if url:
                log.info(f"MeshEngine: Downloading {model_name}...")
                r = requests.get(url, stream=True)
                with open(self.model_path, "wb") as f:
                    for chunk in r.iter_content(8192):
                        f.write(chunk)
                log.info(f"MeshEngine: Download complete.")
            else:
                log.error(f"MeshEngine: No download URL for {model_name}")


    def _get_centroid(self, landmarks):
        """Calculates normalized centroid of landmarks."""
        if not landmarks: return (0, 0)
        # Use a small subset of landmarks for speed (e.g., indices 1, 33, 263, 152)
        xs = [landmarks[i]['x'] for i in [1, 33, 263, 152] if i < len(landmarks)]
        ys = [landmarks[i]['y'] for i in [1, 33, 263, 152] if i < len(landmarks)]
        return (sum(xs) / len(xs), sum(ys) / len(ys))

    def _match_and_smooth(self, current_faces):
        """
        Matches current detections to existing tracks using proximity.
        Applies temporal smoothing per track.
        """
        current_data = []
        for face_lms in current_faces:
            centroid = self._get_centroid(face_lms)
            current_data.append({"lms": face_lms, "centroid": centroid, "matched": False})

        new_tracks = {}
        
        # 1. Try to match current detections to existing tracks
        for track_id, history in self.face_tracks.items():
            if not history: continue
            prev_centroid = self._get_centroid(history[-1])
            
            best_match_idx = -1
            min_dist = self.max_dist_threshold
            
            for i, det in enumerate(current_data):
                if det["matched"]: continue
                dist = np.sqrt((det["centroid"][0] - prev_centroid[0])**2 + 
                               (det["centroid"][1] - prev_centroid[1])**2)
                if dist < min_dist:
                    min_dist = dist
                    best_match_idx = i
            
            if best_match_idx != -1:
                current_data[best_match_idx]["matched"] = True
                history.append(current_data[best_match_idx]["lms"])
                new_tracks[track_id] = history
        
        # 2. Assign new tracks for unmatched detections
        for det in current_data:
            if not det["matched"]:
                d = deque(maxlen=self.history_size)
                d.append(det["lms"])
                new_tracks[self.next_track_id] = d
                self.next_track_id += 1
        
        # Only keep top max_faces tracks (cleanup old ones silently)
        self.face_tracks = new_tracks
        
        # 3. Return smoothed results
        smoothed_results = []
        for track_id, history in self.face_tracks.items():
            count = len(history)
            if count == 0: continue
            
            # Efficiently average landmarks
            avg_lms = []
            num_lms = len(history[0])
            for i in range(num_lms):
                avg_x = sum(h[i]['x'] for h in history) / count
                avg_y = sum(h[i]['y'] for h in history) / count
                avg_z = sum(h[i]['z'] for h in history) / count
                avg_lms.append({"x": avg_x, "y": avg_y, "z": avg_z})
            smoothed_results.append((track_id, avg_lms))
            
        return smoothed_results

    def analyze(self, image_rgb, frame_timestamp_ms=None):
        """
        Holistic analysis: Detection -> Proximity Tracking -> Smoothing -> Enriched Metrics.
        """
        if image_rgb is None:
            return []

        try:
            height, width = image_rgb.shape[:2]
            mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=image_rgb)
            # Detect faces statelessly
            detection_result = self.detector.detect(mp_image)
            
            if not detection_result or not detection_result.face_landmarks:
                self.face_tracks.clear()
                return []
            
            # 1. Extract raw landmarks
            current_faces = [[{"x": lm.x, "y": lm.y, "z": lm.z} for lm in face] 
                             for face in detection_result.face_landmarks]
            
            # 2. Proximity Matching & Smoothing
            smoothed_results = self._match_and_smooth(current_faces)
            
            mesh_data = []
            for track_idx, (track_id, face_lms) in enumerate(smoothed_results):
                # Enriched coordinates
                enriched_lms = [
                    {
                        "x": lm["x"], "y": lm["y"], "z": lm["z"],
                        "x_px": int(lm["x"] * width), "y_px": int(lm["y"] * height)
                    } for lm in face_lms
                ]
                
                # Blendshapes (Mapping for the current face index in the detection result)
                # Since MediaPipe returns these in sync with face_landmarks, and track_idx matches detection order
                blendshapes = {}
                if detection_result.face_blendshapes and track_idx < len(detection_result.face_blendshapes):
                    blendshapes = {b.category_name: b.score for b in detection_result.face_blendshapes[track_idx]}

                # Rotation (Head Pose)
                rotation = {"yaw": 0, "pitch": 0, "roll": 0}
                if detection_result.facial_transformation_matrixes and track_idx < len(detection_result.facial_transformation_matrixes):
                    rotation = self._extract_rotation(detection_result.facial_transformation_matrixes[track_idx])
                else:
                    rotation = self.get_face_rotation(enriched_lms)

                center_px, center_norm = self.get_face_center(enriched_lms, width, height)
                
                mesh_data.append({
                    "track_id": track_id,
                    "landmarks": enriched_lms,
                    "metrics": {
                        "center": center_px,
                        "center_norm": center_norm,
                        "eye_distance": self.get_eye_distance(enriched_lms),
                        "rotation": rotation
                    },
                    "blendshapes": blendshapes
                })
                
            return mesh_data
        except Exception:
            return []

    def _extract_rotation(self, matrix):
        """Extracts Yaw, Pitch, Roll from 4x4 matrix."""
        # Standard Euler extraction from rotation matrix
        r = matrix[:3, :3]
        sy = np.sqrt(r[0, 0] * r[0, 0] + r[1, 0] * r[1, 0])
        singular = sy < 1e-6
        if not singular:
            x = np.arctan2(r[2, 1], r[2, 2])
            y = np.arctan2(-r[2, 0], sy)
            z = np.arctan2(r[1, 0], r[0, 0])
        else:
            x = np.arctan2(-r[1, 2], r[1, 1])
            y = np.arctan2(-r[2, 0], sy)
            z = 0
        return {
            "pitch": float(np.degrees(x)),
            "yaw": float(np.degrees(y)),
            "roll": float(np.degrees(z))
        }

    # Standard Face Mesh Connections
    FACEMESH_CONNECTIONS = [
        (10, 338), (338, 297), (297, 332), (332, 284), (284, 251), (251, 389), (389, 356), (356, 454),
        (454, 323), (323, 361), (361, 288), (288, 397), (397, 365), (365, 379), (379, 378), (378, 400),
        (400, 377), (377, 152), (152, 148), (148, 176), (176, 149), (149, 150), (150, 136), (136, 172),
        (172, 58), (58, 132), (132, 93), (93, 234), (234, 127), (127, 162), (162, 21), (21, 54),
        (54, 103), (103, 67), (67, 109), (109, 10)
    ]

    def draw_mesh(self, image, mesh_data, draw_connections=True):
        """Enhanced visualization with connections, center, and iris markers."""
        if not mesh_data or image is None: return image
        import cv2
        h, w = image.shape[:2]
        for face in mesh_data:
            lms = face["landmarks"]
            # Connections
            if draw_connections:
                for s, e in self.FACEMESH_CONNECTIONS:
                    if s < len(lms) and e < len(lms):
                        p1 = (lms[s]["x_px"], lms[s]["y_px"])
                        p2 = (lms[e]["x_px"], lms[e]["y_px"])
                        cv2.line(image, p1, p2, (0, 200, 0), 1)
            # Landmarks (Selective drawing for performance)
            for i in range(0, 468, 5):
                lm = lms[i]
                cv2.circle(image, (lm["x_px"], lm["y_px"]), 1, (0, 255, 0), -1)
            # Iris markers (Indices 468-477)
            if len(lms) >= 478:
                for i in range(468, 478):
                    lm = lms[i]
                    cv2.circle(image, (lm["x_px"], lm["y_px"]), 2, (0, 0, 255), -1)
            # Center
            center = face["metrics"]["center"]
            cv2.drawMarker(image, center, (255, 0, 0), cv2.MARKER_CROSS, 10, 2)
        return image

    def get_face_center(self, lms, w, h):
        if not lms: return (0, 0), (0, 0)
        avg_x = sum(l['x'] for l in lms) / len(lms)
        avg_y = sum(l['y'] for l in lms) / len(lms)
        return (int(avg_x * w), int(avg_y * h)), (float(avg_x), float(avg_y))

    def get_eye_distance(self, lms):
        if len(lms) < 474: return 0
        p1, p2 = lms[468], lms[473] # Irises
        return float(np.sqrt((p2['x']-p1['x'])**2 + (p2['y']-p1['y'])**2))

    def get_face_rotation(self, lms):
        """Refined Head Pose via geometric keypoints."""
        if len(lms) < 468: return {"yaw": 0, "pitch": 0, "roll": 0}
        nose = lms[1]; le = lms[33]; re = lms[263]; chin = lms[152]
        yaw = (nose['x'] - (le['x'] + re['re']) / 2) * 100 if 're' in re else 0 # Fixed typo check
        # Corrected:
        yaw = (nose['x'] - (le['x'] + re['x']) / 2) * 100
        pitch = (nose['y'] - (le['y'] + re['y']) / 2) * 100
        roll = (le['y'] - re['y']) * 100
        return {"yaw": float(yaw), "pitch": float(pitch), "roll": float(roll)}
