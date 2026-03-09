import threading
import time
import cv2
import traceback
from app.core.logging import logger as log

class ObjectWorker(threading.Thread):
    def __init__(self, stop_event, frame_bus, track_memory, load_controller, object_engine, tracker_engine, reid_engine):
        super().__init__(daemon=True)
        self.stop_event = stop_event
        self.frame_bus = frame_bus
        self.track_memory = track_memory
        self.load_controller = load_controller
        
        self.object_engine = object_engine
        self.tracker = tracker_engine
        self.reid_engine = reid_engine
        
        self.last_run_times = {"object": 0}
        self.camera_queue = self.frame_bus.subscribe("camera_object")
        self.perf_stats = {"latency_ms": 0}

    def run(self):
        log.info("ObjectWorker started.")
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
                
                run_object = ("object" in detect_modes or "full" in detect_modes) and \
                             (self.load_controller.can_run("object", self.last_run_times["object"]) or is_static)

                if run_object:
                    img_rgb = payload["metadata"].get("img_rgb", cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
                    raw_objects = self.object_engine.detect(img_rgb, ts)
                    if isinstance(raw_objects, tuple): raw_objects = raw_objects[0]
                    
                    self.last_run_times["object"] = time.time()
                    
                    if raw_objects:
                        # Phase 28: Person ReID Extraction
                        reid_results = self.reid_engine.analyze_persons(img_rgb, raw_objects)
                        # Map reid embeddings back to raw_objects by spatial matching if needed, 
                        # but analyze_persons returns them in order of detection.
                        # For simplicity, we can just iterate and attach.
                        for ro in raw_objects:
                            if ro.get("label") == "person":
                                # Find matching reid result by bbox proximity
                                for rr in reid_results:
                                    if rr["bbox"] == ro["bbox_norm"]:
                                        ro["reid_embedding"] = rr["reid_embedding"]
                                        break

                        # Tracker needs pixels for Kalman stability
                        ds_objects = []
                        embeddings = []
                        for ro in raw_objects:
                            bp = ro["bbox_px"]
                            ds_objects.append(([bp["x1"], bp["y1"], bp["width"], bp["height"]], ro["confidence"], ro["label"]))
                            # Priority: Use ReID embedding if person, else default object embedding
                            embed = ro.get("reid_embedding", ro.get("embedding", []))
                            embeddings.append(embed)
                        
                        tracked_objects = self.tracker.update(ds_objects, frame, embeds=embeddings)
                        
                        # Format as tracks for TrackMemory, prefix with "o_"
                        formatted_tracks = []
                        if not tracked_objects and is_static:
                            for i, ro in enumerate(raw_objects):
                                # Unified [xmin, ymin, xmax, ymax]
                                formatted_tracks.append({
                                    "track_id": f"o_static_{i}",
                                    "bbox": [ro["xmin"], ro["ymin"], ro["xmax"], ro["ymax"]],
                                    "confidence": ro.get("confidence", 0.99),
                                    "label": ro.get("label", "object"),
                                    "identity": ro.get("label", "object"),
                                    "reid_embedding": ro.get("reid_embedding", [])
                                })
                        else:
                            for trk in tracked_objects:
                                tid = f"o_{trk['track_id']}"
                                
                                # Phase 14: Real-time Object Identity Bridging
                                track_obj = self.track_memory.get_track(tid)
                                identity = getattr(track_obj, "identity", None) if track_obj else None
                                
                                if track_obj and not identity:
                                    track_embedding = trk.get("embedding")
                                    if track_embedding:
                                        identity = recognition_client.identify_object(track_embedding, category=trk.get("class"))
                                        if identity:
                                            log.info(f"[ObjectRecognition] Identity resolved for {tid}: {identity['name']}")
                                            self.track_memory.update_track_metadata(tid, {"identity": identity})
                                
                                # Periodic Re-identification
                                if track_obj and identity:
                                    track_age = getattr(track_obj, "age", 0)
                                    if track_age > 0 and track_age % 150 == 0:
                                        track_embedding = trk.get("embedding")
                                        if track_embedding:
                                            new_identity = recognition_client.identify_object(track_embedding, category=trk.get("class"))
                                            self.track_memory.update_track_metadata(tid, {"identity": new_identity})

                                formatted_tracks.append({
                                    "track_id": tid,
                                    "bbox": trk["bbox"],
                                    "confidence": trk.get("confidence", 0.99),
                                    "label": trk.get("class", trk.get("label", "object")),
                                    "identity": identity if identity else trk.get("class", trk.get("label", "object")),
                                    "embedding": trk.get("embedding", []),
                                    "reid_embedding": trk.get("embedding") if trk.get("class") == "person" else []
                                })
                            
                        self.track_memory.update_tracks(formatted_tracks)
                        
                self.perf_stats["latency_ms"] = int((time.time() - t_start) * 1000)

            except Exception as e:
                log.error(f"ObjectWorker error: {e}")
                traceback.print_exc()
