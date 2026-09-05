from typing import Any, Dict, List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.models import User, ABACPolicy
from app.modules.policies.schemas import ABACEvaluateResponse

CLEARANCE_LEVELS = {"Level 1": 1, "Level 2": 2, "Level 3": 3, "Level 4": 4}


async def evaluate_abac_policy(
    user: User,
    action: str,
    resource_type: str,
    resource: Dict[str, Any],
    context: Optional[Dict[str, Any]],
    db: AsyncSession,
) -> ABACEvaluateResponse:
    # 1. Fetch active policies matching action and resource_type
    stmt = select(ABACPolicy).filter_by(action=action, resource_type=resource_type, is_active=True)
    res = await db.execute(stmt)
    policies = res.scalars().all()

    user_clearance = CLEARANCE_LEVELS.get(user.clearance_level, 1)

    # 2. Check document classification vs user clearance default rule
    doc_classification = resource.get("classification")
    if doc_classification == "Top Secret" and user_clearance < 4:
        return ABACEvaluateResponse(
            allowed=False,
            reason="Top Secret classification requires Level 4 clearance.",
            policy_id="POL-TOPSECRET-DEFENSE",
        )

    if doc_classification == "Confidential" and user_clearance < 2:
        return ABACEvaluateResponse(
            allowed=False,
            reason="Confidential classification requires minimum Level 2 clearance.",
            policy_id="POL-CONFIDENTIAL-DEFENSE",
        )

    # 3. Evaluate specific configured ABAC policies
    for pol in policies:
        conds = pol.conditions or {}

        # Check allowed roles condition
        allowed_roles = conds.get("allowed_roles")
        if allowed_roles and user.role not in allowed_roles:
            continue

        # Check department condition
        allowed_depts = conds.get("allowed_departments")
        if allowed_depts and user.department not in allowed_depts:
            continue

        # Check minimum clearance condition
        min_clearance = conds.get("min_clearance")
        if min_clearance:
            req_level = CLEARANCE_LEVELS.get(min_clearance, 1)
            if user_clearance < req_level:
                continue

        # Matched policy
        if pol.effect == "DENY":
            return ABACEvaluateResponse(
                allowed=False,
                reason=f"Explicitly denied by policy: {pol.name}",
                policy_id=pol.policy_id,
            )
        elif pol.effect == "ALLOW":
            return ABACEvaluateResponse(
                allowed=True,
                reason=f"Authorized under policy: {pol.name}",
                policy_id=pol.policy_id,
            )

    # Default fallback: allow if clearance is satisfied
    return ABACEvaluateResponse(
        allowed=True,
        reason="Default RBAC + Clearance rules satisfied",
        policy_id="POL-DEFAULT-ALLOW",
    )
