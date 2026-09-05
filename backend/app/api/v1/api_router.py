from fastapi import APIRouter

from app.modules.auth.router import router as auth_router
from app.modules.users.router import router as users_router
from app.modules.roles.router import router as roles_router
from app.modules.policies.router import router as policies_router
from app.modules.cases.router import router as cases_router
from app.modules.documents.router import router as documents_router
from app.modules.integrity.router import router as integrity_router
from app.modules.blockchain.router import router as blockchain_router
from app.modules.ai.router import router as ai_router
from app.modules.search.router import router as search_router
from app.modules.evidence.router import router as evidence_router
from app.modules.signatures.router import router as signatures_router
from app.modules.audit.router import router as audit_router
from app.modules.security_monitoring.router import router as security_router
from app.modules.certificates.router import router as certificates_router
from app.modules.notifications.router import router as notifications_router
from app.modules.analytics.router import router as analytics_router
from app.modules.health.router import router as health_router

api_v1_router = APIRouter(prefix="/api/v1")

api_v1_router.include_router(auth_router)
api_v1_router.include_router(users_router)
api_v1_router.include_router(roles_router)
api_v1_router.include_router(policies_router)
api_v1_router.include_router(cases_router)
api_v1_router.include_router(documents_router)
api_v1_router.include_router(integrity_router)
api_v1_router.include_router(blockchain_router)
api_v1_router.include_router(ai_router)
api_v1_router.include_router(search_router)
api_v1_router.include_router(evidence_router)
api_v1_router.include_router(signatures_router)
api_v1_router.include_router(audit_router)
api_v1_router.include_router(security_router)
api_v1_router.include_router(certificates_router)
api_v1_router.include_router(notifications_router)
api_v1_router.include_router(analytics_router)
api_v1_router.include_router(health_router)
