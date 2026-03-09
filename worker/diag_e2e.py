import requests
import time
import numpy as np
import cv2

def test_full_pipeline():
    # Node.js server port is usually 3000 as per .env
    url = "http://127.0.0.1:3000/api/v1/face/detect"


    img = np.zeros((480, 640, 3), dtype=np.uint8)
    _, img_encoded = cv2.imencode('.jpg', img)
    
    print(f"Testing Full E2E Pipeline via {url}...")
    
    for i in range(3):
        start = time.time()
        try:
            response = requests.post(
                url, 
                files={"file": ("frame.jpg", img_encoded.tobytes(), "image/jpeg")},
                params={"modes": "face"}
            )
            latency = (time.time() - start) * 1000
            print(f"Request {i+1}: Status {response.status_code}, E2E Latency: {latency:.2f}ms")
            if response.status_code == 200:
                res_data = response.json().get('data', {})
                print(f"  Worker Time: {res_data.get('metadata', {}).get('profiling', {}).get('total_pipeline_time')}s")
        except Exception as e:
            print(f"Request {i+1} failed: {e}")
            if "Connection refused" in str(e):
                print("  Trying port 5001...")
                url = "http://localhost:5001/api/v1/face/detect"

if __name__ == "__main__":
    test_full_pipeline()
