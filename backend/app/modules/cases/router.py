from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import (
    get_current_user,
    get_db,
    record_audit_log,
    require_permission,
    require_clearance,
)
from app.core.exceptions.handlers import ResourceNotFoundException, AccessDeniedException
from app.db.models import (
    Case,
    CaseAssignment,
    Document,
    Evidence,
    AuditEvent,
    User,
)
from app.modules.cases.schemas import (
    CaseCreate,
    CaseUpdate,
    CaseAssignRequest,
    CaseResponse,
)

router = APIRouter(prefix="/cases", tags=["Cases"])


@router.get("", response_model=List[CaseResponse])
async def list_cases(
    status_filter: Optional[str] = Query(None, alias="status"),
    case_type: Optional[str] = None,
    priority: Optional[str] = None,
    department: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = select(Case)
    if status_filter:
        query = query.filter_by(status=status_filter)
    if case_type:
        query = query.filter_by(case_type=case_type)
    if priority:
        query = query.filter_by(priority=priority)
    if department:
        query = query.filter_by(department=department)

    # ABAC: If user clearance is Level 1, filter out Confidential/Top Secret
    if current_user.clearance_level == "Level 1":
        query = query.filter(Case.sensitivity.in_(["Public", "Restricted"]))
    elif current_user.clearance_level in ["Level 2", "Level 3"]:
        query = query.filter(Case.sensitivity != "Top Secret")

    query = query.order_by(Case.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()


@router.post("", response_model=CaseResponse, status_code=status.HTTP_201_CREATED)
async def create_case(
    case_in: CaseCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("upload")),
):
    # Check duplicate case_number
    existing = await db.execute(select(Case).filter_by(case_number=case_in.case_number))
    if existing.scalars().first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Case number already registered.")

    new_case = Case(
        case_number=case_in.case_number,
        title=case_in.title,
        case_type=case_in.case_type,
        description=case_in.description,
        priority=case_in.priority,
        sensitivity=case_in.sensitivity,
        department=case_in.department,
        assigned_officer=case_in.assigned_officer or current_user.full_name,
        created_by=current_user.id,
    )
    db.add(new_case)
    await db.flush()

    # Assign creator as lead investigator
    assignment = CaseAssignment(
        case_id=new_case.id,
        user_id=current_user.id,
        role_in_case="Lead Investigator",
    )
    db.add(assignment)

    await record_audit_log(
        db=db,
        actor_id=current_user.id,
        actor_role=current_user.role,
        action="CREATE_CASE",
        resource_type="case",
        resource_id=new_case.id,
        case_id=new_case.id,
        result="SUCCESS",
        metadata={"case_number": new_case.case_number, "sensitivity": new_case.sensitivity},
    )
    await db.commit()
    await db.refresh(new_case)
    return new_case


@router.get("/{case_id}", response_model=CaseResponse)
async def get_case(
    case_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Case).filter_by(id=case_id))
    case_obj = result.scalars().first()
    if not case_obj:
        raise ResourceNotFoundException("Case", case_id)

    # ABAC Sensitivity enforcement
    if case_obj.sensitivity == "Top Secret" and current_user.clearance_level != "Level 4":
        raise AccessDeniedException("Case is Top Secret and requires Level 4 clearance.")

    return case_obj


@router.patch("/{case_id}", response_model=CaseResponse)
async def update_case(
    case_id: str,
    case_in: CaseUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("edit")),
):
    result = await db.execute(select(Case).filter_by(id=case_id))
    case_obj = result.scalars().first()
    if not case_obj:
        raise ResourceNotFoundException("Case", case_id)

    update_data = case_in.model_dump(exclude_unset=True)
    if "status" in update_data and update_data["status"] == "Closed":
        case_obj.closed_at = datetime.now(timezone.utc)

    for field, val in update_data.items():
        setattr(case_obj, field, val)

    await record_audit_log(
        db=db,
        actor_id=current_user.id,
        actor_role=current_user.role,
        action="UPDATE_CASE",
        resource_type="case",
        resource_id=case_id,
        case_id=case_id,
        result="SUCCESS",
        metadata={"updated_fields": list(update_data.keys())},
    )
    await db.commit()
    await db.refresh(case_obj)
    return case_obj


@router.post("/{case_id}/assign")
async def assign_officer(
    case_id: str,
    req: CaseAssignRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("manage_access")),
):
    case_res = await db.execute(select(Case).filter_by(id=case_id))
    case_obj = case_res.scalars().first()
    if not case_obj:
        raise ResourceNotFoundException("Case", case_id)

    user_res = await db.execute(select(User).filter_by(id=req.user_id))
    target_user = user_res.scalars().first()
    if not target_user:
        raise ResourceNotFoundException("User", req.user_id)

    assignment = CaseAssignment(
        case_id=case_id,
        user_id=req.user_id,
        role_in_case=req.role_in_case,
    )
    db.add(assignment)
    case_obj.assigned_officer = target_user.full_name

    await record_audit_log(
        db=db,
        actor_id=current_user.id,
        actor_role=current_user.role,
        action="ASSIGN_CASE_OFFICER",
        resource_type="case",
        resource_id=case_id,
        case_id=case_id,
        result="SUCCESS",
        metadata={"assigned_user_id": req.user_id, "officer_name": target_user.full_name},
    )
    await db.commit()
    return {"message": f"Assigned {target_user.full_name} to case {case_obj.case_number}"}


@router.get("/{case_id}/documents")
async def get_case_documents(
    case_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Document).filter_by(case_id=case_id))
    return result.scalars().all()


@router.get("/{case_id}/evidence")
async def get_case_evidence(
    case_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Evidence).filter_by(case_id=case_id))
    return result.scalars().all()


@router.get("/{case_id}/activity")
async def get_case_activity(
    case_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(AuditEvent).filter_by(case_id=case_id).order_by(AuditEvent.timestamp.desc()).limit(100)
    )
    return result.scalars().all()
