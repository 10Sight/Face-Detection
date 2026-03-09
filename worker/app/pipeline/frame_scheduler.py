import time
import psutil
from collections import deque

class AdaptiveLoadController:
    """
    Adjusts inference execution intervals dynamically based on CPU usage and FPS.
    """
    def __init__(self, target_fps=30):
        self.target_fps = target_fps
        self.fps_history = deque(maxlen=60)
        self.cpu_history = deque(maxlen=10)
        self.last_frame_time = time.time()
        
        # Base intervals in seconds
        self.base_intervals = {
            "face": 0.1,    # ~10 Hz
            "mesh": 0.15,   # ~6 Hz
            "pose": 0.15,   # ~6 Hz
            "hand": 0.033,  # ~30 Hz real time
            "object": 0.3   # ~3 Hz
        }
        
        self.current_intervals = self.base_intervals.copy()
        
    def tick_frame(self):
        now = time.time()
        dt = now - self.last_frame_time
        self.last_frame_time = now
        
        if dt > 0:
            current_fps = 1.0 / dt
            self.fps_history.append(current_fps)
            
        # Update CPU periodically (roughly every 30 frames)
        if len(self.fps_history) >= 30 and len(self.fps_history) % 30 == 0:
            cpu = psutil.cpu_percent()
            self.cpu_history.append(cpu)
            self._recalculate_intervals()

    def _recalculate_intervals(self):
        if not self.fps_history or not self.cpu_history:
            return
            
        avg_fps = sum(self.fps_history) / len(self.fps_history)
        avg_cpu = sum(self.cpu_history) / len(self.cpu_history)
        
        load_multiplier = 1.0
        
        if avg_cpu > 80.0:
            load_multiplier = 2.0  # Double skip interval
        elif avg_cpu > 90.0:
            load_multiplier = 3.0  # Triple skip interval
            
        if avg_fps < 15.0 and avg_cpu > 70.0:
            load_multiplier = max(load_multiplier, 2.5)

        for engine, base_int in self.base_intervals.items():
            self.current_intervals[engine] = base_int * load_multiplier

    def can_run(self, engine_name, last_run_timestamp, no_faces=False):
        """Returns True if the engine is allowed to run this frame."""
        now = time.time()
        
        # Rule: Temporarily disable mesh if no faces detected
        if engine_name == "mesh" and no_faces:
            return False
            
        interval = self.current_intervals.get(engine_name, 0.1)
        if (now - last_run_timestamp) >= interval:
            return True
            
        return False
        
    def get_resolution_scale(self):
        """Return a scale factor: if FPS < 15, reduce input resolution."""
        if not self.fps_history: return 1.0
        avg_fps = sum(self.fps_history) / len(self.fps_history)
        if avg_fps < 15.0:
            return 0.75 # 75% resolution
        return 1.0
