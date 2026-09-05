from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db, record_audit_log
from app.core.exceptions.handlers import AuthenticationFailedException
from app.core.security.hashing import verify_password, get_password_hash
from app.core.security.jwt import create_access_token, create_refresh_token, decode_token
from app.db.models import User
from app.modules.auth.schemas import (
    LoginRequest,
    TokenResponse,
    RefreshTokenRequest,
    ChangePasswordRequest,
)

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/login", response_model=TokenResponse)
async def login(req: LoginRequest, request: Request, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).filter_by(email=req.email))
    user = result.scalars().first()

    if not user or not verify_password(req.password, user.password_hash):
        await record_audit_log(
            db=db,
            actor_id=user.id if user else None,
            actor_role=user.role if user else "UNKNOWN",
            action="FAILED_LOGIN",
            resource_type="auth",
            result="FAILURE",
            severity="WARNING",
            ip_address=request.client.host if request.client else "127.0.0.1",
            metadata={"attempted_email": req.email},
        )
        await db.commit()
        raise AuthenticationFailedException("Invalid email or password.")

    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User account is deactivated.")

    # Update last login
    user.last_login = datetime.now(timezone.utc)
    await db.commit()

    claims = {
        "email": user.email,
        "name": user.full_name,
        "role": user.role,
        "department": user.department,
        "clearance_level": user.clearance_level,
    }
    access_token = create_access_token(subject=user.id, claims=claims)
    refresh_token = create_refresh_token(subject=user.id)

    await record_audit_log(
        db=db,
        actor_id=user.id,
        actor_role=user.role,
        action="LOGIN",
        resource_type="auth",
        result="SUCCESS",
        severity="INFO",
        ip_address=request.client.host if request.client else "127.0.0.1",
        metadata={"email": user.email},
    )
    await db.commit()

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        user={
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "employee_id": user.employee_id,
            "role": user.role,
            "department": user.department,
            "designation": user.designation,
            "clearance_level": user.clearance_level,
        },
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(req: RefreshTokenRequest, db: AsyncSession = Depends(get_db)):
    payload = decode_token(req.refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise AuthenticationFailedException("Invalid refresh token.")

    user_id = payload.get("sub")
    result = await db.execute(select(User).filter_by(id=user_id))
    user = result.scalars().first()
    if not user or not user.is_active:
        raise AuthenticationFailedException("User not found or disabled.")

    claims = {
        "email": user.email,
        "name": user.full_name,
        "role": user.role,
        "department": user.department,
        "clearance_level": user.clearance_level,
    }
    access_token = create_access_token(subject=user.id, claims=claims)
    new_refresh = create_refresh_token(subject=user.id)

    return TokenResponse(
        access_token=access_token,
        refresh_token=new_refresh,
        token_type="bearer",
        user={
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role,
            "department": user.department,
            "clearance_level": user.clearance_level,
        },
    )


@router.post("/logout")
async def logout(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    await record_audit_log(
        db=db,
        actor_id=current_user.id,
        actor_role=current_user.role,
        action="LOGOUT",
        resource_type="auth",
        result="SUCCESS",
        severity="INFO",
    )
    await db.commit()
    return {"message": "Successfully logged out."}


@router.get("/me")
async def get_current_user_profile(current_user: User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "employee_id": current_user.employee_id,
        "department": current_user.department,
        "designation": current_user.designation,
        "role": current_user.role,
        "clearance_level": current_user.clearance_level,
        "is_active": current_user.is_active,
        "last_login": current_user.last_login.isoformat() if current_user.last_login else None,
    }
