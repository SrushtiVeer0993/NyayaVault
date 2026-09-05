import logging
from datetime import datetime, timezone
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.base import Base
from app.db.session import engine
from app.db.models import (
    User,
    Role,
    Permission,
    RolePermission,
    ABACPolicy,
    Case,
    Document,
    DocumentVersion,
    StorageObject,
    Evidence,
    CustodyEvent,
    IntegrityRecord,
    BlockchainTransaction,
    SecurityEvent,
    SecurityAlert,
    Notification,
    SystemSetting,
)
from app.core.security.hashing import get_password_hash, compute_sha256
from app.core.security.rbac import RoleEnum, PermissionEnum, ROLE_PERMISSIONS_MAP

logger = logging.getLogger("nyayavault.init_db")


async def init_db_schema():
    """Initializes tables for SQLite or Postgres"""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def seed_db(db: AsyncSession):
    # Check if already seeded
    existing_user = await db.execute(select(User).filter_by(email="admin@nyayavault.gov.in"))
    if existing_user.scalars().first():
        logger.info("Database already seeded.")
        return

    logger.info("Seeding database with initial roles, users, permissions, and sample cases...")

    # 1. Seed Permissions
    permissions = [
        Permission(code=p.value, name=p.name.replace("_", " ").title(), description=f"Permission to {p.value}")
        for p in PermissionEnum
    ]
    db.add_all(permissions)
    await db.flush()

    # 2. Seed Roles and RolePermissions
    for role_name, perms in ROLE_PERMISSIONS_MAP.items():
        role = Role(name=role_name, description=f"System role for {role_name}")
        db.add(role)
        for perm_code in perms:
            rp = RolePermission(role_name=role_name, permission_code=perm_code)
            db.add(rp)
    await db.flush()

    # 3. Seed Users
    default_pw = get_password_hash("NyayaVault@2026")

    users = [
        User(
            id="usr_admin_001",
            email="admin@nyayavault.gov.in",
            full_name="Rajesh Kumar (IPS)",
            employee_id="DL-NCRB-2024-001",
            department="National Crime Records Bureau",
            designation="Director & Chief Administrator",
            role=RoleEnum.ADMINISTRATOR.value,
            clearance_level="Level 4",
            is_active=True,
            password_hash=default_pw,
        ),
        User(
            id="usr_io_001",
            email="investigator@nyayavault.gov.in",
            full_name="Inspector Vikram Shinde",
            employee_id="MH-CID-10842",
            department="Crime Investigation Department",
            designation="Senior Investigating Officer",
            role=RoleEnum.INVESTIGATING_OFFICER.value,
            clearance_level="Level 3",
            is_active=True,
            password_hash=default_pw,
        ),
        User(
            id="usr_forensic_001",
            email="forensics@nyayavault.gov.in",
            full_name="Dr. Ananya Roy",
            employee_id="CFSL-DEL-3381",
            department="Central Forensic Science Laboratory",
            designation="Senior Forensic Examiner",
            role=RoleEnum.FORENSIC_STAFF.value,
            clearance_level="Level 3",
            is_active=True,
            password_hash=default_pw,
        ),
        User(
            id="usr_senior_001",
            email="senior@nyayavault.gov.in",
            full_name="Kavita Deshmukh (SPS)",
            employee_id="MH-POL-0042",
            department="State Police Headquarters",
            designation="Superintendent of Police",
            role=RoleEnum.SENIOR_OFFICER.value,
            clearance_level="Level 4",
            is_active=True,
            password_hash=default_pw,
        ),
    ]
    db.add_all(users)
    await db.flush()

    # 4. Seed ABAC Policies
    policies = [
        ABACPolicy(
            policy_id="POL-CLEARANCE-001",
            name="Clearance Level Policy",
            description="Restricts Top Secret records to Level 4 clearance personnel",
            effect="ALLOW",
            action="view",
            resource_type="document",
            conditions={"min_clearance": "Level 4", "classification": "Top Secret"},
            is_active=True,
        ),
        ABACPolicy(
            policy_id="POL-FORENSIC-001",
            name="Forensic Evidence Verification Policy",
            description="Permits Forensic Staff to verify and transfer digital/biological evidence",
            effect="ALLOW",
            action="verify",
            resource_type="evidence",
            conditions={"allowed_roles": ["Forensic Staff", "Administrator"]},
            is_active=True,
        ),
    ]
    db.add_all(policies)

    # 5. Seed Sample Case
    sample_case = Case(
        id="case_mh_01428",
        case_number="MH-PN-2026-01428",
        title="State of Maharashtra vs. Sandeep Nair & Others (Cyber Financial Fraud)",
        case_type="Cyber Financial Fraud",
        description="Investigation into automated multi-tier hawala transactions and falsified digital invoicing.",
        status="Active",
        priority="High",
        sensitivity="Confidential",
        created_by="usr_io_001",
        assigned_officer="Inspector Vikram Shinde",
        department="Crime Investigation Department",
    )
    db.add(sample_case)
    await db.flush()

    # 6. Seed Sample Document & Version
    sample_content = b"STATE OF MAHARASHTRA - FIRST INFORMATION REPORT (FIR 01428/2026)\nSections: IPC 420, 467, 468; IT Act 66D\nComplainant: Axis Bank Vigilance Wing\nSuspect: Sandeep Nair\nStatus: Registered"
    sample_hash = compute_sha256(sample_content)

    sample_doc = Document(
        id="doc_fir_001",
        case_id="case_mh_01428",
        document_type="FIR",
        title="FIR_01428_CyberFraud.pdf",
        description="Original registered FIR copy with digital timestamps",
        classification="Confidential",
        current_version_id="ver_001",
        owner_id="usr_io_001",
        status="Active",
    )
    db.add(sample_doc)
    await db.flush()

    doc_version = DocumentVersion(
        id="ver_001",
        document_id="doc_fir_001",
        version_number=1,
        storage_key="cases/case_mh_01428/documents/doc_fir_001/versions/ver_001/FIR_01428_CyberFraud.pdf",
        sha256_hash=sample_hash,
        file_name="FIR_01428_CyberFraud.pdf",
        file_size=len(sample_content),
        mime_type="application/pdf",
        created_by="usr_io_001",
        change_reason="Initial FIR Registration",
        status="ACTIVE",
    )
    db.add(doc_version)

    storage_obj = StorageObject(
        id="sto_001",
        version_id="ver_001",
        storage_provider="local",
        bucket="nyayavault-documents",
        storage_key="cases/case_mh_01428/documents/doc_fir_001/versions/ver_001/FIR_01428_CyberFraud.pdf",
        file_size=len(sample_content),
        is_tampered_simulated=False,
    )
    db.add(storage_obj)

    # 7. Seed Integrity & Blockchain records
    integrity_rec = IntegrityRecord(
        id="int_001",
        document_id="doc_fir_001",
        version_id="ver_001",
        sha256_hash=sample_hash,
        verification_status="VERIFIED",
        is_tampered_simulated=False,
    )
    db.add(integrity_rec)

    bc_tx = BlockchainTransaction(
        id="tx_bc_001",
        document_id="doc_fir_001",
        version_id="ver_001",
        sha256=sample_hash,
        transaction_id="0x7f4a8b9c2d1e0f34a5b6c7d8e9f0123456789abcdef0123456789abcdef01234",
        block_reference="Block #41,209",
        network="Hyperledger Fabric v2.5",
        channel="nyayachannel",
        status="COMMITTED",
    )
    db.add(bc_tx)

    # 8. Seed Evidence & Chain of Custody
    ev_item = Evidence(
        id="ev_001",
        case_id="case_mh_01428",
        evidence_number="EV-2026-MH-0891",
        type="Digital Evidence",
        description="Seized encrypted NVMe SSD containing offshore transaction records",
        collected_by="Inspector Vikram Shinde",
        current_custodian="Dr. Ananya Roy",
        status="SECURED",
        classification="Confidential",
        document_id="doc_fir_001",
    )
    db.add(ev_item)
    await db.flush()

    initial_custody_hash = compute_sha256(b"GENESIS_CUSTODY_EVENT_EV_001")
    event_1_hash = compute_sha256(f"COLLECTION:usr_io_001:usr_forensic_001:{initial_custody_hash}".encode())

    custody_ev1 = CustodyEvent(
        id="cust_001",
        evidence_id="ev_001",
        from_user="Inspector Vikram Shinde",
        to_user="Dr. Ananya Roy",
        action="Transfer",
        context="Handover from scene of crime to Central Forensic Science Lab for bit-stream disk imaging.",
        signature_reference="SIG-DSC-CID-99182",
        previous_event_hash=initial_custody_hash,
        event_hash=event_1_hash,
    )
    db.add(custody_ev1)

    # 9. Seed System Settings & Notifications
    settings = [
        SystemSetting(key="system_name", value="NyayaVault", description="Platform Name"),
        SystemSetting(key="section_65b_signatory", value="Rajesh Kumar (IPS)", description="Default Section 65B Signatory"),
        SystemSetting(key="tamper_alert_threshold", value="HIGH", description="Alert severity for hash mismatch"),
    ]
    db.add_all(settings)

    notif = Notification(
        user_id="usr_io_001",
        type="SYSTEM_WELCOME",
        title="Welcome to NyayaVault",
        message="System initialized successfully. All cryptographically secured modules are active.",
        resource_type="system",
        resource_id="sys_init",
    )
    db.add(notif)

    await db.commit()
    logger.info("Database initialized and seeded successfully.")
