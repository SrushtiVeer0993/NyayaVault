from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class CertificateCreateRequest(BaseModel):
    case_id: str
    document_id: Optional[str] = None
    evidence_id: Optional[str] = None


class CertificateResponse(BaseModel):
    id: str
    certificate_number: str
    case_id: str
    document_id: Optional[str] = None
    evidence_id: Optional[str] = None
    generated_by: str
    verification_hash: str
    created_at: datetime

    class Config:
        from_attributes = True
