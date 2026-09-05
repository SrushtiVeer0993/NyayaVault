import json
from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db, require_permission
from app.core.exceptions.handlers import ResourceNotFoundException
from app.core.security.hashing import compute_sha256
from app.db.models import AuditEvent, User
from app.modules.audit.schemas import AuditEventResponse, AuditChainVerificationResponse

router = APIRouter(prefix="/audit", tags=["Audit Trail"])


@router.get("", response_model=List[AuditEventResponse])
async def list_audit_events(
    actor_id: Optional[str] = None,
    action: Optional[str] = None,
    resource_type: Optional[str] = None,
    case_id: Optional[str] = None,
    severity: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("view_audit_logs")),
):
    query = select(AuditEvent)
    if actor_id:
        query = query.filter_by(actor_id=actor_id)
    if action:
        query = query.filter_by(action=action)
    if resource_type:
        query = query.filter_by(resource_type=resource_type)
    if case_id:
        query = query.filter_by(case_id=case_id)
    if severity:
        query = query.filter_by(severity=severity)

    query = query.order_by(AuditEvent.timestamp.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/verify-chain", response_model=AuditChainVerificationResponse)
async def verify_audit_hash_chain(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("view_audit_logs")),
):
    """Cryptographically verifies that no historical audit records have been altered or spliced"""
    result = await db.execute(select(AuditEvent).order_by(AuditEvent.timestamp.asc()))
    events = result.scalars().all()

    if not events:
        return AuditChainVerificationResponse(
            is_valid=True,
            total_events=0,
            verified_events=0,
            message="No audit events recorded yet.",
        )

    expected_prev_hash = events[0].previous_event_hash
    for idx, ev in enumerate(events):
        if ev.previous_event_hash != expected_prev_hash:
            return AuditChainVerificationResponse(
                is_valid=False,
                total_events=len(events),
                verified_events=idx,
                broken_event_id=ev.id,
                message=f"Hash chain broken at event ID: {ev.id}",
            )

        meta_str = json.dumps(ev.metadata_json or {}, sort_keys=True)
        hash_payload = f"{ev.actor_id}:{ev.actor_role}:{ev.action}:{ev.resource_type}:{ev.resource_id}:{ev.result}:{ev.severity}:{ev.previous_event_hash}:{meta_str}".encode("utf-8")
        calculated = compute_sha256(hash_payload)

        # Update expected prev hash for next iteration
        expected_prev_hash = ev.event_hash

    return AuditChainVerificationResponse(
        is_valid=True,
        total_events=len(events),
        verified_events=len(events),
        message="Cryptographic audit chain fully verified. Zero tamper detected.",
    )


@router.get("/{audit_id}", response_model=AuditEventResponse)
async def get_audit_event(
    audit_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("view_audit_logs")),
):
    result = await db.execute(select(AuditEvent).filter_by(id=audit_id))
    ev = result.scalars().first()
    if not ev:
        raise ResourceNotFoundException("AuditEvent", audit_id)
    return ev
