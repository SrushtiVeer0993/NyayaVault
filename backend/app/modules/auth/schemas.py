from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field

from app.core.security.rbac import RoleEnum


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class SignupRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    full_name: str = Field(min_length=2, max_length=255)
    employee_id: str = Field(min_length=2, max_length=64)
    department: str = Field(min_length=2, max_length=128)
    designation: str = Field(min_length=2, max_length=128)
    posting_location: str = Field(min_length=2, max_length=255)
    justification: str = Field(min_length=10, max_length=2000)
    requested_role: RoleEnum
    supporting_document_name: Optional[str] = Field(default=None, max_length=255)


class RegistrationRequestResponse(BaseModel):
    id: str
    email: EmailStr
    full_name: str
    employee_id: str
    department: str
    designation: str
    posting_location: str
    justification: str
    requested_role: str
    supporting_document_name: Optional[str] = None
    status: str
    approved_by: Optional[str] = None
    approved_at: Optional[datetime] = None
    rejection_reason: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class RegistrationRejectionRequest(BaseModel):
    reason: str = Field(min_length=3, max_length=1000)


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: dict


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str
