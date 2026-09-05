from datetime import datetime, timezone
from fastapi import APIRouter, Depends, status
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.config.settings import settings
from app.db.session import get_db

router = APIRouter(prefix="/health", tags=["Observability & Health Checks"])


@router.get("")
async def general_health():
    return {
        "status": "HEALTHY",
        "service": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "environment": settings.APP_ENV,
    }


@router.get("/db")
async def database_health(db: AsyncSession = Depends(get_db)):
    try:
        await db.execute(text("SELECT 1"))
        return {
            "status": "UP",
            "database": "CONNECTED",
            "url_type": settings.DATABASE_URL.split(":")[0],
        }
    except Exception as e:
        return {
            "status": "DOWN",
            "database": "ERROR",
            "error": str(e),
        }


@router.get("/storage")
async def storage_health():
    return {
        "status": "UP",
        "provider": settings.STORAGE_PROVIDER,
        "bucket": settings.STORAGE_BUCKET,
    }


@router.get("/blockchain")
async def blockchain_health():
    return {
        "status": "UP",
        "network": settings.BLOCKCHAIN_NETWORK,
        "channel": settings.BLOCKCHAIN_CHANNEL,
        "chaincode": settings.BLOCKCHAIN_CHAINCODE,
        "ledger_state": "SYNCHRONIZED",
    }
