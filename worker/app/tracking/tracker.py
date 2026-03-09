from deep_sort_realtime.deepsort_tracker import DeepSort
import numpy as np
from collections import deque

class TrackerEngine:
    def __init__(self, max_age=100, n_init=1, max_cosine_distance=0.8, min_confidence=0.3, min_bbox_size=20):
        """
        Premium DeepSORT Tracker for high-stability identity tracking.
        Optimized for multi-face analysis with trajectory history and embedding normalization.
        """
        self.tracker = DeepSort(
            max_age=max_age,
            n_init=n_init,
            max_cosine_distance=max_cosine_distance,
            embedder=None
        )
        self.min_confidence = min_confidence
        self.min_bbox_size = min_bbox_size
        
        # Track history (trajectory) - max 30 frames
        self.track_history = {} # track_id: deque(maxlen=30)
        
        # Configuration for stability
        self.history_size = 30

    def _normalize_embeddings(self, embeds):
        """
        L2 Normalization for embeddings to improve cosine similarity accuracy.
        """
        if embeds is None: return None
        # Use numpy for high-performance vector normalization
        norms = np.linalg.norm(embeds, axis=1, keepdims=True)
        res = embeds / (norms + 1e-6)
        return np.nan_to_num(res, nan=0.0, posinf=1.0, neginf=-1.0)

    def update(self, detections, frame, embeds=None):
        """
        Updates the tracker with new detections and their embeddings.
        detections format: [ ([x,y,w,h], confidence, class), ... ]
        """
        if frame is None:
            return []

        # 1. Pipeline Filtering: Clean incoming detections
        filtered_dets = []
        filtered_embeds = []
        
        has_embeds = embeds is not None and len(embeds) > 0
        
        for i, det in enumerate(detections):
            bbox, conf, cls = det
            # Skip detections below confidence or size threshold
            if conf < self.min_confidence: continue
            if bbox[2] < self.min_bbox_size or bbox[3] < self.min_bbox_size: continue
            
            filtered_dets.append(det)
            if has_embeds and i < len(embeds):
                filtered_embeds.append(embeds[i])

        # 2. Embedding Preparation (Normalization)
        if filtered_embeds:
            # Convert to numpy array once for batch normalization
            norm_embeds = self._normalize_embeddings(np.array(filtered_embeds))
        else:
            # SAFE FALLBACK: If we have detections but NO embeddings (and no internal embedder),
            # we MUST provide a dummy array of correct shape to prevent DeepSort crash.
            if filtered_dets:
                # Use a small unit vector fallback to avoid division by zero in deep_sort_realtime distance math
                # Detect dimension from previous tracks or default to 512
                dim = 512
                if hasattr(self.tracker, 'tracker') and self.tracker.tracker.tracks:
                    for t in self.tracker.tracker.tracks:
                        if t.features:
                            dim = len(t.features[0])
                            break
                norm_embeds = np.zeros((len(filtered_dets), dim), dtype=np.float32)
                norm_embeds[:, 0] = 1.0
            else:
                norm_embeds = np.array([], dtype=np.float32).reshape(0, 512)

        # 3. Synchronize with DeepSORT Core
        try:
            # Ensure all values in filtered_dets are finite and have valid dimensions
            sanitized_dets = []
            final_embeds = []
            for i, d in enumerate(filtered_dets):
                box, conf, cls = d
                # box should be [L, T, W, H]
                if len(box) != 4: continue
                if not np.all(np.isfinite(box)) or not np.isfinite(conf):
                    continue
                # Ensure box has positive area
                if box[2] <= 0 or box[3] <= 0: continue
                sanitized_dets.append(d)
                if len(norm_embeds) > i:
                    final_embeds.append(norm_embeds[i])

            # Ensure final_embeds is correctly shaped
            if len(sanitized_dets) > 0:
                final_embeds = np.array(final_embeds, dtype=np.float32)
            else:
                final_embeds = np.array([], dtype=np.float32).reshape(0, 512)

            tracks = self.tracker.update_tracks(sanitized_dets, frame=frame, embeds=final_embeds)
        except Exception as e:
            # Shield application from internal tracker crashes
            from app.core.logging import logger as log
            log.error(f"Tracker Update Error: {e}")
            log.error(f"Sanitized Dets: {sanitized_dets}")
            log.error(f"Embeds Info: shape={norm_embeds.shape}, dtype={norm_embeds.dtype}")
            
            # EMERGENCY FALLBACK: If tracker fails, return raw detections as "pseudo-tracks" 
            # so the user at least sees boxes!
            active_tracks = []
            h, w = frame.shape[:2]
            for i, det in enumerate(sanitized_dets):
                box, conf, cls = det
                px1, py1, pw, ph = box
                # Normalize raw detections for the HUD fallback
                nx1, ny1, nx2, ny2 = px1/w, py1/h, (px1+pw)/w, (py1+ph)/h
                active_tracks.append({
                    "track_id": f"fb_{i}", 
                    "bbox": [float(nx1), float(ny1), float(nx2), float(ny2)],
                    "confidence": float(conf),
                    "class": cls,
                    "age": 1,
                    "time_since_update": 0,
                    "history": []
                })
            return active_tracks

        
        active_tracks = []
        current_active_ids = []
        for track in tracks:
            # Bridge short gaps: Allow tracks missing detection for up to 5 frames
            if track.time_since_update > 5:
                continue
            
            track_id = str(track.track_id)
            current_active_ids.append(track_id)
            
            # Coordinate conversion (Internal Tracking in Pixels)
            ltwh = track.to_ltwh()
            px1, py1, pw, ph = ltwh
            
            # Normalize for HUD / Frontend
            h, w = frame.shape[:2]
            nx1, ny1, nw, nh = px1/w, py1/h, pw/w, ph/h
            bbox = [float(nx1), float(ny1), float(nx1 + nw), float(ny1 + nh)]
            
            # 4. Trajectory History Management (Maintaining Normalized Centers)
            center_norm = (float(nx1 + nw/2), float(ny1 + nh/2))
            if track_id not in self.track_history:
                self.track_history[track_id] = deque(maxlen=self.history_size)
            self.track_history[track_id].append(center_norm)
            
            # 5. Rich Metadata Construction
            active_tracks.append({
                "track_id": track_id,
                "bbox": bbox,
                "confidence": float(track.get_det_conf()) if track.get_det_conf() else 0.0,
                "age": int(track.age),
                "time_since_update": int(track.time_since_update),
                "class": track.get_det_class(),
                "embedding": track.features[-1].tolist() if hasattr(track, 'features') and track.features else None,
                "history": list(self.track_history[track_id]) # Trajectory for path drawing
            })
            
        # 6. Memory Management: Clean up stale history to avoid memory leaks
        # Keep only history for IDs currently internally managed by DeepSORT to save RAM
        all_tracker_ids = {int(t.track_id) for t in tracks}
        stale_ids = [tid for tid in self.track_history if tid not in all_tracker_ids]
        for tid in stale_ids:
            del self.track_history[tid]

        return active_tracks
