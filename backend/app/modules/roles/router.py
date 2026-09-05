from typing import List
from fastapi import APIRouter, Depends, status
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db, record_audit_log, require_permission
from app.core.security.rbac import RoleEnum, ROLE_PERMISSIONS_MAP, get_permissions_for_role
from app.db.models import Role, Permission, RolePermission, User
from app.modules.roles.schemas import (
    RoleResponse,
    PermissionResponse,
    RolePermissionUpdate,
)

router = APIRouter(tags=["Roles & Permissions"])


@router.get("/roles", response_model=List[RoleResponse])
async def list_roles(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Role))
    roles = result.scalars().all()
    out = []
    for r in roles:
        # fetch permissions
        rp_res = await db.execute(select(RolePermission.permission_code).filter_by(role_name=r.name))
        perms = rp_res.scalars().all()
        out.append(RoleResponse(name=r.name, description=r.description, permissions=list(perms)))
    return out


@router.get("/permissions", response_model=List[PermissionResponse])
async def list_permissions(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Permission))
    perms = result.scalars().all()
    return [PermissionResponse(code=p.code, name=p.name, description=p.description) for p in perms]


@router.post("/roles/{role_name}/permissions", response_model=RoleResponse)
async def update_role_permissions(
    role_name: str,
    update_in: RolePermissionUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("manage_access")),
):
    # Remove existing role permissions
    await db.execute(delete(RolePermission).filter_by(role_name=role_name))
    
    # Add new ones
    for p_code in update_in.permissions:
        db.add(RolePermission(role_name=role_name, permission_code=p_code))

    await record_audit_log(
        db=db,
        actor_id=current_user.id,
        actor_role=current_user.role,
        action="UPDATE_ROLE_PERMISSIONS",
        resource_type="role",
        resource_id=role_name,
        result="SUCCESS",
        metadata={"permissions": update_in.permissions},
    )
    await db.commit()

    return RoleResponse(name=role_name, permissions=update_in.permissions)
