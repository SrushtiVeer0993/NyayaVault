from typing import Any, Dict, List, Optional
from datetime import datetime
from pydantic import BaseModel


class AuditEventResponse(BaseModel):
    id: str
    timestamp: datetime
    actor_id: Optional[str] = None
    actor_role: Optional[str] = None
    action: str
    resource_type: str
    resource_id: Optional[str] = None
    case_id: Optional[str] = None
    result: str
    severity: str
    ip_address: Optional[str] = None
    metadata_json: Optional[Dict[str, Any]] = None
    previous_event_hash: str
    event_hash: str

    class Config:
        from_attributes = True


class AuditChainVerificationResponse(BaseModel):
    is_valid: bool
    total_events: int
    verified_events: int
    broken_event_id: Optional[str] = None
    message: str
