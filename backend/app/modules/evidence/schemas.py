from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel


class EvidenceBase(BaseModel):
    case_id: str
    evidence_number: str
    type: str  # Digital Evidence, Physical, Document, Biological, Ballistic
    description: str
    collected_by: str
    current_custodian: str
    classification: str = "Confidential"
    document_id: Optional[str] = None


class EvidenceCreate(EvidenceBase):
    pass


class EvidenceUpdate(BaseModel):
    description: Optional[str] = None
    status: Optional[str] = None
    classification: Optional[str] = None


class CustodyTransferRequest(BaseModel):
    to_user: str
    context: str
    signature_reference: Optional[str] = None


class CustodyEventResponse(BaseModel):
    id: str
    evidence_id: str
    from_user: str
    to_user: str
    action: str
    timestamp: datetime
    context: Optional[str] = None
    signature_reference: Optional[str] = None
    previous_event_hash: str
    event_hash: str

    class Config:
        from_attributes = True


class EvidenceResponse(EvidenceBase):
    id: str
    status: str
    collected_at: datetime
    created_at: datetime
    updated_at: datetime
    custody_events: List[CustodyEventResponse] = []

    class Config:
        from_attributes = True
