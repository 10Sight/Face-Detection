import threading
from collections import deque
import time

class FrameBus:
    """
    Shared frame bus (internal message system) where the latest frame is published.
    Each AI module subscribes to the frame bus instead of running sequentially.
    """
    def __init__(self, max_history=10):
        self.lock = threading.Lock()
        self.latest_frame = None
        self.latest_metadata = None
        self.history_queue = deque(maxlen=max_history)
        self.subscribers = {}
        self.cond = threading.Condition(self.lock)
        
    def publish(self, frame, metadata=None):
        """Publish a new frame to the bus."""
        import queue
        with self.cond:
            if metadata is None:
                metadata = {}
            metadata["timestamp_ms"] = int(time.time() * 1000)
            
            payload = {
                "frame": frame,
                "metadata": metadata
            }
            self.latest_frame = frame
            self.latest_metadata = metadata
            self.history_queue.append(payload)
            
            # Push to all subscriber queues
            for topic_subs in self.subscribers.values():
                for q in topic_subs:
                    try:
                        q.put_nowait(payload)
                    except queue.Full:
                        try:
                            q.get_nowait() # Drop oldest
                            q.put_nowait(payload)
                        except:
                            pass
            
            # Notify all sleeping subscribers (alternative to queue get)
            self.cond.notify_all()
            
    def subscribe(self, topic):
        """
        Subscribe to the frame bus.
        Currently, since it's a simple bus, topic might just be 'camera'.
        Returns a queue-like interface or we can just let subscribers call get_latest.
        For an event-driven approach, we can return a unique subscriber ID or queue.
        """
        import queue
        sub_id = id(topic)
        with self.lock:
            if topic not in self.subscribers:
                self.subscribers[topic] = []
            
            q = queue.Queue(maxsize=1) # Keep only the latest frame to reduce lag
            self.subscribers[topic].append(q)
            return q
            
    def get_latest(self):
        """Get the latest frame and metadata immediately without waiting."""
        with self.lock:
            return self.latest_frame, self.latest_metadata
            
    def wait_for_next_frame(self, timeout=None):
        """Wait for the next frame to be published."""
        with self.cond:
            self.cond.wait(timeout=timeout)
            return self.latest_frame, self.latest_metadata

# Global instance
frame_bus = FrameBus()
