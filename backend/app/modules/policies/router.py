from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db, record_audit_log, require_permission
from app.db.models import ABACPolicy, User
from app.modules.policies.engine import evaluate_abac_policy
from app.modules.policies.schemas import (
    ABACPolicyCreate,
    ABACPolicyResponse,
    ABACEvaluateRequest,
    ABACEvaluateResponse,
)

router = APIRouter(prefix="/policies", tags=["ABAC Policies"])


@router.get("", response_model=List[ABACPolicyResponse])
async def list_policies(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(ABACPolicy))
    return result.scalars().all()


@router.post("", response_model=ABACPolicyResponse, status_code=status.HTTP_201_CREATED)
async def create_policy(
    policy_in: ABACPolicyCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("manage_access")),
):
    pol = ABACPolicy(
        policy_id=policy_in.policy_id,
        name=policy_in.name,
        description=policy_in.description,
        effect=policy_in.effect,
        action=policy_in.action,
        resource_type=policy_in.resource_type,
        conditions=policy_in.conditions,
        is_active=policy_in.is_active,
    )
    db.add(pol)
    await record_audit_log(
        db=db,
        actor_id=current_user.id,
        actor_role=current_user.role,
        action="CREATE_ABAC_POLICY",
        resource_type="policy",
        resource_id=pol.policy_id,
        result="SUCCESS",
    )
    await db.commit()
    await db.refresh(pol)
    return pol


@router.post("/evaluate", response_model=ABACEvaluateResponse)
async def evaluate_policy_endpoint(
    req: ABACEvaluateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    res = await evaluate_abac_policy(
        user=current_user,
        action=req.action,
        resource_type=req.resource_type,
        resource=req.resource,
        context=req.context,
        db=db,
    )
    if not res.allowed:
        await record_audit_log(
            db=db,
            actor_id=current_user.id,
            actor_role=current_user.role,
            action="ABAC_ACCESS_DENIED",
            resource_type=req.resource_type,
            resource_id=req.resource.get("id"),
            result="DENIED",
            severity="WARNING",
            metadata={"reason": res.reason, "policy_id": res.policy_id},
        )
        await db.commit()
    return res


@router.delete("/{policy_id}")
async def delete_policy(
    policy_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("manage_access")),
):
    result = await db.execute(select(ABACPolicy).filter_by(policy_id=policy_id))
    pol = result.scalars().first()
    if not pol:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Policy not found")

    await db.delete(pol)
    await record_audit_log(
        db=db,
        actor_id=current_user.id,
        actor_role=current_user.role,
        action="DELETE_ABAC_POLICY",
        resource_type="policy",
        resource_id=policy_id,
        result="SUCCESS",
    )
    await db.commit()
    return {"message": f"Policy {policy_id} deleted."}
