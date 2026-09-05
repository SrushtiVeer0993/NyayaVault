from typing import Any, Optional
from fastapi import Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError


class NyayaVaultException(Exception):
    def __init__(self, code: str, message: str, status_code: int = status.HTTP_400_BAD_REQUEST, details: Optional[Any] = None):
        self.code = code
        self.message = message
        self.status_code = status_code
        self.details = details
        super().__init__(message)


class AccessDeniedException(NyayaVaultException):
    def __init__(self, message: str = "You are not authorized to access this resource.", policy_id: Optional[str] = None):
        super().__init__(
            code="ACCESS_DENIED",
            message=message,
            status_code=status.HTTP_403_FORBIDDEN,
            details={"policy_id": policy_id} if policy_id else None
        )


class ResourceNotFoundException(NyayaVaultException):
    def __init__(self, resource_type: str, resource_id: Any):
        super().__init__(
            code="NOT_FOUND",
            message=f"{resource_type} with identifier '{resource_id}' was not found.",
            status_code=status.HTTP_404_NOT_FOUND,
        )


class AuthenticationFailedException(NyayaVaultException):
    def __init__(self, message: str = "Invalid credentials or session expired."):
        super().__init__(
            code="AUTHENTICATION_FAILED",
            message=message,
            status_code=status.HTTP_401_UNAUTHORIZED,
        )


class IntegrityMismatchException(NyayaVaultException):
    def __init__(self, original_hash: str, calculated_hash: str, message: str = "Document integrity verification failed."):
        super().__init__(
            code="INTEGRITY_MISMATCH",
            message=message,
            status_code=status.HTTP_409_CONFLICT,
            details={"original_hash": original_hash, "calculated_hash": calculated_hash}
        )


async def nyayavault_exception_handler(request: Request, exc: NyayaVaultException):
    request_id = getattr(request.state, "request_id", "req_system")
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {
                "code": exc.code,
                "message": exc.message,
                "request_id": request_id,
                "details": exc.details
            }
        },
    )


async def validation_exception_handler(request: Request, exc: RequestValidationError):
    request_id = getattr(request.state, "request_id", "req_system")
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "Invalid request parameters or payload.",
                "request_id": request_id,
                "details": exc.errors()
            }
        },
    )


async def generic_exception_handler(request: Request, exc: Exception):
    request_id = getattr(request.state, "request_id", "req_system")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": {
                "code": "INTERNAL_SERVER_ERROR",
                "message": "An unexpected internal error occurred.",
                "request_id": request_id
            }
        },
    )
