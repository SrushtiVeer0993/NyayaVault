from enum import Enum
from typing import Dict, List, Set


class RoleEnum(str, Enum):
    INVESTIGATING_OFFICER = "Investigating Officer"
    FORENSIC_STAFF = "Forensic Staff"
    SENIOR_OFFICER = "Senior Officer"
    ADMINISTRATOR = "Administrator"


class PermissionEnum(str, Enum):
    VIEW = "view"
    UPLOAD = "upload"
    EDIT = "edit"
    DELETE = "delete"
    DOWNLOAD = "download"
    VERIFY = "verify"
    TRANSFER = "transfer"
    SIGN = "sign"
    GENERATE_CERTIFICATE = "generate_certificate"
    MANAGE_ACCESS = "manage_access"
    MANAGE_USERS = "manage_users"
    VIEW_SECURITY_EVENTS = "view_security_events"
    VIEW_AUDIT_LOGS = "view_audit_logs"


ROLE_PERMISSIONS_MAP: Dict[str, List[str]] = {
    RoleEnum.INVESTIGATING_OFFICER.value: [
        PermissionEnum.VIEW.value,
        PermissionEnum.UPLOAD.value,
        PermissionEnum.DOWNLOAD.value,
        PermissionEnum.VERIFY.value,
        PermissionEnum.TRANSFER.value,
        PermissionEnum.SIGN.value,
        PermissionEnum.GENERATE_CERTIFICATE.value,
    ],
    RoleEnum.FORENSIC_STAFF.value: [
        PermissionEnum.VIEW.value,
        PermissionEnum.UPLOAD.value,
        PermissionEnum.DOWNLOAD.value,
        PermissionEnum.VERIFY.value,
        PermissionEnum.SIGN.value,
        PermissionEnum.GENERATE_CERTIFICATE.value,
    ],
    RoleEnum.SENIOR_OFFICER.value: [
        PermissionEnum.VIEW.value,
        PermissionEnum.UPLOAD.value,
        PermissionEnum.DOWNLOAD.value,
        PermissionEnum.VERIFY.value,
        PermissionEnum.TRANSFER.value,
        PermissionEnum.SIGN.value,
        PermissionEnum.GENERATE_CERTIFICATE.value,
        PermissionEnum.VIEW_SECURITY_EVENTS.value,
        PermissionEnum.VIEW_AUDIT_LOGS.value,
    ],
    RoleEnum.ADMINISTRATOR.value: [
        PermissionEnum.VIEW.value,
        PermissionEnum.UPLOAD.value,
        PermissionEnum.EDIT.value,
        PermissionEnum.DELETE.value,
        PermissionEnum.DOWNLOAD.value,
        PermissionEnum.VERIFY.value,
        PermissionEnum.TRANSFER.value,
        PermissionEnum.SIGN.value,
        PermissionEnum.GENERATE_CERTIFICATE.value,
        PermissionEnum.MANAGE_ACCESS.value,
        PermissionEnum.MANAGE_USERS.value,
        PermissionEnum.VIEW_SECURITY_EVENTS.value,
        PermissionEnum.VIEW_AUDIT_LOGS.value,
    ],
}


def get_permissions_for_role(role_name: str) -> Set[str]:
    return set(ROLE_PERMISSIONS_MAP.get(role_name, []))
