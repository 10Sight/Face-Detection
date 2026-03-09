import threading
import time
import cv2
import traceback
import numpy as np
from app.core.logging import logger as log
from app.services.recognition_client import recognition_client


class FaceWorker(threading.Thread):
    def __init__(self, stop_event, frame_bus, track_memory, load_controller, insight_engine, tracker_engine, emotion_engine, mesh_engine):
        super().__init__(daemon=True)
        self.stop_event = stop_event
        self.frame_bus = frame_bus
        self.track_memory = track_memory
        self.load_controller = load_controller
        
        self.insight = insight_engine
        self.tracker = tracker_engine
        self.emotion = emotion_engine
        self.mesh = mesh_engine
        
        self.last_run_times = {"face": 0, "mesh": 0}
        self.camera_queue = self.frame_bus.subscribe("camera")
        
        # Meta dictionary to report perf to the Fusion Engine
        self.perf_stats = {"latency_ms": 0}
        self.last_mesh = []
        self.alert_throttling = {} # tid -> last_alert_time

    def run(self):
        log.info("FaceWorker started.")
        import queue
        while not self.stop_event.is_set():
            try:
                try:
                    payload = self.camera_queue.get(timeout=1.0)
                except queue.Empty:
                    continue
                frame = payload["frame"]
                ts = payload["metadata"]["timestamp_ms"]
                is_static = payload["metadata"].get("is_static", False)
                detect_modes = payload["metadata"].get("modes", ["full"])
                
                t_start = time.time()
                
                run_face = ("face" in detect_modes or "full" in detect_modes) and \
                           (self.load_controller.can_run("face", self.last_run_times["face"]) or is_static)
                           
                no_faces_detected = len(self.track_memory.get_all_tracks()) == 0
                
                run_mesh = ("mesh" in detect_modes or "full" in detect_modes) and \
                           (self.load_controller.can_run("mesh", self.last_run_times["mesh"], no_faces=no_faces_detected) or is_static)

                # Use pre-converted RGB frame from metadata if available, otherwise convert
                img_rgb = payload["metadata"].get("img_rgb", cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
                h, w = frame.shape[:2]

                # 1. Primary Detection
                raw_detections = []
                if run_face:
                    # insight engine analyze returns raw_res, wait_time, exec_time due to wrappers in original, 
                    # but here we use it directly if it doesn't return tuple. 
                    # Note: We assume insight_engine.analyze(frame) returns a list of faces OR tuple.
                    raw_res = self.insight.analyze(frame)
                    if isinstance(raw_res, tuple):
                        raw_detections = raw_res[0]
                    else:
                        raw_detections = raw_res
                        
                    self.last_run_times["face"] = time.time()

                    if raw_detections:
                        log.info(f"FaceWorker: Detected {len(raw_detections)} raw faces.")
                    
                    # 2. Tracking (Pass PIXELS to Tracker for stability)
                    ds_detections = []
                    ds_embeds = []
                    for i, det in enumerate(raw_detections):
                        px1, py1, px2, py2 = det["bbox"]
                        ds_detections.append(([px1, py1, px2 - px1, py2 - py1], det["det_score"], "face"))
                        ds_embeds.append(det["embedding"])

                    tracks = self.tracker.update(ds_detections, frame, embeds=ds_embeds) if not is_static else []
                    
                    if raw_detections and not tracks and not is_static:
                        log.warning(f"FaceWorker: Tracker returned 0 confirmed tracks for {len(raw_detections)} detections.")
                    elif tracks:
                        log.info(f"FaceWorker: Tracker returned {len(tracks)} confirmed tracks.")
                    if is_static:
                        tracks = []
                        for i, det in enumerate(raw_detections):
                            # For static, we manually create normalized "pseudo-tracks"
                            px1, py1, px2, py2 = det["bbox"]
                            tracks.append({
                                "track_id": f"static_{i}",
                                "bbox": [px1/w, py1/h, px2/w, py2/h],
                                "confidence": det["det_score"],
                                "history": []
                            })
                        
                    # Update TrackMemory
                    self.track_memory.update_tracks(tracks)
                    
                    # Semantics per track
                    for track in tracks:
                        tid = str(track["track_id"])
                        chip = None
                        # nx1, ny1, nx2, ny2 are normalized now
                        nx1, ny1, nx2, ny2 = track["bbox"]
                        
                        # Convert back to PIXELS for cropping
                        tx1, ty1, tx2, ty2 = int(nx1 * w), int(ny1 * h), int(nx2 * w), int(ny2 * h)
                        
                        box_area_px = (tx2 - tx1) * (ty2 - ty1)
                        # log.info(f"Processing track {tid} area: {box_area_px}") # Removed for brevity
                        if box_area_px > 500 or is_static:
                            chip = frame[max(0, ty1):min(h, ty2), max(0, tx1):min(w, tx2)]
                            if chip.size > 0:
                                emo_res = self.emotion.detect_emotion(chip)
                                if isinstance(emo_res, tuple): emo_res = emo_res[0]
                                self.track_memory.update_track_metadata(tid, {"emotions": emo_res})

                        # Phase 14: Real-time Identity Bridging
                        # If track has no identity yet, attempt identification
                        track_obj = self.track_memory.get_track(tid)
                        if track_obj and not getattr(track_obj, "identity", None):
                            track_embedding = getattr(track_obj, "embedding", None)
                            if track_embedding:
                                identity = recognition_client.identify(track_embedding)
                                if identity:
                                    log.info(f"[Recognition] Identity resolved for {tid}: {identity['name']}")
                                    self.track_memory.update_track_metadata(tid, {"identity": identity})
                                else:
                                    # unknown - trigger alert
                                    self._trigger_unknown_alert(tid, chip, ts)
                        
                        # Phase 21: Periodic Re-identification for persistent tracks
                        # This ensures deleted identities are reflected for tracks that haven't left the view.
                        # Also periodically refreshes the "Verified" age.
                        if track_obj and getattr(track_obj, "identity", None):
                            track_age = getattr(track_obj, "age", 0)
                            if track_age > 0 and track_age % 150 == 0: # Approx every 5-10s at 15-30fps
                                log.debug(f"[Recognition] Periodic re-verification for track {tid}...")
                                track_embedding = getattr(track_obj, "embedding", None)
                                if track_embedding:
                                    new_identity = recognition_client.identify(track_embedding)
                                    # If identity is now Unknown (None), clear it
                                    if not new_identity:
                                        log.info(f"[Recognition] Track {tid} now Unknown (purged from registry).")
                                        self.track_memory.update_track_metadata(tid, {"identity": None})
                                        self._trigger_unknown_alert(tid, chip, ts)
                                    else:
                                        # Update with newest server data (e.g. name change)
                                        self.track_memory.update_track_metadata(tid, {"identity": new_identity})

                        # Attach Demographics (Age/Gender) from InsightFace if identity is unknown
                        # Find best matching raw detection for this track by centroid
                        if track_obj and not getattr(track_obj, "demographics", None):
                            best_det = None
                            min_dist = 0.1
                            for det in raw_detections:
                                dx1, dy1, dx2, dy2 = det["bbox"]
                                d_center = ((dx1+dx2)/(2*w), (dy1+dy2)/(2*h))
                                t_center = ((nx1+nx2)/2, (ny1+ny2)/2)
                                dist = ((d_center[0]-t_center[0])**2 + (d_center[1]-t_center[1])**2)**0.5
                                if dist < min_dist:
                                    min_dist = dist
                                    best_det = det
                            
                            if best_det:
                                self.track_memory.update_track_metadata(tid, {
                                    "demographics": {
                                        "age": best_det["age"],
                                        "gender": best_det["gender"]
                                    }
                                })


                # 3. Holistic Mesh
                if run_mesh:
                    mesh_data = self.mesh.analyze(img_rgb, ts)
                    if isinstance(mesh_data, tuple): mesh_data = mesh_data[0] # Handle wrapper if any
                    
                    # Note: Mesh engine returns its own track IDs, but structurally relates to faces.
                    # We can store mesh data globally or try to match to TrackMemory based on centroid.
                    # For now, we store it in a generic track "mesh_global" or attach to nearest face.
                    if mesh_data:
                        # Simple naive global assignment for streaming delta 
                        self.track_memory.update_track_metadata("mesh_system", {"mesh_data": mesh_data})
                        self.last_mesh = mesh_data
                    
                    self.last_run_times["mesh"] = time.time()

                self.perf_stats["latency_ms"] = int((time.time() - t_start) * 1000)

            except Exception as e:
                log.error(f"FaceWorker error: {e}")
                traceback.print_exc()

    def _trigger_unknown_alert(self, tid, chip, ts):
        """Helper to send throttled unknown face alerts to the main server."""
        if chip is None: return
        
        now = time.time()
        last_alert = self.alert_throttling.get(tid, 0)
        
        # Notify once every 30 seconds per track
        if now - last_alert > 30:
            self.alert_throttling[tid] = now
            
            def send_alert():
                try:
                    import requests
                    from app.core.config import settings
                    
                    # Convert chip to bytes
                    success, buffer = cv2.imencode('.jpg', chip)
                    if not success: return
                    
                    files = {'file': ('unknown.jpg', buffer.tobytes(), 'image/jpeg')}
                    data = {
                        'trackId': tid,
                        'timestamp': str(ts),
                        'metadata': '{}'
                    }
                    
                    url = f"{settings.SERVER_URL}/api/v1/alert/unknown"
                    resp = requests.post(url, files=files, data=data, timeout=5)
                    log.info(f"[Alert] Server response for {tid}: {resp.status_code}")
                except Exception as e:
                    log.error(f"[Alert] Failed to notify server: {e}")
                    
            import threading
            threading.Thread(target=send_alert, daemon=True).start()
