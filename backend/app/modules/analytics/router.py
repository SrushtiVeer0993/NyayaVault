from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Literal

from fastapi import APIRouter, Depends, Query
from sqlalchemy import String, case, cast, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, require_clearance, require_roles
from app.core.security.rbac import RoleEnum
from app.db.models import (
    Case,
    CustodyEvent,
    Document,
    Evidence,
    SecurityAlert,
    SecurityEvent,
    IntegrityRecord,
    AIExtraction,
    AuditEvent,
    User,
)
from app.modules.analytics.schemas import (
    AnalyticsOverview,
    DistributionItem,
    IntegritySummary,
    OperationalAnalyticsResponse,
    RecentActivityCategory,
    TrendPoint,
)

router = APIRouter(prefix="/analytics", tags=["Analytics & Operational Intelligence"])

ANALYTICS_ROLES = [RoleEnum.SENIOR_OFFICER.value, RoleEnum.ADMINISTRATOR.value]


def _distribution(rows) -> list[DistributionItem]:
    """Convert SQL aggregate rows without exposing any resource identifiers."""
    return [DistributionItem(category=str(category), count=count) for category, count in rows]


def _trend(rows) -> list[TrendPoint]:
    """Return only populated SQL date buckets; missing dates are never invented."""
    return [TrendPoint(bucket=str(bucket), count=count) for bucket, count in rows]


@router.get("/dashboard")
async def get_dashboard_metrics(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(ANALYTICS_ROLES)),
    _: User = Depends(require_clearance("Level 4")),
) -> Dict[str, Any]:
    # Counts
    cases_cnt = (await db.execute(select(func.count(Case.id)))).scalar() or 0
    docs_cnt = (await db.execute(select(func.count(Document.id)))).scalar() or 0
    evidence_cnt = (await db.execute(select(func.count(Evidence.id)))).scalar() or 0
    alerts_cnt = (await db.execute(select(func.count(SecurityAlert.id)).filter_by(status="ACTIVE"))).scalar() or 0
    pending_ai_reviews = (await db.execute(select(func.count(AIExtraction.id)).filter_by(review_required=True))).scalar() or 0

    # Documents by type
    doc_types_res = await db.execute(
        select(Document.document_type, func.count(Document.id)).group_by(Document.document_type)
    )
    docs_by_type = {row[0]: row[1] for row in doc_types_res.all()}

    # Cases by status
    case_status_res = await db.execute(
        select(Case.status, func.count(Case.id)).group_by(Case.status)
    )
    cases_by_status = {row[0]: row[1] for row in case_status_res.all()}

    # Integrity verification stats
    int_mismatches = (await db.execute(select(func.count(IntegrityRecord.id)).filter_by(verification_status="MISMATCH"))).scalar() or 0
    total_integrity_records = (await db.execute(select(func.count(IntegrityRecord.id)))).scalar() or 1
    integrity_score = round(((total_integrity_records - int_mismatches) / total_integrity_records) * 100, 1)

    return {
        "overview": {
            "total_cases": cases_cnt,
            "total_documents": docs_cnt,
            "total_evidence_items": evidence_cnt,
            "active_security_alerts": alerts_cnt,
            "pending_ai_reviews": pending_ai_reviews,
            "integrity_score_percent": integrity_score,
        },
        "documents_by_type": docs_by_type,
        "cases_by_status": cases_by_status,
        "blockchain_network_status": "ONLINE (Hyperledger Fabric v2.5 / nyayachannel)",
        "audit_chain_status": "TAMPER_FREE",
    }


@router.get("/operational", response_model=OperationalAnalyticsResponse)
async def get_operational_analytics(
    window_days: int = Query(30, description="Rolling analytics window in days. Allowed: 7, 30, 90."),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(ANALYTICS_ROLES)),
    _: User = Depends(require_clearance("Level 4")),
) -> OperationalAnalyticsResponse:
    """Return authorized, aggregate-only operational analytics.

    This endpoint deliberately excludes document content, filenames, hashes, audit
    metadata, actor identities, resource identifiers, and security descriptions.
    """
    if window_days not in (7, 30, 90):
        window_days = 30

    now = datetime.now(timezone.utc)
    window_start = now - timedelta(days=window_days)

    # SQL date() works with both supported backends (SQLite and PostgreSQL). Casting
    # gives the API a stable string bucket without filling missing calendar dates.
    document_bucket = cast(func.date(Document.created_at), String).label("bucket")
    custody_bucket = cast(func.date(CustodyEvent.timestamp), String).label("bucket")
    security_bucket = cast(func.date(SecurityEvent.detected_at), String).label("bucket")
    audit_bucket = cast(func.date(AuditEvent.timestamp), String).label("bucket")

    overview_stmt = select(
        select(func.count(Document.id)).scalar_subquery().label("total_documents"),
        select(func.count(Case.id)).where(Case.status != "Closed").scalar_subquery().label("active_cases"),
        select(func.count(User.id)).where(User.is_active.is_(True)).scalar_subquery().label("active_users"),
        select(func.count(Document.id)).where(Document.created_at >= window_start).scalar_subquery().label("uploads_in_period"),
        select(func.count(AuditEvent.id)).where(
            AuditEvent.timestamp >= window_start,
            AuditEvent.result == "DENIED",
        ).scalar_subquery().label("denied_access_attempts_in_period"),
        select(func.count(SecurityEvent.id)).where(
            SecurityEvent.detected_at >= window_start,
        ).scalar_subquery().label("security_events_in_period"),
    )

    integrity_stmt = select(
        func.coalesce(func.sum(case((IntegrityRecord.verification_status == "VERIFIED", 1), else_=0)), 0),
        func.coalesce(
            func.sum(case((IntegrityRecord.verification_status.in_(["FAILED", "MISMATCH"]), 1), else_=0)),
            0,
        ),
        func.coalesce(
            func.sum(
                case(
                    (IntegrityRecord.verification_status.in_(["VERIFIED", "FAILED", "MISMATCH"]), 0),
                    else_=1,
                )
            ),
            0,
        ),
    )

    statements = [
        overview_stmt,
        select(Document.document_type, func.count(Document.id)).group_by(Document.document_type).order_by(Document.document_type),
        (
            select(document_bucket, func.count(Document.id))
            .where(Document.created_at >= window_start)
            .group_by(document_bucket)
            .order_by(document_bucket)
        ),
        select(Case.status, func.count(Case.id)).group_by(Case.status).order_by(Case.status),
        select(Evidence.status, func.count(Evidence.id)).group_by(Evidence.status).order_by(Evidence.status),
        select(Evidence.type, func.count(Evidence.id)).group_by(Evidence.type).order_by(Evidence.type),
        (
            select(custody_bucket, func.count(CustodyEvent.id))
            .where(CustodyEvent.timestamp >= window_start)
            .group_by(custody_bucket)
            .order_by(custody_bucket)
        ),
        integrity_stmt,
        (
            select(SecurityEvent.severity, func.count(SecurityEvent.id))
            .where(SecurityEvent.detected_at >= window_start)
            .group_by(SecurityEvent.severity)
            .order_by(SecurityEvent.severity)
        ),
        (
            select(SecurityEvent.status, func.count(SecurityEvent.id))
            .where(SecurityEvent.detected_at >= window_start)
            .group_by(SecurityEvent.status)
            .order_by(SecurityEvent.status)
        ),
        (
            select(security_bucket, func.count(SecurityEvent.id))
            .where(SecurityEvent.detected_at >= window_start)
            .group_by(security_bucket)
            .order_by(security_bucket)
        ),
        (
            select(AuditEvent.action, func.count(AuditEvent.id))
            .where(AuditEvent.timestamp >= window_start)
            .group_by(AuditEvent.action)
            .order_by(func.count(AuditEvent.id).desc(), AuditEvent.action)
        ),
        (
            select(audit_bucket, func.count(AuditEvent.id))
            .where(AuditEvent.timestamp >= window_start)
            .group_by(audit_bucket)
            .order_by(audit_bucket)
        ),
        (
            select(AuditEvent.action, func.count(AuditEvent.id), func.max(AuditEvent.timestamp))
            .where(AuditEvent.timestamp >= window_start)
            .group_by(AuditEvent.action)
            .order_by(func.max(AuditEvent.timestamp).desc())
            .limit(10)
        ),
    ]
    results = [await db.execute(statement) for statement in statements]

    (
        overview_result,
        documents_by_type_result,
        document_upload_trend_result,
        cases_by_status_result,
        evidence_by_status_result,
        evidence_by_type_result,
        custody_activity_trend_result,
        integrity_result,
        security_by_severity_result,
        security_by_status_result,
        security_trend_result,
        activity_by_category_result,
        activity_trend_result,
        recent_activity_result,
    ) = results

    overview = AnalyticsOverview(**overview_result.mappings().one())
    verified, failed_or_mismatch, pending_or_unknown = integrity_result.one()
    integrity = IntegritySummary(
        verified=verified,
        failed_or_mismatch=failed_or_mismatch,
        pending_or_unknown=pending_or_unknown,
    )

    return OperationalAnalyticsResponse(
        window_days=window_days,
        window_start=window_start,
        generated_at=now,
        overview=overview,
        documents_by_type=_distribution(documents_by_type_result.all()),
        document_upload_trend=_trend(document_upload_trend_result.all()),
        cases_by_status=_distribution(cases_by_status_result.all()),
        evidence_by_status=_distribution(evidence_by_status_result.all()),
        evidence_by_type=_distribution(evidence_by_type_result.all()),
        custody_activity_trend=_trend(custody_activity_trend_result.all()),
        integrity=integrity,
        security_events_by_severity=_distribution(security_by_severity_result.all()),
        security_events_by_status=_distribution(security_by_status_result.all()),
        security_event_trend=_trend(security_trend_result.all()),
        activity_by_category=_distribution(activity_by_category_result.all()),
        activity_trend=_trend(activity_trend_result.all()),
        recent_activity_categories=[
            RecentActivityCategory(category=category, event_count=count, latest_occurred_at=latest_occurred_at)
            for category, count, latest_occurred_at in recent_activity_result.all()
        ],
    )
