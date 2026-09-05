from typing import Any, Dict, List, Optional
from datetime import datetime
from pydantic import BaseModel


class AIExtractionResponse(BaseModel):
    id: str
    document_id: str
    version_id: str
    model_version: str
    classification: str
    classification_confidence: float
    extracted_fields: Optional[Dict[str, Any]] = None
    raw_text: Optional[str] = None
    review_required: bool
    created_at: datetime

    class Config:
        from_attributes = True


class AIReviewRequest(BaseModel):
    decision: str = "ACCEPTED"  # ACCEPTED, MODIFIED, REJECTED
    reviewed_classification: Optional[str] = None
    reviewed_fields: Optional[Dict[str, Any]] = None
    review_notes: Optional[str] = None


class AIReviewResponse(BaseModel):
    id: str
    extraction_id: str
    document_id: str
    reviewer_id: str
    original_classification: str
    reviewed_classification: str
    decision: str
    review_notes: Optional[str] = None
    reviewed_at: datetime

    class Config:
        from_attributes = True
