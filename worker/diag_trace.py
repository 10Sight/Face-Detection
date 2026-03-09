import requests
import time
import numpy as np
import cv2
import threading

def send_request(i):
    url = "http://localhost:8000/api/v1/detect"
    img = np.zeros((480, 640, 3), dtype=np.uint8)
    _, img_encoded = cv2.imencode('.jpg', img)
    start = time.time()
    try:
        response = requests.post(
            url, 
            files={"file": ("frame.jpg", img_encoded.tobytes(), "image/jpeg")},
            params={"modes": ["face"]}
        )
        latency = (time.time() - start) * 1000
        perf = response.json().get('result', {}).get('metadata', {}).get('profiling', {})
        print(f"Request {i}: Status {response.status_code}, E2E Latency: {latency:.2f}ms, Worker Profiling: {perf}")
    except Exception as e:
        print(f"Request {i} failed: {e}")

def main():
    threads = []
    print("Sending 5 concurrent requests...")
    for i in range(5):
        t = threading.Thread(target=send_request, args=(i,))
        threads.append(t)
        t.start()
    
    for t in threads:
        t.join()

if __name__ == "__main__":
    main()
