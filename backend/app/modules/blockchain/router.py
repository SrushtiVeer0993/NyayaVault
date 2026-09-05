from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db, record_audit_log, require_permission
from app.db.models import BlockchainTransaction, User
from app.modules.blockchain.schemas import BlockchainRecordResponse, RegisterHashRequest
from app.modules.blockchain.service import blockchain_service

router = APIRouter(prefix="/blockchain", tags=["Blockchain"])


@router.get("/transactions", response_model=List[BlockchainRecordResponse])
async def list_blockchain_transactions(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = select(BlockchainTransaction).order_by(BlockchainTransaction.timestamp.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/records/{version_id}", response_model=BlockchainRecordResponse)
async def get_blockchain_record(
    version_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(BlockchainTransaction).filter_by(version_id=version_id))
    tx = result.scalars().first()
    if not tx:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No blockchain record found for this version.")
    return tx


@router.post("/register", response_model=BlockchainRecordResponse)
async def register_document_hash(
    req: RegisterHashRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("verify")),
):
    tx_meta = await blockchain_service.register_hash(req.document_id, req.version_id, req.sha256)
    bc_tx = BlockchainTransaction(
        document_id=req.document_id,
        version_id=req.version_id,
        sha256=req.sha256,
        transaction_id=tx_meta["transaction_id"],
        block_reference=tx_meta["block_reference"],
        network=tx_meta["network"],
        channel=tx_meta["channel"],
        status="COMMITTED",
    )
    db.add(bc_tx)
    await record_audit_log(
        db=db,
        actor_id=current_user.id,
        actor_role=current_user.role,
        action="BLOCKCHAIN_HASH_REGISTRATION",
        resource_type="blockchain_tx",
        resource_id=bc_tx.transaction_id,
        result="SUCCESS",
        metadata={"tx_id": bc_tx.transaction_id, "sha256": req.sha256},
    )
    await db.commit()
    await db.refresh(bc_tx)
    return bc_tx
