from enum import Enum
import time

class TrackState(Enum):
    NEW = "NEW"
    DETECTING = "DETECTING"
    TRACKING = "TRACKING"
    RECOGNIZING = "RECOGNIZING"
    VERIFIED = "VERIFIED"
    DRIFT_CHECK = "DRIFT_CHECK"
    LOST = "LOST"

class Track:
    """
    Track memory object that stores track data across frames.
    """
    def __init__(self, track_id, bbox, confidence):
        self.track_id = track_id
        self.bbox = bbox  # [x, y, w, h] or dict
        self.velocity = [0.0, 0.0]
        self.identity = None
        self.confidence = confidence
        self.state = TrackState.NEW
        self.last_seen_timestamp = time.time()
        
        # History
        self.history = []
        self.embedding = None
        self.gesture_state = None
        self.pose_state = None
        
        # Additional metadata for state machine
        self.age = 0
        self.hits = 1
        self.misses = 0

    def update(self, bbox, confidence):
        """Update track with new detection."""
        # Calculate naive velocity based on center point if bbox is [x1,y1,x2,y2]
        if isinstance(bbox, (list, tuple)) and len(bbox) == 4 and isinstance(self.bbox, (list, tuple)) and len(self.bbox) == 4:
            px1, py1, px2, py2 = self.bbox
            nx1, ny1, nx2, ny2 = bbox
            # Midpoints
            pcx, pcy = (px1 + px2) / 2, (py1 + py2) / 2
            ncx, ncy = (nx1 + nx2) / 2, (ny1 + ny2) / 2
            
            self.velocity = [ncx - pcx, ncy - pcy]

        self.bbox = bbox
        self.confidence = confidence
        self.last_seen_timestamp = time.time()
        self.hits += 1
        self.misses = 0
        self.age += 1
        
        # State machine logic
        if self.state == TrackState.NEW and self.hits >= 2:
            self.state = TrackState.TRACKING
            
        # Add to history
        if isinstance(bbox, (list, tuple)) and len(bbox) == 4:
            cx = (bbox[0] + bbox[2]) / 2
            cy = (bbox[1] + bbox[3]) / 2
            self.history.append([cx, cy])
            if len(self.history) > 10:
                self.history.pop(0)

    def mark_missed(self):
        """Mark track as missed in this frame."""
        self.misses += 1
        self.age += 1
        if self.misses > 5:
            self.state = TrackState.LOST

    def to_dict(self):
        """Serialize for streaming."""
        return {
            "track_id": self.track_id,
            "bbox": self.bbox,
            "confidence": self.confidence,
            "state": self.state.value,
            "identity": self.identity,
            "velocity": self.velocity,
            "last_seen_timestamp": self.last_seen_timestamp,
            "history": self.history
        }
