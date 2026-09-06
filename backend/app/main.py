import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError

from app.config.settings import settings
from app.core.exceptions.handlers import (
    NyayaVaultException,
    nyayavault_exception_handler,
    validation_exception_handler,
    generic_exception_handler,
)
from app.core.middleware.audit_middleware import CorrelationIdMiddleware
from app.db.session import AsyncSessionLocal
from app.db.init_db import init_db_schema, seed_db
from app.api.v1.api_router import api_v1_router
from app.integrations.qdrant_client import qdrant_service


logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("nyayavault.main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing database tables and seed data...")
    try:
        await init_db_schema()
        async with AsyncSessionLocal() as session:
            await seed_db(session)
        logger.info("NyayaVault backend initialized successfully.")

        # Initialize Qdrant Vector DB collections
        await qdrant_service.init_collections()
    except Exception as e:
        logger.error(f"Initialization error: {e}")
    yield
    logger.info("NyayaVault backend shutting down.")



app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Secure Digital Document Management System for Legal & Investigation Documents (NCRB / MHA)",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

# Middleware
app.add_middleware(CorrelationIdMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS or ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Exception Handlers
app.add_exception_handler(NyayaVaultException, nyayavault_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(Exception, generic_exception_handler)

# Include API Routes
app.include_router(api_v1_router)


@app.get("/", tags=["Root"])
async def root():
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "OPERATIONAL",
        "docs": "/docs",
        "api_v1": "/api/v1",
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
