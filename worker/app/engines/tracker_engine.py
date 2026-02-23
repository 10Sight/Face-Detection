from deep_sort_realtime.deepsort_tracker import DeepSort
import numpy as np

class TrackerEngine:
    def __init__(self, max_age=30, n_init=3, max_cosine_distance=0.4):
        """
        DeepSORT Tracker for stable identity tracking.
        Using external embeddings (ArcFace).
        """
        self.tracker = DeepSort(
            max_age=max_age,
            n_init=n_init,
            max_cosine_distance=max_cosine_distance,
            embedder=None
        )

    def update(self, detections, frame, embeds=None):
        """
        Updates the tracker with new detections and their embeddings.
        detections format: [ ([x,y,w,h], confidence, class), ... ]
        """
        tracks = self.tracker.update_tracks(detections, frame=frame, embeds=embeds)
        
        active_tracks = []
        for track in tracks:
            if not track.is_confirmed() or track.time_since_update > 1:
                continue
            
            ltwh = track.to_ltwh()
            x1, y1, w, h = ltwh
            bbox = [int(x1), int(y1), int(x1 + w), int(y1 + h)]
            
            active_tracks.append({
                "track_id": int(track.track_id),
                "bbox": bbox,
                "confidence": float(track.get_det_conf()) if track.get_det_conf() else 0.0
            })
            
        return active_tracks
