import uuid
from typing import List
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db, record_audit_log, require_permission
from app.core.exceptions.handlers import ResourceNotFoundException
from app.core.security.hashing import compute_sha256
from app.db.models import DigitalSignature, Document, Evidence, User
from app.modules.signatures.schemas import (
    SignatureCreate,
    SignatureResponse,
    SignatureVerifyRequest,
)

router = APIRouter(prefix="/signatures", tags=["Digital Signatures"])


@router.get("/{resource_id}", response_model=List[SignatureResponse])
async def list_signatures_for_resource(
    resource_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(DigitalSignature).filter_by(resource_id=resource_id).order_by(DigitalSignature.signed_at.desc())
    )
    return result.scalars().all()


@router.post("", response_model=SignatureResponse, status_code=status.HTTP_201_CREATED)
async def sign_resource(
    req: SignatureCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("sign")),
):
    signed_payload = f"{req.resource_type}:{req.resource_id}:{current_user.id}:{datetime.now(timezone.utc).isoformat()}".encode()
    signed_hash = compute_sha256(signed_payload)
    sig_ref = f"SIG-{req.signature_type.upper()}-{uuid.uuid4().hex[:8].upper()}"

    sig = DigitalSignature(
        resource_type=req.resource_type,
        resource_id=req.resource_id,
        signer_id=current_user.id,
        signature_type=req.signature_type,
        signature_reference=sig_ref,
        signed_hash=signed_hash,
        status="VALID",
    )
    db.add(sig)

    await record_audit_log(
        db=db,
        actor_id=current_user.id,
        actor_role=current_user.role,
        action="DIGITAL_SIGNATURE_APPLIED",
        resource_type=req.resource_type,
        resource_id=req.resource_id,
        result="SUCCESS",
        metadata={
            "signature_type": req.signature_type,
            "signature_ref": sig_ref,
            "signed_hash": signed_hash,
        },
    )
    await db.commit()
    await db.refresh(sig)
    return sig


@router.post("/verify")
async def verify_signature(
    req: SignatureVerifyRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(DigitalSignature).filter_by(id=req.signature_id))
    sig = result.scalars().first()
    if not sig:
        raise ResourceNotFoundException("DigitalSignature", req.signature_id)

    is_valid = sig.status == "VALID"
    return {
        "signature_id": sig.id,
        "valid": is_valid,
        "signature_reference": sig.signature_reference,
        "signer_id": sig.signer_id,
        "signed_at": sig.signed_at.isoformat(),
        "status": sig.status,
    }
