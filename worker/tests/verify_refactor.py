import cv2
import numpy as np
import os
import sys
import time

# Add the current directory to sys.path to import app modules
sys.path.append(os.getcwd())

try:
    from app.services.face_detection_service import process_face_pipeline
    
    # 1. Test Image (Portrait)
    img_path = 'test_face_v2.jpg'
    # Download a sample if not exists
    if not os.path.exists(img_path):
        import urllib.request
        url = "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=800"
        urllib.request.urlretrieve(url, img_path)

    with open(img_path, 'rb') as f:
        image_bytes = f.read()

    print("Phase 1: Initial Detection & Accuracy")
    start_time = time.time()
    # Warm up tracker (DeepSORT n_init=3)
    for _ in range(5):
        result = process_face_pipeline(image_bytes)
    end_time = time.time()
    
    print(f"Time taken: {end_time - start_time:.4f}s")
    print(f"Face Detected: {result['faceDetected']}")
    print(f"Total Faces: {result['totalFaces']}")
    
    if result['faceDetected']:
        f = result['faces'][0]
        print(f"Track ID: {f['track_id']}")
        print(f"Gender: {f['demographics']['gender']}, Age: {f['demographics']['age']}")
        print(f"Embedding Size: {len(f['embedding'])}")
        
        # 2. Test Temporal Smoothing
        print("\nPhase 2: Temporal Smoothing Test (Simulating 5 frames)")
        for i in range(5):
            res = process_face_pipeline(image_bytes)
            f = res['faces'][0]
            print(f"Frame {i+1}: ID {f['track_id']}, Age {f['demographics']['age']}, Gender {f['demographics']['gender']}")

        # 3. Test Embedding Consistency (Cosine Similarity)
        def cosine_similarity(v1, v2):
            return np.dot(v1, v2) / (np.linalg.norm(v1) * np.linalg.norm(v2))

        emb1 = result['faces'][0]['embedding']
        emb2 = res['faces'][0]['embedding']
        sim = cosine_similarity(emb1, emb2)
        print(f"\nPhase 3: Embedding Consistency")
        print(f"Similarity between same person frames: {sim:.4f}")
        if sim > 0.9:
            print("SUCCESS: High similarity for same person.")

    # 4. Multi-Face Test
    print("\nPhase 4: Multi-Face Interaction")
    group_url = "https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&q=80&w=800"
    group_path = 'test_group_v2.jpg'
    if not os.path.exists(group_path):
        import urllib.request
        urllib.request.urlretrieve(group_url, group_path)
    
    with open(group_path, 'rb') as f:
        group_bytes = f.read()
    
    group_result = process_face_pipeline(group_bytes)
    print(f"Group Photo - Detected: {group_result['totalFaces']} faces")
    for i, face in enumerate(group_result['faces']):
        print(f"Face {i+1}: ID {face['track_id']}, Gender: {face['gender']}, Age: {face['age']}")

except Exception as e:
    print("Verification Error:", e)
    import traceback
    traceback.print_exc()
