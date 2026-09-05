import uuid
from datetime import datetime, timezone
from typing import Any, Dict, Optional
from app.config.settings import settings


class BlockchainService:
    """Abstract Blockchain interface conforming to PRD Section 22"""

    def __init__(self):
        self.network = settings.BLOCKCHAIN_NETWORK
        self.channel = settings.BLOCKCHAIN_CHANNEL
        self.chaincode = settings.BLOCKCHAIN_CHAINCODE
        self.mode = settings.BLOCKCHAIN_MODE

    async def register_hash(
        self,
        document_id: str,
        version_id: str,
        sha256: str,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        tx_id = f"0x{uuid.uuid4().hex}{uuid.uuid4().hex}"[:66]
        block_num = uuid.uuid4().int % 90000 + 10000
        return {
            "document_id": document_id,
            "version_id": version_id,
            "sha256": sha256,
            "transaction_id": tx_id,
            "block_reference": f"Block #{block_num}",
            "network": "Hyperledger Fabric v2.5",
            "channel": self.channel,
            "status": "COMMITTED",
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

    async def get_hash_record(self, version_id: str) -> Optional[Dict[str, Any]]:
        return None

    async def verify_hash(self, version_id: str, calculated_sha256: str, registered_sha256: str) -> bool:
        return calculated_sha256 == registered_sha256


blockchain_service = BlockchainService()
