import httpx
import time
from app.core.config import settings
from app.core.logging import logger as log

class RecognitionClient:
    """
    Client for querying the main server's identity database.
    Includes caching to prevent overwhelming the server.
    """
    def __init__(self):
        self.base_url = f"{settings.SERVER_URL}/api/v1/face"
        self.client = httpx.Client(timeout=1.0)
        self.cache = {} # embedding_hash -> (identity, timestamp)
        self.cache_ttl = 30 # 30 seconds (reduced from 5m for faster sync)
        
    def identify(self, embedding):
        """Query the server for a face identity match with caching."""
        return self._query_server(f"{settings.SERVER_URL}/api/v1/face/identify", embedding)

    def identify_object(self, embedding, category=None):
        """Query the server for an object identity match with caching."""
        return self._query_server(f"{settings.SERVER_URL}/api/v1/object/identify", embedding, category=category)

    def _query_server(self, url, embedding, category=None):
        """Internal helper for identification requests with caching."""
        if not embedding or len(embedding) == 0:
            return None
            
        # Create a stable hash of the embedding for caching
        emb_arr = [round(x, 3) for x in embedding]
        emb_hash = hash(tuple(emb_arr + ([category] if category else [])))
        
        now = time.time()
        if emb_hash in self.cache:
            identity, timestamp = self.cache[emb_hash]
            if now - timestamp < self.cache_ttl:
                return identity
        
        try:
            payload = {"embedding": embedding}
            if category: payload["category"] = category
            
            response = self.client.post(url, json=payload)
            
            identity = None
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    identity = data.get("data")
                    if identity and identity.get("name") != "Unknown":
                        # log.info(f"[Recognition] Successfully matched: {identity['name']}")
                        pass
                    else:
                        identity = None
            else:
                log.error(f"[Recognition] Server error for {url}: {response.status_code}")
                return None

            # Update cache
            self.cache[emb_hash] = (identity, now)
            return identity
            
        except Exception as e:
            log.error(f"[Recognition] Client identification error for {url}: {e}")
            return None
            
    def close(self):
        self.client.close()

# Singleton
recognition_client = RecognitionClient()
