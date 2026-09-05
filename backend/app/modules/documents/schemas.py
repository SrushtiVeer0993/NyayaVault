from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel


class DocumentVersionResponse(BaseModel):
    id: str
    document_id: str
    version_number: int
    sha256_hash: str
    file_name: str
    file_size: int
    mime_type: str
    created_by: Optional[str] = None
    created_at: datetime
    change_reason: Optional[str] = None
    status: str

    class Config:
        from_attributes = True


class DocumentResponse(BaseModel):
    id: str
    case_id: str
    document_type: str
    title: str
    description: Optional[str] = None
    classification: str
    current_version_id: Optional[str] = None
    owner_id: Optional[str] = None
    status: str
    created_at: datetime
    updated_at: datetime
    latest_version: Optional[DocumentVersionResponse] = None

    class Config:
        from_attributes = True


class DocumentUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    classification: Optional[str] = None
    status: Optional[str] = None
