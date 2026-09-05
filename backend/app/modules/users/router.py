from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db, record_audit_log, require_permission
from app.core.exceptions.handlers import ResourceNotFoundException, AccessDeniedException
from app.core.security.hashing import get_password_hash
from app.db.models import User
from app.modules.users.schemas import (
    UserCreate,
    UserUpdate,
    UserStatusUpdate,
    UserResponse,
)

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("", response_model=List[UserResponse])
async def list_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    department: Optional[str] = None,
    role: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = select(User)
    if department:
        query = query.filter_by(department=department)
    if role:
        query = query.filter_by(role=role)
    query = query.offset(skip).limit(limit)

    result = await db.execute(query)
    return result.scalars().all()


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(User).filter_by(id=user_id))
    user = result.scalars().first()
    if not user:
        raise ResourceNotFoundException("User", user_id)
    return user


@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    user_in: UserCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("manage_users")),
):
    # Check duplicate email
    existing = await db.execute(select(User).filter_by(email=user_in.email))
    if existing.scalars().first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="User with this email already exists.")

    new_user = User(
        email=user_in.email,
        full_name=user_in.full_name,
        employee_id=user_in.employee_id,
        department=user_in.department,
        designation=user_in.designation,
        role=user_in.role,
        clearance_level=user_in.clearance_level,
        password_hash=get_password_hash(user_in.password),
    )
    db.add(new_user)
    await db.flush()

    await record_audit_log(
        db=db,
        actor_id=current_user.id,
        actor_role=current_user.role,
        action="CREATE_USER",
        resource_type="user",
        resource_id=new_user.id,
        result="SUCCESS",
        metadata={"created_email": new_user.email, "role": new_user.role},
    )
    await db.commit()
    await db.refresh(new_user)
    return new_user


@router.patch("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: str,
    user_in: UserUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("manage_users")),
):
    result = await db.execute(select(User).filter_by(id=user_id))
    user = result.scalars().first()
    if not user:
        raise ResourceNotFoundException("User", user_id)

    update_data = user_in.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        setattr(user, field, val)

    await record_audit_log(
        db=db,
        actor_id=current_user.id,
        actor_role=current_user.role,
        action="UPDATE_USER",
        resource_type="user",
        resource_id=user.id,
        result="SUCCESS",
        metadata={"fields_updated": list(update_data.keys())},
    )
    await db.commit()
    await db.refresh(user)
    return user


@router.patch("/{user_id}/status", response_model=UserResponse)
async def update_user_status(
    user_id: str,
    status_in: UserStatusUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("manage_users")),
):
    result = await db.execute(select(User).filter_by(id=user_id))
    user = result.scalars().first()
    if not user:
        raise ResourceNotFoundException("User", user_id)

    user.is_active = status_in.is_active

    await record_audit_log(
        db=db,
        actor_id=current_user.id,
        actor_role=current_user.role,
        action="DEACTIVATE_USER" if not status_in.is_active else "ACTIVATE_USER",
        resource_type="user",
        resource_id=user.id,
        result="SUCCESS",
        metadata={"is_active": status_in.is_active},
    )
    await db.commit()
    await db.refresh(user)
    return user


@router.delete("/{user_id}")
async def delete_user(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("manage_users")),
):
    result = await db.execute(select(User).filter_by(id=user_id))
    user = result.scalars().first()
    if not user:
        raise ResourceNotFoundException("User", user_id)

    await db.delete(user)
    await record_audit_log(
        db=db,
        actor_id=current_user.id,
        actor_role=current_user.role,
        action="DELETE_USER",
        resource_type="user",
        resource_id=user_id,
        result="SUCCESS",
    )
    await db.commit()
    return {"message": f"User {user_id} removed."}
