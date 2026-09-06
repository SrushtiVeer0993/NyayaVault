import logging
import hashlib
import random
import httpx
from typing import Any, Dict, List, Optional
from app.config.settings import settings

logger = logging.getLogger("nyayavault.qdrant")


class QdrantService:
    """Vector Database Service wrapping Qdrant REST/gRPC API with graceful fallback"""

    def __init__(self):
        self.url = settings.QDRANT_URL.rstrip("/")
        self.api_key = settings.QDRANT_API_KEY
        self.documents_collection = settings.QDRANT_COLLECTION_DOCUMENTS
        self.security_collection = settings.QDRANT_COLLECTION_SECURITY
        self.vector_size = settings.QDRANT_VECTOR_SIZE
        self.embedding_model_name = settings.EMBEDDING_MODEL
        self._model = None

    def _get_headers(self) -> Dict[str, str]:
        headers = {"Content-Type": "application/json"}
        if self.api_key:
            headers["api-key"] = self.api_key
        return headers

    def generate_embedding(self, text: str) -> List[float]:
        """Generates embedding vector. Uses sentence-transformers if available, else deterministic mock vector."""
        if settings.AI_MODE != "mock":
            try:
                if self._model is None:
                    from sentence_transformers import SentenceTransformer
                    self._model = SentenceTransformer(self.embedding_model_name)
                vec = self._model.encode(text).tolist()
                if len(vec) == self.vector_size:
                    return vec
            except Exception as e:
                logger.warning(f"Could not load sentence-transformers model ({e}). Using fallback vector.")

        # Deterministic fallback vector generation based on SHA-256 seed
        seed_bytes = hashlib.sha256(text.encode("utf-8")).digest()
        rng = random.Random(seed_bytes)
        raw_vec = [rng.uniform(-1.0, 1.0) for _ in range(self.vector_size)]
        norm = (sum(x * x for x in raw_vec)) ** 0.5 or 1.0
        return [x / norm for x in raw_vec]

    async def check_health(self) -> Dict[str, Any]:
        """Checks connection to Qdrant REST API"""
        try:
            async with httpx.AsyncClient(timeout=3.0) as client:
                res = await client.get(f"{self.url}/healthz", headers=self._get_headers())
                if res.status_code == 200:
                    return {
                        "status": "UP",
                        "qdrant_url": self.url,
                        "collections": [self.documents_collection, self.security_collection],
                        "details": res.json(),
                    }
        except Exception as e:
            logger.debug(f"Qdrant health check failed: {e}")
        return {
            "status": "OFFLINE_OR_MOCK",
            "qdrant_url": self.url,
            "collections": [self.documents_collection, self.security_collection],
            "mode": "fallback_in_memory",
        }

    async def init_collections(self) -> bool:
        """Auto-creates Qdrant vector collections on startup if not present"""
        headers = self._get_headers()
        async with httpx.AsyncClient(timeout=5.0) as client:
            for collection_name in [self.documents_collection, self.security_collection]:
                try:
                    res = await client.get(f"{self.url}/collections/{collection_name}", headers=headers)
                    if res.status_code != 200:
                        payload = {
                            "vectors": {
                                "size": self.vector_size,
                                "distance": "Cosine",
                            }
                        }
                        create_res = await client.put(
                            f"{self.url}/collections/{collection_name}",
                            json=payload,
                            headers=headers,
                        )
                        if create_res.status_code in (200, 201):
                            logger.info(f"Qdrant collection '{collection_name}' created successfully.")
                except Exception as e:
                    logger.info(f"Qdrant not reachable during collection init ({e}). Utilizing fallback mode.")
                    return False
        return True

    async def upsert_document_vector(
        self,
        document_id: str,
        title: str,
        text: str,
        case_id: Optional[str] = None,
        document_type: Optional[str] = None,
        classification: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> bool:
        """Upserts a document vector and payload into Qdrant"""
        vector = self.generate_embedding(f"{title}\n{text}")
        point_id = hashlib.md5(document_id.encode("utf-8")).hexdigest()

        payload = {
            "document_id": document_id,
            "title": title,
            "text_snippet": text[:500],
            "case_id": case_id or "",
            "document_type": document_type or "General",
            "classification": classification or "Restricted",
            "metadata": metadata or {},
        }

        headers = self._get_headers()
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                body = {
                    "points": [
                        {
                            "id": point_id,
                            "vector": vector,
                            "payload": payload,
                        }
                    ]
                }
                res = await client.put(
                    f"{self.url}/collections/{self.documents_collection}/points",
                    json=body,
                    headers=headers,
                )
                return res.status_code in (200, 201)
        except Exception as e:
            logger.debug(f"Document vector upsert skipped (Qdrant offline/mock mode): {e}")
            return True

    async def search_document_vectors(
        self,
        query_text: str,
        limit: int = 10,
        classification_filter: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """Performs vector similarity search in Qdrant"""
        vector = self.generate_embedding(query_text)
        headers = self._get_headers()

        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                body: Dict[str, Any] = {
                    "vector": vector,
                    "limit": limit,
                    "with_payload": True,
                }
                if classification_filter:
                    body["filter"] = {
                        "must": [
                            {
                                "key": "classification",
                                "match": {"value": classification_filter},
                            }
                        ]
                    }

                res = await client.post(
                    f"{self.url}/collections/{self.documents_collection}/points/search",
                    json=body,
                    headers=headers,
                )
                if res.status_code == 200:
                    data = res.json()
                    return data.get("result", [])
        except Exception as e:
            logger.debug(f"Qdrant search fallback due to offline status: {e}")

        return []


qdrant_service = QdrantService()
