import threading
import time
import cv2
import traceback
from app.core.logging import logger as log

class PoseHandWorker(threading.Thread):
    def __init__(self, stop_event, frame_bus, track_memory, load_controller, pose_engine, hand_engine):
        super().__init__(daemon=True)
        self.stop_event = stop_event
        self.frame_bus = frame_bus
        self.track_memory = track_memory
        self.load_controller = load_controller
        
        self.pose = pose_engine
        self.hand = hand_engine
        
        self.last_run_times = {"pose": 0, "hand": 0}
        self.camera_queue = self.frame_bus.subscribe("camera_pose")
        self.perf_stats = {"latency_ms": 0}
        self.last_pose = []
        self.last_hands = []

    def run(self):
        log.info("PoseHandWorker started.")
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
                
                run_pose = ("body" in detect_modes or "full" in detect_modes) and \
                           (self.load_controller.can_run("pose", self.last_run_times["pose"]) or is_static)
                           
                run_hand = ("hand" in detect_modes or "full" in detect_modes) and \
                           (self.load_controller.can_run("hand", self.last_run_times["hand"]) or is_static)

                if run_pose:
                    img_rgb = payload["metadata"].get("img_rgb", cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
                    # PoseEngine handles behavior tracking internally via track_id
                    # For now, we use a single systemic track_id for full-frame poses
                    pose_res = self.pose.analyze(img_rgb, ts, track_id="body_0")
                    
                    self.track_memory.update_track_metadata("pose_system", {"pose_data": pose_res})
                    self.last_pose = pose_res
                    self.last_run_times["pose"] = time.time()
                    
                    # Log any detected behaviors
                    for pose in pose_res:
                        metrics = pose.get("metrics", {})
                        if metrics.get("fall"): log.warning(f"[Behavior] Fall detected for {pose['track_id']} (Conf: {metrics['behaviorConfidence']:.2f})")
                        elif metrics.get("running"): log.info(f"[Behavior] Running detected for {pose['track_id']} (Conf: {metrics['behaviorConfidence']:.2f})")
                        elif metrics.get("stationary"): log.info(f"[Behavior] Stationary state for {pose['track_id']} (Conf: {metrics['behaviorConfidence']:.2f})")
                    
                if run_hand:
                    img_rgb = payload["metadata"].get("img_rgb", cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
                    hand_res = self.hand.analyze(img_rgb, ts)
                    self.track_memory.update_track_metadata("hand_system", {"hand_data": hand_res})
                    self.last_hands = hand_res
                    self.last_run_times["hand"] = time.time()

                self.perf_stats["latency_ms"] = int((time.time() - t_start) * 1000)

            except Exception as e:
                log.error(f"PoseHandWorker error: {e}")
                traceback.print_exc()
