from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel


class CaseBase(BaseModel):
    case_number: str
    title: str
    case_type: str
    description: Optional[str] = None
    priority: str = "Medium"  # Low, Medium, High, Urgent
    sensitivity: str = "Confidential"  # Public, Restricted, Confidential, Top Secret
    department: str
    assigned_officer: Optional[str] = None


class CaseCreate(CaseBase):
    pass


class CaseUpdate(BaseModel):
    title: Optional[str] = None
    case_type: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None  # Active, Under Investigation, Pending Court, Closed
    priority: Optional[str] = None
    sensitivity: Optional[str] = None
    assigned_officer: Optional[str] = None


class CaseAssignRequest(BaseModel):
    user_id: str
    role_in_case: str = "Investigating Officer"


class CaseResponse(CaseBase):
    id: str
    status: str
    created_by: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    closed_at: Optional[datetime] = None

    class Config:
        from_attributes = True
