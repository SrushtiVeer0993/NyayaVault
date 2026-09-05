from typing import List
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db, record_audit_log, require_permission
from app.core.exceptions.handlers import ResourceNotFoundException
from app.db.models import AIExtraction, AIReview, Document, User
from app.modules.ai.schemas import (
    AIExtractionResponse,
    AIReviewRequest,
    AIReviewResponse,
)

router = APIRouter(prefix="/ai", tags=["AI Intelligence & OCR"])


@router.get("/extractions/{document_id}", response_model=List[AIExtractionResponse])
async def get_document_ai_extractions(
    document_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(AIExtraction).filter_by(document_id=document_id).order_by(AIExtraction.created_at.desc())
    )
    return result.scalars().all()


@router.get("/reviews/pending", response_model=List[AIExtractionResponse])
async def list_pending_ai_reviews(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(AIExtraction).filter_by(review_required=True).order_by(AIExtraction.created_at.desc())
    )
    return result.scalars().all()


@router.post("/review/{extraction_id}", response_model=AIReviewResponse)
async def submit_human_review(
    extraction_id: str,
    req: AIReviewRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("verify")),
):
    ext_res = await db.execute(select(AIExtraction).filter_by(id=extraction_id))
    ext = ext_res.scalars().first()
    if not ext:
        raise ResourceNotFoundException("AIExtraction", extraction_id)

    final_class = req.reviewed_classification or ext.classification
    final_fields = req.reviewed_fields or ext.extracted_fields

    review = AIReview(
        extraction_id=extraction_id,
        document_id=ext.document_id,
        reviewer_id=current_user.id,
        original_classification=ext.classification,
        reviewed_classification=final_class,
        original_fields=ext.extracted_fields,
        reviewed_fields=final_fields,
        decision=req.decision,
        review_notes=req.review_notes,
    )
    db.add(review)

    # Update extraction
    ext.review_required = False
    ext.classification = final_class
    ext.extracted_fields = final_fields

    # Update document classification if modified
    doc_res = await db.execute(select(Document).filter_by(id=ext.document_id))
    doc = doc_res.scalars().first()
    if doc:
        doc.document_type = final_class

    await record_audit_log(
        db=db,
        actor_id=current_user.id,
        actor_role=current_user.role,
        action="HUMAN_IN_THE_LOOP_REVIEW",
        resource_type="ai_extraction",
        resource_id=extraction_id,
        case_id=doc.case_id if doc else None,
        result="SUCCESS",
        metadata={
            "original": ext.classification,
            "reviewed": final_class,
            "decision": req.decision,
        },
    )
    await db.commit()
    await db.refresh(review)
    return review
