from typing import Optional
from datetime import datetime
from pydantic import BaseModel


class IntegrityVerifyResponse(BaseModel):
    document_id: str
    version_id: str
    status: str  # VERIFIED / INTEGRITY_MISMATCH
    original_hash: str
    calculated_hash: str
    blockchain_tx_id: Optional[str] = None
    blockchain_block: Optional[str] = None
    last_verified_at: datetime
    is_tampered_simulated: bool = False
    details: Optional[str] = None


class TamperSimulationResponse(BaseModel):
    status: str  # INTEGRITY_MISMATCH
    original_hash: str
    calculated_hash: str
    simulated: bool = True
    message: str


class RestoreResponse(BaseModel):
    status: str  # VERIFIED
    restored_hash: str
    canonical_hash: str
    message: str
