import asyncio
import websockets
import json

async def test_ws():
    uri = "ws://127.0.0.1:8000/api/v1/stream/ws/perceive"
    try:
        async with websockets.connect(uri) as websocket:
            print(f"Connected to {uri}")
            frame = b'\xff\xd8\xff\xd9' # Empty JPEG
            await websocket.send(frame)
            print("Sent frame.")
            response = await asyncio.wait_for(websocket.recv(), timeout=5.0)
            data = json.loads(response)
            print(f"Received state: {list(data.keys())}")
            print("WS Test SUCCESS")
    except Exception as e:
        print(f"WS Test FAILED: {e}")

if __name__ == "__main__":
    asyncio.run(test_ws())
