import cv2
import numpy as np
import os
import time
import threading
from collections import deque
from concurrent.futures import ThreadPoolExecutor
from app.engines.face_engine import InsightFaceEngine
from app.tracking.tracker import TrackerEngine
from app.engines.demographics import DemographicsEngine
from app.engines.emotion import EmotionEngine
from app.engines.pose_engine import PoseEngine
from app.engines.hand_engine import HandEngine
from app.engines.mesh_engine import MeshEngine
from app.engines.yolo_object_engine import YOLOObjectEngine
from app.engines.reid_engine import ReIDEngine
from app.core.config import settings
from app.core.logging import logger as log

# Global Scheduler State (Optimized Architecture)
frame_count = 0
# Thread Management (Phase 15: Global Concurrency Control)
# Limit heavy model concurrency to 2 to prevent CPU thrashing
global_engine_semaphore = threading.Semaphore(2)
# Increased workers to prevent nested deadlock starvation
executor = ThreadPoolExecutor(max_workers=20) 

# Master list of emotions for consistent smoothing
EMOTION_LABELS = ["Neutral", "Happy", "Sad", "Anger", "Surprise", "Fear", "Disgust"]
DEFAULT_EMO_SCORES = {e: (1.0 if e == "Neutral" else 0.0) for e in EMOTION_LABELS}

# Global performance tracking
last_total_time = 0
downsample_mode = False # Original was False, instruction snippet had 1.0. Sticking to original type.
last_timestamp_ms = 0
last_run_times = {
    "face": 0,
    "pose": 0,
    "hand": 0,
    "object": 0,
    "mesh": 0
}

# Locks for thread-safe MediaPipe operations (Prevent 10s hangs)
pose_lock = threading.Lock()
hand_lock = threading.Lock()
object_lock = threading.Lock()
mesh_lock = threading.Lock()
face_lock = threading.Lock() # Lock for InsightFace instance
reid_lock = threading.Lock() # Lock for ReID instance
track_lock = threading.Lock() # Lock for track_states access

# Initialize engines
insight_engine = InsightFaceEngine(model_name='buffalo_s')
face_tracker_engine = TrackerEngine(max_age=120, n_init=1, max_cosine_distance=0.8)
demographics_engine = DemographicsEngine()
emotion_engine = EmotionEngine()
pose_engine = PoseEngine()
hand_engine = HandEngine()
mesh_engine = MeshEngine()
object_engine = YOLOObjectEngine()
reid_engine = ReIDEngine()
object_tracker_engine = TrackerEngine(max_age=60, n_init=2, max_cosine_distance=0.8, min_confidence=0.35)

# Result Caching for non-tracker engines to bridge frequency skips
last_results_cache = {
    "pose": [],
    "hands": [],
    "mesh": [],
    "objects": []
}

log.info("FaceDetectionService re-initialized with Real-Time Parallel Pipeline (Phases 1-7).")

# Track State Management for Temporal Smoothing
# track_id -> {age_history, gender_history, embedding_history, emotion_history}
track_states = {}

def get_smoothed_data(track_id, age, gender, embedding, emotion_score):
    """
    Apply temporal smoothing to age, gender, embeddings, and emotions for a specific track.
    Thread-safe access to track_states.
    """
    with track_lock:
        if track_id not in track_states:
            track_states[track_id] = {
                "age_history": deque(maxlen=20),
                "gender_history": deque(maxlen=20),
                "embedding_history": deque(maxlen=5),
                "emotion_history": deque(maxlen=10),
                "demo_locked": False
            }
        
        state = track_states[track_id]
        
        if age is not None:
            try: state["age_history"].append(int(age))
            except: pass
        if gender is not None:
            try: state["gender_history"].append(int(gender))
            except: pass
        if embedding is not None:
            state["embedding_history"].append(np.array(embedding))
        if emotion_score is not None:
            state["emotion_history"].append(emotion_score)
        
        # Age: average of history (default 25)
        smoothed_age = int(np.mean(state["age_history"])) if state["age_history"] else 25
        
        # Gender: majority voting (0: Female, 1: Male, default 1)
        gender_list = list(state["gender_history"])
        smoothed_gender = max(set(gender_list), key=gender_list.count) if gender_list else 1
        
        # Embedding: mean vector
        if state["embedding_history"]:
            smoothed_embedding = np.mean(state["embedding_history"], axis=0).tolist()
        else:
            smoothed_embedding = (np.zeros(512)).tolist()

        # Emotion: average scores across history
        if state["emotion_history"]:
            smoothed_emotions = {}
            for emotion in EMOTION_LABELS:
                # Robustly handle missing keys by defaulting to 0.0
                scores = [h.get(emotion, 0.0) for h in state["emotion_history"]]
                smoothed_emotions[emotion] = round(float(np.mean(scores)), 4)
            dominant_emotion = max(smoothed_emotions, key=smoothed_emotions.get)
        else:
            smoothed_emotions = {"Neutral": 1.0}
            dominant_emotion = "Neutral"
        
        return smoothed_age, smoothed_gender, smoothed_embedding, smoothed_emotions, dominant_emotion

def run_engine_safe(lock, engine_fn, *args):
    """Thread-safe engine execution with lock and profiling."""
    t_start = time.time()
    try:
        with lock:
            wait_time = time.time() - t_start
            exec_start = time.time()
            res = engine_fn(*args)
            exec_time = time.time() - exec_start
            return res, wait_time, exec_time
    except Exception as e:
        log.error(f"Engine execution error: {e}")
        return [], 0, 0

def process_face_pipeline(image_bytes: bytes, is_static: bool = False, **kwargs):
    global frame_count, last_total_time, downsample_mode, last_timestamp_ms
    frame_count += 1
    
    perf = {}
    start_time = time.time()
    
    # 0. Dynamic Downsampling Logic
    if last_total_time > 0.15:
        downsample_mode = True
    elif last_total_time < 0.10:
        downsample_mode = False

    np_arr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

    if img is None:
        log.error(f"process_face_pipeline: FAILED to decode image. Size: {len(image_bytes)} bytes")
        return {"faceDetected": False, "totalFaces": 0, "faces": []}
    
    log.info(f"process_face_pipeline: Received image ({len(image_bytes)} bytes). Dims: {img.shape}")

    orig_h, orig_w = img.shape[:2]
    
    if downsample_mode and not is_static:
        target_w = 640
        if orig_w > target_w:
            scale = target_w / orig_w
            img = cv2.resize(img, (target_w, int(orig_h * scale)), interpolation=cv2.INTER_AREA)
            perf["downsampled"] = True

    curr_h, curr_w = img.shape[:2]

    # 1. Frequency Scheduler (Phase 12 + Phase 14 Adaptive Throttling)
    # If more than 150ms has passed, we ALWAYS run face detection to ensure polling stability.
    now = time.time()
    
    current_ts = int(time.time() * 1000)
    if current_ts <= last_timestamp_ms:
        current_ts = last_timestamp_ms + 1
    last_timestamp_ms = current_ts
    
    ts = int(kwargs.get("timestamp_ms") or current_ts)
    detection_modes = kwargs.get("modes", ["face"])
    # Normalize modes (if single string from form data)
    if isinstance(detection_modes, str):
        detection_modes = [detection_modes]
    elif len(detection_modes) == 1 and ',' in detection_modes[0]:
        detection_modes = detection_modes[0].split(',')
    
    # Adaptive Load Balancing (Phase 14 + Phase 15 Global Load Shedding)
    if last_total_time > 0.300:
        load_factor = 5
    elif last_total_time > 0.150:
        load_factor = 2
    else:
        load_factor = 1
    
    # Base Thresholds (ms)
    FACE_BASE_INT = 0.050 # Target 20fps for better tracking stability    
    POSE_BASE_INT = 0.150 
    HAND_BASE_INT = 0.033 # Real-time target
    OBJ_BASE_INT  = 0.300
        
    # Fast-Path Decision: If semaphore is busy, skip non-essential models
    can_run_heavy = global_engine_semaphore.acquire(blocking=False)
    has_heavy_lock = can_run_heavy
    
    # Static requests bypass semaphore to guarantee results
    if is_static:
        can_run_heavy = True

    # CRITICAL TRACKING FIX (Phase 24): For faces, we cap the load factor to 2.0 to prevent ID flickering
    run_face = ("face" in detection_modes or "full" in detection_modes) and \
               ((now - last_run_times["face"] >= (FACE_BASE_INT * min(load_factor, 2))) or is_static)
    
    run_pose = can_run_heavy and ("body" in detection_modes or "full" in detection_modes) and \
               ((now - last_run_times["pose"] >= (POSE_BASE_INT * load_factor)) or is_static)
               
    run_hand = can_run_heavy and ("hand" in detection_modes or "full" in detection_modes) and \
               ((now - last_run_times["hand"] >= HAND_BASE_INT) or is_static)
               
    run_object = can_run_heavy and ("object" in detection_modes or "full" in detection_modes) and \
                 ((now - last_run_times["object"] >= (OBJ_BASE_INT * load_factor)) or is_static)
    
    # 2. Parallel Inference Submissions (Phase 2 + Phase 12 Parallel Face)
    img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    
    # 2. Sequential Inference (Phase 16 Simplified)
    detection_results = {}
    
    if run_face:
        raw_res, w, e = run_engine_safe(face_lock, insight_engine.analyze, img)
        if raw_res and isinstance(raw_res, tuple) and len(raw_res) == 2:
            res, sub_perf = raw_res
            detection_results["face"] = res
            perf["face_wait"] = round(w, 4)
            perf["face_exec"] = round(e, 4)
            perf.update(sub_perf)
        else:
            # If it's a list (e.g. error fallback from run_engine_safe)
            detection_results["face"] = raw_res if isinstance(raw_res, list) else []
            perf["face_wait"] = round(w, 4)
            perf["face_exec"] = round(e, 4)
        last_run_times["face"] = now

    if run_pose and ("body" in detection_modes or "full" in detection_modes):
        res, w, e = run_engine_safe(pose_lock, pose_engine.analyze, img_rgb, ts)
        detection_results["pose"] = res
        perf["pose_wait"] = round(w, 4)
        perf["pose_exec"] = round(e, 4)
        last_run_times["pose"] = now
        
    if run_hand and ("hand" in detection_modes or "full" in detection_modes):
        res, w, e = run_engine_safe(hand_lock, hand_engine.analyze, img_rgb, ts)
        detection_results["hands"] = res
        perf["hand_wait"] = round(w, 4)
        perf["hand_exec"] = round(e, 4)
        last_run_times["hand"] = now
        
    if run_object and ("object" in detection_modes or "full" in detection_modes):
        res, w, e = run_engine_safe(object_lock, object_engine.detect, img_rgb, ts)
        detection_results["objects"] = res
        log.info(f"Engine ran. Raw objects len: {len(res) if res else 0}")
        perf["object_wait"] = round(w, 4)
        perf["object_exec"] = round(e, 4)
        last_run_times["object"] = now

    # 3. Tracker Core (Main Thread)
    raw_detections = detection_results.get("face", [])
    
    ds_detections = []
    ds_embeds = []
    for i, det in enumerate(raw_detections):
        x1, y1, x2, y2 = det["bbox"]
        ds_detections.append(([x1, y1, x2 - x1, y2 - y1], det["det_score"], f"face_{i}"))
        ds_embeds.append(det["embedding"])

    t_start = time.time()
    tracks = face_tracker_engine.update(ds_detections, img, embeds=ds_embeds) if not is_static else []
    perf["tracking_time"] = round(time.time() - t_start, 4)

    # 4. Collection & Cache
    pose_results = detection_results.get("pose", last_results_cache["pose"])
    hands_results = detection_results.get("hands", last_results_cache["hands"])
    raw_objects = detection_results.get("objects", last_results_cache["objects"])
    
    # Update cache
    if "pose" in detection_results: last_results_cache["pose"] = pose_results
    if "hands" in detection_results: last_results_cache["hands"] = hands_results
    if "objects" in detection_results: last_results_cache["objects"] = raw_objects

    # 5. Object Post-Processing & ReID
    objects_data = []
    persons_reid = []
    if ("object" in detection_modes or "full" in detection_modes):
        log.info(f"Modes check true! Raw objects: {len(raw_objects) if raw_objects else 0}")
        if raw_objects:
            # 5.1 Person ReID (Phase 28: Fallback Identity Support)
            # Use original RGB for best feature extraction
            res, w, e = run_engine_safe(reid_lock, reid_engine.analyze_persons, img_rgb, raw_objects)
            persons_reid = res
            perf["reid_wait"] = round(w, 4)
            perf["reid_exec"] = round(e, 4)

            ds_objects = object_engine.to_deepsort_format(raw_objects)
            tracked_objects = object_tracker_engine.update(ds_objects, img)
            log.info(f"Objects detected: {len(raw_objects)}, ds_objects: {len(ds_objects)}, tracked: {len(tracked_objects)}")
            if not tracked_objects:
                for idx, ro in enumerate(raw_objects):
                    objects_data.append({
                        "label": ro.get("label", "object"), "confidence": ro.get("confidence", 0.99), "track_id": f"o_static_{idx}",
                        "xmin": ro.get("xmin", 0), "ymin": ro.get("ymin", 0), "xmax": ro.get("xmax", 0), "ymax": ro.get("ymax", 0),
                        "history": []
                    })
            else:
                for track in tracked_objects:
                    try:
                        tx1, ty1, tx2, ty2 = track["bbox"]
                        # Fallback to get class name securely
                        class_label = track.get("class", track.get("label", "object"))
                        objects_data.append({
                            "label": class_label, "confidence": track.get("confidence", 0.99), "track_id": f"o_{track['track_id']}",
                            "xmin": float(tx1 / curr_w), "ymin": float(ty1 / curr_h), "xmax": float(tx2 / curr_w), "ymax": float(ty2 / curr_h),
                            "history": [[float(pt[0] / curr_w), float(pt[1] / curr_h)] for pt in track.get("history", [])][-10:]
                        })
                    except Exception as e:
                        log.error(f"Object post-proc error: {e}")
            log.info(f"Final objects_data size: {len(objects_data)}")
    # Update global objects cache for next skipped frame tracker call if needed 
    # (Actually tracker handles its own state, but we return tracked_objects)
    
    # 6. Face Meta-Engines (Conditional Phase 3)
    stable_faces = []
    processing_list = tracks if not is_static else [{"bbox": det["bbox"], "confidence": det["det_score"], "track_id": -1, "history": []} for det in raw_detections]

    def process_face_track(track):
        try:
            is_static_track = track["track_id"] == -1
            track_id = f"f_{track['track_id']}" if not is_static_track else "static"
            tx1, ty1, tx2, ty2 = track["bbox"]
            
            best_match = None
            if raw_detections:
                max_iou = 0
                for det in raw_detections:
                    dx1, dy1, dx2, dy2 = det["bbox"]
                    inter_area = max(0, min(tx2, dx2) - max(tx1, dx1)) * max(0, min(ty2, dy2) - max(ty1, dy1))
                    iou = inter_area / float((tx2-tx1)*(ty2-ty1) + (dx2-dx1)*(dy2-dy1) - inter_area) if inter_area > 0 else 0
                    if iou > max_iou: max_iou, best_match = iou, det
            
            run_mesh = ("mesh" in detection_modes or "full" in detection_modes) and (is_static or track.get("age", 0) > 2)
            box_area = (tx2 - tx1) * (ty2 - ty1)
            run_emo = (frame_count % 5 == 0 and box_area > 5000) or is_static
            
            # Initialize default results with full emotion set to prevent KeyErrors in smoothing
            emo = {"scores": DEFAULT_EMO_SCORES.copy(), "dominant": "Neutral"}
            
            if run_mesh or run_emo:
                chip = img[max(0, int(ty1)):min(curr_h, int(ty2)), max(0, int(tx1)):min(curr_w, int(tx2))]
                if chip.size > 0:
                    if run_emo:
                        emo_res, e_w, e_e = run_engine_safe(track_lock, emotion_engine.detect_emotion, chip)
                        emo = emo_res # Use the result

            # Use demographics already provided by InsightFace (best_match)
            raw_age = best_match.get("age", 25) if best_match else 25
            raw_gender = best_match.get("gender", "Male") if best_match else "Male"

            age, gender, embedding, smoothed_emotions, dominant_emotion = get_smoothed_data(
                track_id, 
                raw_age, 
                1 if raw_gender == "Male" else 0,
                best_match.get("embedding") if best_match else None,
                emo.get("scores", {"Neutral": 1.0})
            )
            
            return {
                "track_id": track_id,
                "bbox": {"xmin": float(tx1 / curr_w), "ymin": float(ty1 / curr_h), "width": float((tx2 - tx1) / curr_w), "height": float((ty2 - ty1) / curr_h)},
                "xmin": float(tx1 / curr_w), "ymin": float(ty1 / curr_h), "width": float((tx2 - tx1) / curr_w), "height": float((ty2 - ty1) / curr_h),
                "confidence": float(track["confidence"]),
                "history": [[float(pt[0] / curr_w), float(pt[1] / curr_h)] for pt in track.get("history", [])][-10:],
                "embedding": embedding,
                "demographics": {"age": age, "gender": "Male" if gender == 1 else "Female", "livenessScore": round(float(track["confidence"] * 0.98), 4)},
                "emotions": {"dominant": dominant_emotion, "scores": smoothed_emotions}
            }
        except Exception as e:
            log.error(f"process_face_track fatal error: {str(e)}\n{traceback.format_exc()}")
            return None

    # Metadata processing (Serial but fast since engines handle chips)
    stable_faces = [process_face_track(p) for p in processing_list]
    stable_faces = [f for f in stable_faces if f is not None]
    
    # 7. Holistic Mesh (Decoupled & Semaphore-Aware)
    mesh_data = last_results_cache["mesh"]
    if ("mesh" in detection_modes or "full" in detection_modes) and can_run_heavy:
        MESH_INTERVAL = 0.100
        if (now - last_run_times["mesh"] >= MESH_INTERVAL) or is_static:
            mesh_data, m_w, m_e = run_engine_safe(mesh_lock, mesh_engine.analyze, img_rgb, ts)
            last_results_cache["mesh"] = mesh_data
            last_run_times["mesh"] = now

    # CRITICAL: Release semaphore for others to use
    if can_run_heavy:
        global_engine_semaphore.release()

    last_total_time = time.time() - start_time
    perf["total_pipeline_time"] = round(last_total_time, 4)
    
    return {
        "faceDetected": len(stable_faces) > 0, "totalFaces": len(stable_faces), "faces": stable_faces,
        "pose": pose_results, "hands": hands_results, "mesh": mesh_data, "objects": objects_data, "persons": persons_reid,
        "metadata": {"width": orig_w, "height": orig_h, "proc_width": curr_w, "proc_height": curr_h, "profiling": perf, "frame_count": frame_count, "downsample": downsample_mode}
    }

def detect_face(image_bytes, is_static=False, **kwargs):
    return process_face_pipeline(image_bytes, is_static=is_static, **kwargs)
