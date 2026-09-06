from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import (
    get_current_user,
    get_db,
    record_audit_log,
    require_permission,
    security_scheme,
)
from app.core.exceptions.handlers import AuthenticationFailedException
from app.core.security.hashing import verify_password, get_password_hash
from app.core.security.jwt import create_access_token, create_refresh_token, decode_token
from app.db.models import RegistrationRequest, User
from app.core.security.rbac import RoleEnum
from app.modules.auth.schemas import (
    LoginRequest,
    TokenResponse,
    RefreshTokenRequest,
    ChangePasswordRequest,
    RegistrationRejectionRequest,
    RegistrationRequestResponse,
    SignupRequest,
)

router = APIRouter(prefix="/auth", tags=["Authentication"])

ROLE_CLEARANCE = {
    RoleEnum.INVESTIGATING_OFFICER.value: "Level 3",
    RoleEnum.FORENSIC_STAFF.value: "Level 3",
    RoleEnum.SENIOR_OFFICER.value: "Level 4",
}


async def require_authenticated_admin(
    credentials: HTTPAuthorizationCredentials = Depends(security_scheme),
    current_user: User = Depends(require_permission("manage_users")),
) -> User:
    if not credentials:
        raise AuthenticationFailedException("Authentication credentials were not provided.")
    return current_user


@router.post("/signup", response_model=RegistrationRequestResponse, status_code=status.HTTP_201_CREATED)
async def signup(req: SignupRequest, request: Request, db: AsyncSession = Depends(get_db)):
    existing_user = await db.execute(
        select(User).where(or_(User.email == req.email, User.employee_id == req.employee_id))
    )
    if existing_user.scalars().first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="An account already exists for these details.")

    existing_request = await db.execute(
        select(RegistrationRequest).where(
            or_(RegistrationRequest.email == req.email, RegistrationRequest.employee_id == req.employee_id),
            RegistrationRequest.status == "PENDING",
        )
    )
    if existing_request.scalars().first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="A registration request is already pending.")

    registration = RegistrationRequest(
        email=req.email,
        full_name=req.full_name,
        employee_id=req.employee_id,
        department=req.department,
        designation=req.designation,
        posting_location=req.posting_location,
        justification=req.justification,
        requested_role=req.requested_role.value,
        password_hash=get_password_hash(req.password),
        supporting_document_name=req.supporting_document_name,
    )
    db.add(registration)
    await db.flush()
    await record_audit_log(
        db=db,
        actor_id=None,
        actor_role="PUBLIC_APPLICANT",
        action="SUBMIT_REGISTRATION_REQUEST",
        resource_type="registration_request",
        resource_id=registration.id,
        ip_address=request.client.host if request.client else "127.0.0.1",
        metadata={"email": registration.email, "requested_role": registration.requested_role},
    )
    await db.commit()
    await db.refresh(registration)
    return registration


@router.get("/registration-requests", response_model=list[RegistrationRequestResponse])
async def list_registration_requests(
    request_status: str = "PENDING",
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_authenticated_admin),
):
    result = await db.execute(
        select(RegistrationRequest)
        .where(RegistrationRequest.status == request_status.upper())
        .order_by(RegistrationRequest.created_at.desc())
    )
    return result.scalars().all()


@router.post("/registration-requests/{request_id}/approve", response_model=RegistrationRequestResponse)
async def approve_registration_request(
    request_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_authenticated_admin),
):
    result = await db.execute(select(RegistrationRequest).filter_by(id=request_id))
    registration = result.scalars().first()
    if not registration:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Registration request not found.")
    if registration.status != "PENDING":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Registration request has already been reviewed.")

    duplicate = await db.execute(
        select(User).where(or_(User.email == registration.email, User.employee_id == registration.employee_id))
    )
    if duplicate.scalars().first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="An account already exists for this request.")

    new_user = User(
        email=registration.email,
        full_name=registration.full_name,
        employee_id=registration.employee_id,
        department=registration.department,
        designation=registration.designation,
        role=registration.requested_role,
        clearance_level=ROLE_CLEARANCE[registration.requested_role],
        password_hash=registration.password_hash,
        is_active=True,
    )
    db.add(new_user)
    registration.status = "APPROVED"
    registration.approved_by = current_user.id
    registration.approved_at = datetime.now(timezone.utc)
    await db.flush()
    await record_audit_log(
        db=db,
        actor_id=current_user.id,
        actor_role=current_user.role,
        action="APPROVE_REGISTRATION_REQUEST",
        resource_type="registration_request",
        resource_id=registration.id,
        metadata={"created_user_id": new_user.id, "role": new_user.role},
    )
    await db.commit()
    await db.refresh(registration)
    return registration


@router.post("/registration-requests/{request_id}/reject", response_model=RegistrationRequestResponse)
async def reject_registration_request(
    request_id: str,
    rejection: RegistrationRejectionRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_authenticated_admin),
):
    result = await db.execute(select(RegistrationRequest).filter_by(id=request_id))
    registration = result.scalars().first()
    if not registration:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Registration request not found.")
    if registration.status != "PENDING":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Registration request has already been reviewed.")

    registration.status = "REJECTED"
    registration.rejection_reason = rejection.reason
    await record_audit_log(
        db=db,
        actor_id=current_user.id,
        actor_role=current_user.role,
        action="REJECT_REGISTRATION_REQUEST",
        resource_type="registration_request",
        resource_id=registration.id,
        metadata={"reason": rejection.reason},
    )
    await db.commit()
    await db.refresh(registration)
    return registration


@router.post("/login", response_model=TokenResponse)
async def login(req: LoginRequest, request: Request, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).filter_by(email=req.email))
    user = result.scalars().first()

    if not user or not verify_password(req.password, user.password_hash):
        if not user:
            registration_result = await db.execute(
                select(RegistrationRequest)
                .where(RegistrationRequest.email == req.email)
                .order_by(RegistrationRequest.created_at.desc())
            )
            registration = registration_result.scalars().first()
            if registration and registration.status == "PENDING":
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Your registration request is pending administrator approval.",
                )
            if registration and registration.status == "REJECTED":
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Your registration request was rejected. Contact an administrator.",
                )
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
