from typing import List, Optional
from pydantic import BaseModel


class RoleResponse(BaseModel):
    name: str
    description: Optional[str] = None
    permissions: List[str] = []


class PermissionResponse(BaseModel):
    code: str
    name: str
    description: Optional[str] = None


class RolePermissionUpdate(BaseModel):
    permissions: List[str]
