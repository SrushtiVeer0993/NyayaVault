"""Typed, metadata-only response contracts for operational analytics."""

from datetime import datetime
from typing import List

from pydantic import BaseModel, Field


class AnalyticsOverview(BaseModel):
    total_documents: int = Field(ge=0)
    active_cases: int = Field(ge=0)
    active_users: int = Field(ge=0)
    uploads_in_period: int = Field(ge=0)
    denied_access_attempts_in_period: int = Field(ge=0)
    security_events_in_period: int = Field(ge=0)


class DistributionItem(BaseModel):
    category: str
    count: int = Field(ge=0)


class TrendPoint(BaseModel):
    bucket: str
    count: int = Field(ge=0)


class IntegritySummary(BaseModel):
    verified: int = Field(ge=0)
    failed_or_mismatch: int = Field(ge=0)
    pending_or_unknown: int = Field(ge=0)


class RecentActivityCategory(BaseModel):
    category: str
    event_count: int = Field(ge=0)
    latest_occurred_at: datetime


class OperationalAnalyticsResponse(BaseModel):
    window_days: int
    window_start: datetime
    generated_at: datetime
    overview: AnalyticsOverview
    documents_by_type: List[DistributionItem]
    document_upload_trend: List[TrendPoint]
    cases_by_status: List[DistributionItem]
    evidence_by_status: List[DistributionItem]
    evidence_by_type: List[DistributionItem]
    custody_activity_trend: List[TrendPoint]
    integrity: IntegritySummary
    security_events_by_severity: List[DistributionItem]
    security_events_by_status: List[DistributionItem]
    security_event_trend: List[TrendPoint]
    activity_by_category: List[DistributionItem]
    activity_trend: List[TrendPoint]
    recent_activity_categories: List[RecentActivityCategory]
