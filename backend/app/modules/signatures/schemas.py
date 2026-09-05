from typing import Optional
from datetime import datetime
from pydantic import BaseModel


class SignatureCreate(BaseModel):
    resource_type: str  # document, evidence, custody_event
    resource_id: str
    signature_type: str = "Aadhaar-eSign"  # DSC, Aadhaar-eSign, Internal-PKI
    notes: Optional[str] = None


class SignatureResponse(BaseModel):
    id: str
    resource_type: str
    resource_id: str
    signer_id: str
    signature_type: str
    signature_reference: str
    signed_hash: str
    signed_at: datetime
    status: str

    class Config:
        from_attributes = True


class SignatureVerifyRequest(BaseModel):
    signature_id: str
    expected_hash: str
