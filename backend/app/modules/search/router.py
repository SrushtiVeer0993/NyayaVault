from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.db.models import SearchDocument, Document, User
from app.modules.search.schemas import SearchResponse, SearchResultItem

from app.integrations.qdrant_client import qdrant_service

router = APIRouter(prefix="/search", tags=["Search & Retrieval"])


@router.get("", response_model=SearchResponse)
async def search_documents(
    q: str = Query(..., min_length=1),
    mode: str = Query("hybrid", pattern="^(keyword|semantic|hybrid)$"),
    case_id: Optional[str] = None,

    document_type: Optional[str] = None,
    classification: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Vector Search Integration for Semantic/Hybrid modes
    vector_results = []
    if mode in ("semantic", "hybrid"):
        qdrant_hits = await qdrant_service.search_document_vectors(
            query_text=q,
            limit=limit,
            classification_filter=classification,
        )
        for hit in qdrant_hits:
            payload = hit.get("payload", {})
            doc_class = payload.get("classification", "Restricted")

            # ABAC Clearance Check
            if current_user.clearance_level == "Level 1" and doc_class not in ["Public", "Restricted"]:
                continue
            if current_user.clearance_level in ["Level 2", "Level 3"] and doc_class == "Top Secret":
                continue

            vector_results.append(
                SearchResultItem(
                    document_id=payload.get("document_id", "doc-vec-01"),
                    title=payload.get("title", "Vector Match Document"),
                    case_id=payload.get("case_id"),
                    document_type=payload.get("document_type", "General"),
                    classification=doc_class,
                    excerpt=payload.get("text_snippet", q),
                    score=round(hit.get("score", 0.95), 2),
                    match_type="semantic" if mode == "semantic" else "hybrid_vector",
                )
            )

    if mode == "semantic" and vector_results:
        return SearchResponse(total=len(vector_results), query=q, mode=mode, results=vector_results)

    query = select(SearchDocument)

    # Filter query text across title, content_text, tags
    search_pattern = f"%{q}%"
    query = query.filter(
        or_(
            SearchDocument.title.ilike(search_pattern),
            SearchDocument.content_text.ilike(search_pattern),
            SearchDocument.tags.ilike(search_pattern),
            SearchDocument.document_type.ilike(search_pattern),
        )
    )

    if case_id:
        query = query.filter_by(case_id=case_id)
    if document_type:
        query = query.filter_by(document_type=document_type)
    if classification:
        query = query.filter_by(classification=classification)

    # ABAC Filter: Never return documents higher than user clearance
    if current_user.clearance_level == "Level 1":
        query = query.filter(SearchDocument.classification.in_(["Public", "Restricted"]))
    elif current_user.clearance_level in ["Level 2", "Level 3"]:
        query = query.filter(SearchDocument.classification != "Top Secret")

    offset = (page - 1) * limit
    result = await db.execute(query.offset(offset).limit(limit))
    items = result.scalars().all()

    # Fallback to search directly in documents if search index is empty
    if not items and not vector_results:
        doc_query = select(Document).filter(
            or_(Document.title.ilike(search_pattern), Document.description.ilike(search_pattern))
        )
        if case_id:
            doc_query = doc_query.filter_by(case_id=case_id)
        if current_user.clearance_level == "Level 1":
            doc_query = doc_query.filter(Document.classification.in_(["Public", "Restricted"]))
        elif current_user.clearance_level in ["Level 2", "Level 3"]:
            doc_query = doc_query.filter(Document.classification != "Top Secret")
        doc_res = await db.execute(doc_query.limit(limit))
        docs = doc_res.scalars().all()

        results = [
            SearchResultItem(
                document_id=d.id,
                title=d.title,
                case_id=d.case_id,
                document_type=d.document_type,
                classification=d.classification,
                excerpt=d.description or f"Matched document title: {d.title}",
                score=0.88 if mode == "keyword" else 0.94,
                match_type=mode,
            )
            for d in docs
        ]
        return SearchResponse(total=len(results), query=q, mode=mode, results=results)

    results = list(vector_results)
    for it in items:
        if any(r.document_id == it.document_id for r in results):
            continue
        # Create excerpt around match
        idx = it.content_text.lower().find(q.lower())
        start = max(0, idx - 50)
        end = min(len(it.content_text), idx + 100)
        excerpt = ("..." if start > 0 else "") + it.content_text[start:end].strip() + ("..." if end < len(it.content_text) else "")

        results.append(
            SearchResultItem(
                document_id=it.document_id,
                title=it.title,
                case_id=it.case_id,
                document_type=it.document_type,
                classification=it.classification,
                excerpt=excerpt if idx != -1 else it.content_text[:120],
                score=0.96 if mode == "hybrid" else 0.91,
                match_type=mode,
            )
        )

    return SearchResponse(total=len(results), query=q, mode=mode, results=results)

