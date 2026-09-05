from typing import Any, Dict, Optional
from pydantic import BaseModel


class ABACPolicyCreate(BaseModel):
    policy_id: str
    name: str
    description: Optional[str] = None
    effect: str = "ALLOW"  # ALLOW / DENY
    action: str  # view, upload, delete, verify, etc.
    resource_type: str  # case, document, evidence
    conditions: Optional[Dict[str, Any]] = None
    is_active: bool = True


class ABACPolicyResponse(ABACPolicyCreate):
    id: str

    class Config:
        from_attributes = True


class ABACEvaluateRequest(BaseModel):
    action: str
    resource_type: str
    resource: Dict[str, Any]
    context: Optional[Dict[str, Any]] = None


class ABACEvaluateResponse(BaseModel):
    allowed: bool
    reason: str
    policy_id: Optional[str] = None
