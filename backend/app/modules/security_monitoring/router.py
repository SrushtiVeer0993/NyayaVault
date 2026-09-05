from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db, record_audit_log, require_permission
from app.core.exceptions.handlers import ResourceNotFoundException
from app.db.models import SecurityEvent, SecurityAlert, User
from app.modules.security_monitoring.schemas import (
    SecurityEventResponse,
    SecurityAlertResponse,
    ResolveAlertRequest,
)

router = APIRouter(prefix="/security", tags=["Security Monitoring & Anomaly Detection"])


@router.get("/events", response_model=List[SecurityEventResponse])
async def list_security_events(
    event_type: Optional[str] = None,
    severity: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("view_security_events")),
):
    query = select(SecurityEvent)
    if event_type:
        query = query.filter_by(event_type=event_type)
    if severity:
        query = query.filter_by(severity=severity)
    query = query.order_by(SecurityEvent.detected_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/alerts", response_model=List[SecurityAlertResponse])
async def list_security_alerts(
    status_filter: Optional[str] = Query(None, alias="status"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("view_security_events")),
):
    query = select(SecurityAlert)
    if status_filter:
        query = query.filter_by(status=status_filter)
    query = query.order_by(SecurityAlert.created_at.desc())
    result = await db.execute(query)
    return result.scalars().all()


@router.post("/alerts/{alert_id}/resolve", response_model=SecurityAlertResponse)
async def resolve_security_alert(
    alert_id: str,
    req: ResolveAlertRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("view_security_events")),
):
    result = await db.execute(select(SecurityAlert).filter_by(id=alert_id))
    alert = result.scalars().first()
    if not alert:
        raise ResourceNotFoundException("SecurityAlert", alert_id)

    alert.status = "RESOLVED"
    alert.resolved_at = datetime.now(timezone.utc)
    alert.resolved_by = current_user.id

    await record_audit_log(
        db=db,
        actor_id=current_user.id,
        actor_role=current_user.role,
        action="RESOLVE_SECURITY_ALERT",
        resource_type="security_alert",
        resource_id=alert_id,
        result="SUCCESS",
        metadata={"notes": req.notes},
    )
    await db.commit()
    await db.refresh(alert)
    return alert
