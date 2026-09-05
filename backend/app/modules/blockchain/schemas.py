from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class BlockchainRecordResponse(BaseModel):
    id: str
    document_id: str
    version_id: str
    sha256: str
    transaction_id: str
    block_reference: str
    network: str
    channel: str
    status: str
    timestamp: datetime

    class Config:
        from_attributes = True


class RegisterHashRequest(BaseModel):
    document_id: str
    version_id: str
    sha256: str
