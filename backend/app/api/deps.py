import json
import logging
from typing import AsyncGenerator, Callable, List, Optional
from fastapi import Depends, Header, HTTPException, Request, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions.handlers import (
    AccessDeniedException,
    AuthenticationFailedException,
)
from app.core.security.jwt import decode_token
from app.core.security.hashing import compute_sha256
from app.core.security.rbac import get_permissions_for_role
from app.db.models import User, AuditEvent, utc_now
from app.db.session import get_db

logger = logging.getLogger("nyayavault.auth")
security_scheme = HTTPBearer(auto_error=False)

CLEARANCE_ORDER = {
    "Level 1": 1,
    "Level 2": 2,
    "Level 3": 3,
    "Level 4": 4,
}


async def get_current_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    if not credentials:
        raise AuthenticationFailedException("Authentication credentials were not provided.")

    token = credentials.credentials
    payload = decode_token(token)
    if not payload:
        raise AuthenticationFailedException("Invalid or expired authentication token.")

    user_id = payload.get("sub")
    if not user_id:
        raise AuthenticationFailedException("Malformed token subject.")

    result = await db.execute(select(User).filter_by(id=user_id))
    user = result.scalars().first()
    if not user or not user.is_active:
        raise AuthenticationFailedException("User account is disabled or does not exist.")

    request.state.current_user = user
    return user


def require_permission(permission_code: str) -> Callable:
    async def permission_dependency(
        request: Request,
        current_user: User = Depends(get_current_user),
        db: AsyncSession = Depends(get_db),
    ) -> User:
        user_perms = get_permissions_for_role(current_user.role)
        if permission_code not in user_perms:
            # Audit access denial per PRD Section 26 & 41
            await record_audit_log(
                db=db,
                actor_id=current_user.id,
                actor_role=current_user.role,
                action=f"DENIED_{permission_code.upper()}",
                resource_type="system",
                resource_id=None,
                result="DENIED",
                severity="WARNING",
                metadata={"reason": f"Missing required permission: {permission_code}"},
            )
            raise AccessDeniedException(
                f"Role '{current_user.role}' lacks required permission '{permission_code}'."
            )
        return current_user

    return permission_dependency


def require_roles(allowed_roles: List[str]) -> Callable:
    async def role_dependency(
        request: Request,
        current_user: User = Depends(get_current_user),
        db: AsyncSession = Depends(get_db),
    ) -> User:
        if current_user.role not in allowed_roles:
            await record_audit_log(
                db=db,
                actor_id=current_user.id,
                actor_role=current_user.role,
                action="DENIED_ROLE_ACCESS",
                resource_type="system",
                resource_id=None,
                result="DENIED",
                severity="WARNING",
                metadata={"required_roles": allowed_roles},
            )
            raise AccessDeniedException(f"User role '{current_user.role}' not permitted.")
        return current_user

    return role_dependency


def require_clearance(min_clearance_level: str) -> Callable:
    async def clearance_dependency(
        request: Request,
        current_user: User = Depends(get_current_user),
    ) -> User:
        user_level = CLEARANCE_ORDER.get(current_user.clearance_level, 0)
        required_level = CLEARANCE_ORDER.get(min_clearance_level, 99)
        if user_level < required_level:
            raise AccessDeniedException(
                f"Insufficient clearance. Minimum required is '{min_clearance_level}'."
            )
        return current_user

    return clearance_dependency


async def record_audit_log(
    db: AsyncSession,
    actor_id: Optional[str],
    actor_role: Optional[str],
    action: str,
    resource_type: str,
    resource_id: Optional[str] = None,
    case_id: Optional[str] = None,
    result: str = "SUCCESS",
    severity: str = "INFO",
    ip_address: str = "127.0.0.1",
    user_agent: Optional[str] = None,
    metadata: Optional[dict] = None,
) -> AuditEvent:
    """Creates a cryptographically hashed, tamper-evident audit record chained to the previous event"""
    # Fetch latest audit event to obtain previous hash
    last_stmt = select(AuditEvent).order_by(AuditEvent.timestamp.desc()).limit(1)
    last_res = await db.execute(last_stmt)
    last_event = last_res.scalars().first()

    previous_hash = last_event.event_hash if last_event else compute_sha256(b"GENESIS_AUDIT_BLOCK_NYAYAVAULT_2026")

    meta_str = json.dumps(metadata or {}, sort_keys=True)
    hash_payload = f"{actor_id}:{actor_role}:{action}:{resource_type}:{resource_id}:{result}:{severity}:{previous_hash}:{meta_str}".encode("utf-8")
    current_hash = compute_sha256(hash_payload)
    event_timestamp = utc_now()
    audit_entry = AuditEvent(
        actor_id=actor_id,
        actor_role=actor_role,
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        case_id=case_id,
        result=result,
        severity=severity,
        ip_address=ip_address,
        user_agent=user_agent,
        metadata_json=metadata,
        previous_event_hash=previous_hash,
        event_hash=current_hash,
        timestamp=event_timestamp,
    )
    db.add(audit_entry)
    await db.flush()
    return audit_entry
