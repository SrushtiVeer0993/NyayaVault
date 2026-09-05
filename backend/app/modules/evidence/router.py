from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db, record_audit_log, require_permission
from app.core.exceptions.handlers import ResourceNotFoundException
from app.core.security.hashing import compute_sha256
from app.db.models import Evidence, CustodyEvent, Case, User
from app.modules.evidence.schemas import (
    EvidenceCreate,
    EvidenceUpdate,
    CustodyTransferRequest,
    CustodyEventResponse,
    EvidenceResponse,
)

router = APIRouter(prefix="/evidence", tags=["Evidence & Chain of Custody"])


def _to_evidence_response(it: Evidence, cev_list: List[CustodyEvent]) -> EvidenceResponse:
    return EvidenceResponse(
        id=it.id,
        case_id=it.case_id,
        evidence_number=it.evidence_number,
        type=it.type,
        description=it.description,
        collected_by=it.collected_by,
        current_custodian=it.current_custodian,
        classification=it.classification,
        document_id=it.document_id,
        status=it.status,
        collected_at=it.collected_at,
        created_at=it.created_at,
        updated_at=it.updated_at,
        custody_events=[CustodyEventResponse.model_validate(c) for c in cev_list],
    )


@router.get("", response_model=List[EvidenceResponse])
async def list_evidence(
    case_id: Optional[str] = None,
    evidence_type: Optional[str] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = select(Evidence)
    if case_id:
        query = query.filter_by(case_id=case_id)
    if evidence_type:
        query = query.filter_by(type=evidence_type)
    if status_filter:
        query = query.filter_by(status=status_filter)

    query = query.order_by(Evidence.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    items = result.scalars().all()

    resp = []
    for it in items:
        cev_res = await db.execute(
            select(CustodyEvent).filter_by(evidence_id=it.id).order_by(CustodyEvent.timestamp.asc())
        )
        cev_list = cev_res.scalars().all()
        resp.append(_to_evidence_response(it, cev_list))
    return resp


@router.post("", response_model=EvidenceResponse, status_code=status.HTTP_201_CREATED)
async def create_evidence(
    ev_in: EvidenceCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("upload")),
):
    case_res = await db.execute(select(Case).filter_by(id=ev_in.case_id))
    if not case_res.scalars().first():
        raise ResourceNotFoundException("Case", ev_in.case_id)

    new_ev = Evidence(
        case_id=ev_in.case_id,
        evidence_number=ev_in.evidence_number,
        type=ev_in.type,
        description=ev_in.description,
        collected_by=ev_in.collected_by or current_user.full_name,
        current_custodian=ev_in.current_custodian or current_user.full_name,
        classification=ev_in.classification,
        document_id=ev_in.document_id,
        status="COLLECTED",
    )
    db.add(new_ev)
    await db.flush()

    # Create Genesis Custody Event
    prev_hash = compute_sha256(f"GENESIS_{new_ev.id}".encode())
    ev_hash = compute_sha256(f"COLLECTION:{new_ev.collected_by}:{prev_hash}".encode())

    initial_custody = CustodyEvent(
        evidence_id=new_ev.id,
        from_user="Scene of Crime / Seizure Point",
        to_user=new_ev.current_custodian,
        action="Collection",
        context=f"Initial evidence seizure and registration: {new_ev.description}",
        previous_event_hash=prev_hash,
        event_hash=ev_hash,
    )
    db.add(initial_custody)

    await record_audit_log(
        db=db,
        actor_id=current_user.id,
        actor_role=current_user.role,
        action="CREATE_EVIDENCE",
        resource_type="evidence",
        resource_id=new_ev.id,
        case_id=new_ev.case_id,
        result="SUCCESS",
        metadata={"evidence_number": new_ev.evidence_number, "type": new_ev.type},
    )
    await db.commit()
    await db.refresh(new_ev)

    return _to_evidence_response(new_ev, [initial_custody])


@router.get("/{evidence_id}", response_model=EvidenceResponse)
async def get_evidence(
    evidence_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Evidence).filter_by(id=evidence_id))
    it = result.scalars().first()
    if not it:
        raise ResourceNotFoundException("Evidence", evidence_id)

    cev_res = await db.execute(
        select(CustodyEvent).filter_by(evidence_id=it.id).order_by(CustodyEvent.timestamp.asc())
    )
    cev_list = cev_res.scalars().all()
    return _to_evidence_response(it, cev_list)


@router.post("/{evidence_id}/transfer", response_model=EvidenceResponse)
async def transfer_evidence_custody(
    evidence_id: str,
    req: CustodyTransferRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("transfer")),
):
    ev_res = await db.execute(select(Evidence).filter_by(id=evidence_id))
    ev = ev_res.scalars().first()
    if not ev:
        raise ResourceNotFoundException("Evidence", evidence_id)

    # Fetch last custody event to chain hashes
    last_cev_res = await db.execute(
        select(CustodyEvent).filter_by(evidence_id=evidence_id).order_by(CustodyEvent.timestamp.desc()).limit(1)
    )
    last_event = last_cev_res.scalars().first()
    previous_hash = last_event.event_hash if last_event else compute_sha256(b"GENESIS_CUSTODY")

    event_payload = f"TRANSFER:{ev.current_custodian}:{req.to_user}:{req.context}:{previous_hash}".encode()
    event_hash = compute_sha256(event_payload)

    from_user = ev.current_custodian
    ev.current_custodian = req.to_user
    ev.status = "TRANSFERRED"

    new_event = CustodyEvent(
        evidence_id=evidence_id,
        from_user=from_user,
        to_user=req.to_user,
        action="Transfer",
        context=req.context,
        signature_reference=req.signature_reference or f"SIG-CUSTODY-{current_user.employee_id}",
        previous_event_hash=previous_hash,
        event_hash=event_hash,
    )
    db.add(new_event)

    await record_audit_log(
        db=db,
        actor_id=current_user.id,
        actor_role=current_user.role,
        action="EVIDENCE_TRANSFER",
        resource_type="evidence",
        resource_id=evidence_id,
        case_id=ev.case_id,
        result="SUCCESS",
        metadata={"from": from_user, "to": req.to_user, "event_hash": event_hash},
    )
    await db.commit()
    await db.refresh(ev)

    cev_res = await db.execute(
        select(CustodyEvent).filter_by(evidence_id=ev.id).order_by(CustodyEvent.timestamp.asc())
    )
    cev_list = cev_res.scalars().all()
    return _to_evidence_response(ev, cev_list)


@router.get("/{evidence_id}/custody", response_model=List[CustodyEventResponse])
async def get_evidence_custody_history(
    evidence_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    cev_res = await db.execute(
        select(CustodyEvent).filter_by(evidence_id=evidence_id).order_by(CustodyEvent.timestamp.asc())
    )
    cev_list = cev_res.scalars().all()
    return [CustodyEventResponse.model_validate(c) for c in cev_list]
