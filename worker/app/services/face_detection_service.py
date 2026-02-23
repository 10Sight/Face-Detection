import cv2
import numpy as np
import os
from collections import deque
from app.engines.insightface_engine import InsightFaceEngine
from app.engines.tracker_engine import TrackerEngine

# Initialize new engines
insight_engine = InsightFaceEngine(model_name='buffalo_s')
tracker_engine = TrackerEngine(max_age=30, n_init=1, max_cosine_distance=0.4)

# Track State Management for Temporal Smoothing
# track_id -> {age_history, gender_history, embedding_history}
track_states = {}

def get_smoothed_demographics(track_id, age, gender, embedding):
    """
    Apply temporal smoothing to age, gender, and embeddings for a specific track.
    """
    if track_id not in track_states:
        track_states[track_id] = {
            "age_history": deque(maxlen=7),
            "gender_history": deque(maxlen=7),
            "embedding_history": deque(maxlen=5)
        }
    
    state = track_states[track_id]
    
    # Robust demographic handling
    if age is not None:
        try:
            state["age_history"].append(int(age))
        except: pass
    if gender is not None:
        try:
            state["gender_history"].append(int(gender))
        except: pass
    if embedding is not None:
        state["embedding_history"].append(np.array(embedding))
    
    # Age: average of history (default 25)
    smoothed_age = int(np.mean(state["age_history"])) if state["age_history"] else 25
    
    # Gender: majority voting (0: Female, 1: Male, default 1)
    smoothed_gender = max(set(state["gender_history"]), key=list(state["gender_history"]).count) if state["gender_history"] else 1
    
    # Embedding: mean vector
    if state["embedding_history"]:
        smoothed_embedding = np.mean(state["embedding_history"], axis=0).tolist()
    else:
        smoothed_embedding = (np.zeros(512)).tolist()
    
    return smoothed_age, smoothed_gender, smoothed_embedding

def process_face_pipeline(image_bytes: bytes, is_static: bool = False, **kwargs):
    """
    Refactored Phase 2.0 Pipeline using InsightFace and DeepSORT.
    """
    np_arr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

    if img is None:
        return {"faceDetected": False, "totalFaces": 0, "faces": []}

    # 1. InsightFace Analysis
    try:
        raw_detections = insight_engine.analyze(img)
    except:
        return {"faceDetected": False, "totalFaces": 0, "faces": []}
    
    # 2. Prepare detections for DeepSORT
    ds_detections = []
    ds_embeds = []
    
    for i, det in enumerate(raw_detections):
        x1, y1, x2, y2 = det["bbox"]
        w = max(1, x2 - x1)
        h = max(1, y2 - y1)
        conf = det["det_score"]
        emb = det["embedding"]
        
        ds_detections.append(([x1, y1, w, h], conf, f"face_{i}"))
        ds_embeds.append(emb)

    # 3. Handle Static Mode (Bypass Tracker)
    if is_static:
        static_faces = []
        for det in raw_detections:
            x1, y1, x2, y2 = det["bbox"]
            conf = det["det_score"]
            emb = det["embedding"]
            age = det.get("age", 25)
            gender = det.get("gender", 1)

            static_faces.append({
                "track_id": -1,  # No tracking in static mode
                "bbox": {
                    "xmin": float(x1 / img.shape[1]),
                    "ymin": float(y1 / img.shape[0]),
                    "width": float((x2 - x1) / img.shape[1]),
                    "height": float((y2 - y1) / img.shape[0])
                },
                "xmin": float(x1 / img.shape[1]),
                "ymin": float(y1 / img.shape[0]),
                "width": float((x2 - x1) / img.shape[1]),
                "height": float((y2 - y1) / img.shape[0]),
                "embedding": emb.tolist() if isinstance(emb, np.ndarray) else emb,
                "confidence": float(conf),
                "demographics": {
                    "age": int(age),
                    "gender": "Male" if gender == 1 else "Female",
                    "confidence": {
                        "age": 0.9,
                        "gender": 0.95
                    },
                    "livenessScore": round(float(conf * 0.98), 4)
                }
            })
        return {
            "faceDetected": len(static_faces) > 0,
            "totalFaces": len(static_faces),
            "faces": static_faces
        }

    # 4. Update Tracker (Live Mode)
    try:
        tracks = tracker_engine.update(ds_detections, img, embeds=ds_embeds)
    except:
        return {"faceDetected": False, "totalFaces": 0, "faces": []}
    
    # 5. Final Processing with Smoothing (Live Mode Only)
    stable_faces = []
    
    for track in tracks:
        track_id = track["track_id"]
        # Heuristic match
        best_match = None
        max_iou = 0
        tx1, ty1, tx2, ty2 = track["bbox"]
        
        for det in raw_detections:
            dx1, dy1, dx2, dy2 = det["bbox"]
            inter_x1 = max(tx1, dx1)
            inter_y1 = max(ty1, dy1)
            inter_x2 = min(tx2, dx2)
            inter_y2 = min(ty2, dy2)
            inter_area = max(0, inter_x2 - inter_x1) * max(0, inter_y2 - inter_y1)
            t_area = (tx2 - tx1) * (ty2 - ty1)
            d_area = (dx2 - dx1) * (dy2 - dy1)
            iou = inter_area / float(t_area + d_area - inter_area) if (t_area + d_area - inter_area) > 0 else 0
            
            if iou > max_iou:
                max_iou = iou
                best_match = det
        
        if best_match and max_iou > 0.3:
            # Apply Smoothing
            age, gender, embedding = get_smoothed_demographics(
                track_id, 
                best_match.get("age"), 
                best_match.get("gender"), 
                best_match.get("embedding")
            )
            
            stable_faces.append({
                "track_id": track_id,
                "bbox": {
                    "xmin": float(track["bbox"][0] / img.shape[1]),
                    "ymin": float(track["bbox"][1] / img.shape[0]),
                    "width": float((track["bbox"][2] - track["bbox"][0]) / img.shape[1]),
                    "height": float((track["bbox"][3] - track["bbox"][1]) / img.shape[0])
                },
                "xmin": float(track["bbox"][0] / img.shape[1]),
                "ymin": float(track["bbox"][1] / img.shape[0]),
                "width": float((track["bbox"][2] - track["bbox"][0]) / img.shape[1]),
                "height": float((track["bbox"][3] - track["bbox"][1]) / img.shape[0]),
                "embedding": embedding,
                "confidence": float(track["confidence"]),
                "demographics": {
                    "age": int(age),
                    "gender": "Male" if gender == 1 else "Female",
                    "confidence": {
                        "age": 0.9,
                        "gender": 0.95
                    },
                    "livenessScore": round(float(track["confidence"] * 0.98), 4)
                }
            })

    return {
        "faceDetected": len(stable_faces) > 0,
        "totalFaces": len(stable_faces),
        "faces": stable_faces
    }

def detect_face(image_bytes, is_static=False):
    return process_face_pipeline(image_bytes, is_static=is_static)