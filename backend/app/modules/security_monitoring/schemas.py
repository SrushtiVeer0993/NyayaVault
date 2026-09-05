from typing import Optional
from datetime import datetime
from pydantic import BaseModel


class SecurityEventResponse(BaseModel):
    id: str
    user_id: Optional[str] = None
    event_type: str
    resource_id: Optional[str] = None
    case_id: Optional[str] = None
    risk_score: int
    severity: str
    description: str
    detected_at: datetime
    status: str

    class Config:
        from_attributes = True


class SecurityAlertResponse(BaseModel):
    id: str
    title: str
    description: str
    severity: str
    status: str
    event_id: Optional[str] = None
    created_at: datetime
    resolved_at: Optional[datetime] = None
    resolved_by: Optional[str] = None

    class Config:
        from_attributes = True


class ResolveAlertRequest(BaseModel):
    notes: Optional[str] = None
