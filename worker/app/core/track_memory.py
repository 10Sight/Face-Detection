import threading
from app.core.track_state import Track, TrackState

class TrackMemory:
    """
    Manages active Track objects and their states over time.
    Provides memory cache to skip heavy inference when track is stable.
    """
    def __init__(self, max_missing_age=30, event_queue=None):
        self.tracks = {}  # track_id -> Track
        self.lock = threading.Lock()
        self.max_missing_age = max_missing_age # frames
        self.event_queue = event_queue

    def update_tracks(self, current_detections):
        """
        Takes current frame detections or tracker outputs and updates the unified memory.
        current_detections format: list of dicts with track_id, bbox, etc.
        """
        with self.lock:
            active_ids = set()
            new_events = []
            updated_events = []
            
            for det in current_detections:
                tid = str(det.get("track_id")) if det.get("track_id") is not None else None
                if not tid: continue
                bbox = det.get("bbox")
                conf = det.get("confidence", 0.0)
                
                if tid not in self.tracks:
                    new_track = Track(tid, bbox, conf)
                    if "identity" in det: new_track.identity = det["identity"]
                    if "label" in det: new_track.label = det["label"]
                    if "state" in det: new_track.state = TrackState(det["state"])
                    if "embedding" in det: new_track.embedding = det["embedding"]
            
                    self.tracks[tid] = new_track
                    active_ids.add(tid)
                    new_events.append(new_track)
                else:
                    track = self.tracks[tid]
                    track.update(bbox, conf)
                    if "identity" in det: track.identity = det["identity"]
                    if "label" in det: track.label = det["label"]
                    if "embedding" in det: track.embedding = det["embedding"]
                    active_ids.add(tid)
                    updated_events.append(track)

            lost_events = []
            # Handle missed tracks
            for tid in list(self.tracks.keys()):
                if tid not in active_ids:
                    track = self.tracks[tid]
                    track.mark_missed()
                    if track.state == TrackState.LOST or track.misses > self.max_missing_age:
                        lost_events.append(track)
                        del self.tracks[tid]
                        
            result = {
                "new": new_events,
                "updated": updated_events,
                "lost": lost_events
            }
            
            # Phase 8: Delta Streaming Protocol integration
            if self.event_queue is not None:
                for t in new_events:
                    self.event_queue.put({"event": "track_created", "track_id": t.track_id, "bbox": t.bbox, "confidence": t.confidence})
                for t in updated_events:
                    payload = {"event": "track_updated", "track_id": t.track_id, "bbox": t.bbox, "confidence": t.confidence}
                    if hasattr(t, "identity") and t.identity: payload["identity"] = t.identity
                    self.event_queue.put(payload)
                for t in lost_events:
                    self.event_queue.put({"event": "track_lost", "track_id": t.track_id})
                    
            return result

    def get_track(self, track_id):
        with self.lock:
            return self.tracks.get(track_id)
            
    def get_all_tracks(self):
        with self.lock:
            return list(self.tracks.values())
            
    def update_track_metadata(self, track_id, metadata):
        """Update semantic engine metadata (emotions, mesh, posture, gestures) in memory."""
        with self.lock:
            if track_id in self.tracks:
                for k, v in metadata.items():
                    setattr(self.tracks[track_id], k, v)
