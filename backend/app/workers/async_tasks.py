import logging
from datetime import datetime, timezone
from sqlalchemy import select
from app.db.session import AsyncSessionLocal
from app.db.models import (
    AIProcessingJob,
    AIExtraction,
    SearchDocument,
    Notification,
    Document,
)
from app.modules.ai.service import ai_service

logger = logging.getLogger("nyayavault.worker")


async def process_document_pipeline(
    document_id: str,
    version_id: str,
    file_bytes: bytes,
    filename: str,
    case_id: str,
):
    """Background worker pipeline executing AI OCR, classification, entity extraction, and search indexing"""
    async with AsyncSessionLocal() as db:
        try:
            logger.info(f"Starting AI pipeline for document {document_id}, version {version_id}")

            # 1. Create AI job
            job = AIProcessingJob(
                document_id=document_id,
                version_id=version_id,
                job_type="FULL_PIPELINE",
                status="PROCESSING",
                progress=20,
                started_at=datetime.now(timezone.utc),
            )
            db.add(job)
            await db.flush()

            # 2. Run OCR & Intelligence
            classification, confidence, fields, raw_text, review_req = ai_service.process_document(
                file_bytes, filename
            )

            job.progress = 70

            # 3. Save AI Extraction
            extraction = AIExtraction(
                document_id=document_id,
                version_id=version_id,
                model_version=ai_service.model_version,
                classification=classification,
                classification_confidence=confidence,
                extracted_fields=fields,
                raw_text=raw_text,
                review_required=review_req,
            )
            db.add(extraction)

            # 4. Save Search Index Document
            tags_str = ", ".join([f"{k}:{v}" for k, v in fields.items() if isinstance(v, (str, int))])
            search_doc = SearchDocument(
                document_id=document_id,
                version_id=version_id,
                case_id=case_id,
                title=filename,
                document_type=classification,
                classification="Confidential",
                content_text=f"{filename}\n{classification}\n{raw_text}\n{tags_str}",
                tags=tags_str,
            )
            db.add(search_doc)

            # 5. Notify if human review is required
            if review_req:
                doc_res = await db.execute(select(Document).filter_by(id=document_id))
                doc_obj = doc_res.scalars().first()
                owner_id = doc_obj.owner_id if doc_obj and doc_obj.owner_id else "usr_io_001"

                notif = Notification(
                    user_id=owner_id,
                    type="AI_REVIEW_REQUIRED",
                    title="AI Confidence Review Required",
                    message=f"Document '{filename}' classified as '{classification}' with confidence {confidence*100:.1f}%. Please review.",
                    resource_type="document",
                    resource_id=document_id,
                )
                db.add(notif)

            job.progress = 100
            job.status = "COMPLETED"
            job.completed_at = datetime.now(timezone.utc)

            await db.commit()
            logger.info(f"AI pipeline completed for document {document_id}")
        except Exception as e:
            logger.error(f"Error in document AI pipeline: {e}")
            await db.rollback()
