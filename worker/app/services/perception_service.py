import queue
import time
import cv2
import numpy as np

from app.pipeline.frame_bus import frame_bus
from app.core.track_memory import TrackMemory
from app.pipeline.frame_scheduler import AdaptiveLoadController

# Engine imports
from app.engines.face_engine import InsightFaceEngine
from app.tracking.tracker import TrackerEngine
from app.engines.emotion import EmotionEngine
from app.engines.pose_engine import PoseEngine
from app.engines.hand_engine import HandEngine
from app.engines.mesh_engine import MeshEngine
from app.engines.yolo_object_engine import YOLOObjectEngine
from app.engines.reid_engine import ReIDEngine

# Worker imports
from app.workers.face_worker import FaceWorker
from app.workers.pose_hand_worker import PoseHandWorker
from app.workers.object_worker import ObjectWorker
from app.core.logging import logger as log
import threading

class PerceptionEngine:
    """
    State Fusion Engine (Phase 1, 7, 8).
    Manages the FrameBus, TrackMemory, LoadController, and orchestrates the worker threads.
    Emits delta updates for streaming.
    """
    def __init__(self):
        self.frame_bus = frame_bus
        self.delta_queue = queue.Queue(maxsize=1000)
        self.track_memory = TrackMemory(max_missing_age=30, event_queue=self.delta_queue)
        self.load_controller = AdaptiveLoadController(target_fps=30)
        self.stop_event = threading.Event()
        self.initialized = False

    def initialize(self):
        """Phase 8/27: Deferred heavy initialization to prevent uvicorn lockup."""
        if self.initialized: return
        
        log.info("PerceptionEngine: Initializing AI Engines...")
        # Shared Engines
        self.insight_engine = InsightFaceEngine(model_name='buffalo_s')
        self.face_tracker = TrackerEngine(max_age=120, n_init=2, max_cosine_distance=0.8)
        self.emotion_engine = EmotionEngine()
        self.pose_engine = PoseEngine()
        self.hand_engine = HandEngine()
        self.mesh_engine = MeshEngine()
        self.object_engine = YOLOObjectEngine()
        self.reid_engine = ReIDEngine()
        self.object_tracker = TrackerEngine(max_age=60, n_init=2, max_cosine_distance=0.8, min_confidence=0.35)
        
        log.info("PerceptionEngine: Starting Worker Threads...")
        # Workers
        self.face_worker = FaceWorker(self.stop_event, self.frame_bus, self.track_memory, self.load_controller, 
                                      self.insight_engine, self.face_tracker, self.emotion_engine, self.mesh_engine)
        self.pose_hand_worker = PoseHandWorker(self.stop_event, self.frame_bus, self.track_memory, self.load_controller, 
                                               self.pose_engine, self.hand_engine)
        self.object_worker = ObjectWorker(self.stop_event, self.frame_bus, self.track_memory, self.load_controller, 
                                          self.object_engine, self.object_tracker, self.reid_engine)
                                          
        # Start Threads
        self.face_worker.start()
        self.pose_hand_worker.start()
        self.object_worker.start()
        self.initialized = True
        log.info("PerceptionEngine: Fully Initialized.")

    def stop(self):
        """Phase 20: Graceful shutdown orchestration."""
        log.info("PerceptionEngine: Stopping Workers...")
        self.stop_event.set()
        
        # Join worker threads with timeout
        for worker in [self.face_worker, self.pose_hand_worker, self.object_worker]:
            if hasattr(self, worker.__name__ if hasattr(worker, '__name__') else 'worker'): # Check if exists
                pass # Just use the instance directly
            
        try:
            if hasattr(self, 'face_worker'): self.face_worker.join(timeout=2.0)
            if hasattr(self, 'pose_hand_worker'): self.pose_hand_worker.join(timeout=2.0)
            if hasattr(self, 'object_worker'): self.object_worker.join(timeout=2.0)
            
            from app.services.recognition_client import recognition_client
            recognition_client.close()
            
            log.info("PerceptionEngine: All Workers Stopped.")
        except Exception as e:
            log.error(f"PerceptionEngine: Error during shutdown: {e}")
        
    def ingest_frame(self, image_bytes, is_static=False, modes=["full"]):
        """
        Takes raw image bytes from WebSocket or API, publishes to FrameBus.
        """
        np_arr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
        
        if img is None:
            return False
            
        self.load_controller.tick_frame()
        scale = self.load_controller.get_resolution_scale()
        
        if scale < 1.0 and not is_static:
            h, w = img.shape[:2]
            img = cv2.resize(img, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_AREA)

        # Performance Optimization: Convert TO RGB once here instead of in EVERY worker
        img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        
        metadata = {
            "is_static": is_static,
            "modes": modes,
            "timestamp_ms": int(time.time() * 1000),
            "res_scale": scale, # Add resolution scale to metadata
            "img_rgb": img_rgb # Pass RGB in metadata
        }
        
        self.frame_bus.publish(img, metadata)
        return True

    def get_delta_updates(self):
        """Consume all available deltas from the queue for WebSocket broadcast."""
        deltas = []
        while not self.delta_queue.empty():
            try:
                deltas.append(self.delta_queue.get_nowait())
            except queue.Empty:
                break
        return deltas

    def get_full_state(self):
        """
        Aggregates TrackMemory and worker states into a single JSON-serializable payload
        that exactly matches the schema expected by the legacy React frontend.
        """
        if not hasattr(self, '_state_call_count'): self._state_call_count = 0
        self._state_call_count += 1
        
        active_face_tracks = []
        active_object_tracks = []
        
        # We classify tracks by verifying their contents
        all_tracks = self.track_memory.get_all_tracks()
        for t in all_tracks:
            # Skip pseudo-tracks used for system-wide metadata storage
            if t.track_id in ["mesh_system", "pose_system", "hand_system"]:
                continue
                
            # Serializing track objects safely for JSON
            t_dict = {
                "track_id": t.track_id,
                "bbox": t.bbox,
                "xmin": t.bbox[0],
                "ymin": t.bbox[1],
                "xmax": t.bbox[2],
                "ymax": t.bbox[3],
                "width": t.bbox[2] - t.bbox[0],
                "height": t.bbox[3] - t.bbox[1],
                "confidence": t.confidence,
                "state": t.state.value if hasattr(t.state, 'value') else t.state,
                "history": getattr(t, 'history', [])
            }
            if hasattr(t, 'identity') and t.identity:
                t_dict["identity"] = t.identity
            if hasattr(t, 'demographics'):
                t_dict["demographics"] = t.demographics
            
            # Additional metadata attached by FaceWorker
            if hasattr(t, 'emotions'): t_dict["emotions"] = t.emotions
            if hasattr(t, 'mesh'): t_dict["mesh"] = t.mesh
            if hasattr(t, 'head_pose'): t_dict["head_pose"] = t.head_pose
                
            # If the track has a label (ObjectDetection), put in objects
            if hasattr(t, 'label'):
                t_dict["label"] = t.label
                active_object_tracks.append(t_dict)
            else:
                active_face_tracks.append(t_dict)

        # Prepare the aggregate state dictionary

        # Grab latest holistic data
        hands_data = getattr(self.pose_hand_worker, 'last_hands', [])
        pose_data = getattr(self.pose_hand_worker, 'last_pose', [])
        mesh_data = getattr(self.face_worker, 'last_mesh', [])
                
        res_dict = {
            "faces": active_face_tracks,
            "pose": pose_data,
            "hands": hands_data,
            "mesh": mesh_data,
            "objects": active_object_tracks
        }

        if not self.initialized:
            if self._state_call_count % 60 == 0:
                log.warning("PerceptionEngine: get_full_state called while INITIALIZING")
            return res_dict
        
        if self._state_call_count % 60 == 0:
            log.info(f"State Aggregation: {len(active_face_tracks)} faces, {len(active_object_tracks)} objects, {len(pose_data)} pose points")
            
        return res_dict

    def get_telemetry(self):
        """Phase 9: Performance Telemetry"""
        if not self.initialized: return {"status": "initializing"}
        
        face_perf = getattr(self.face_worker, 'perf_stats', {})
        pose_perf = getattr(self.pose_hand_worker, 'perf_stats', {})
        obj_perf = getattr(self.object_worker, 'perf_stats', {})
        
        return {
            "fps_target": self.load_controller.target_fps,
            "current_fps": sum(self.load_controller.fps_history) / max(1, len(self.load_controller.fps_history)),
            "cpu_usage": sum(self.load_controller.cpu_history) / max(1, len(self.load_controller.cpu_history)),
            "active_tracks": len(self.track_memory.get_all_tracks()),
            "worker_latency_ms": {
                "face": face_perf.get("latency_ms", 0),
                "pose_hand": pose_perf.get("latency_ms", 0),
                "object": obj_perf.get("latency_ms", 0)
            }
        }

# Global singleton
perception_service = PerceptionEngine()

