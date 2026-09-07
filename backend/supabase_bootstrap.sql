-- NyayaVault Supabase PostgreSQL bootstrap
-- Run this script once in the Supabase SQL Editor before starting the API.
-- It creates the application schema and one administrator account.
-- It is safe to run repeatedly.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    full_name VARCHAR(255) NOT NULL,
    employee_id VARCHAR(64) NOT NULL UNIQUE,
    department VARCHAR(128) NOT NULL,
    designation VARCHAR(128) NOT NULL,
    role VARCHAR(64) NOT NULL DEFAULT 'Investigating Officer',
    clearance_level VARCHAR(32) NOT NULL DEFAULT 'Level 2',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    password_hash VARCHAR(255) NOT NULL,
    last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS registration_requests (
    id VARCHAR(36) PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    full_name VARCHAR(255) NOT NULL,
    employee_id VARCHAR(64) NOT NULL UNIQUE,
    department VARCHAR(128) NOT NULL,
    designation VARCHAR(128) NOT NULL,
    posting_location VARCHAR(255) NOT NULL,
    justification TEXT NOT NULL,
    requested_role VARCHAR(64) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    supporting_document_name VARCHAR(255),
    status VARCHAR(16) NOT NULL DEFAULT 'PENDING',
    approved_by VARCHAR(36) REFERENCES users(id),
    approved_at TIMESTAMPTZ,
    rejection_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS roles (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(64) NOT NULL UNIQUE,
    description VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS permissions (
    id VARCHAR(36) PRIMARY KEY,
    code VARCHAR(64) NOT NULL UNIQUE,
    name VARCHAR(128) NOT NULL,
    description VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS role_permissions (
    id VARCHAR(36) PRIMARY KEY,
    role_name VARCHAR(64) NOT NULL,
    permission_code VARCHAR(64) NOT NULL
);

CREATE TABLE IF NOT EXISTS abac_policies (
    id VARCHAR(36) PRIMARY KEY,
    policy_id VARCHAR(64) NOT NULL UNIQUE,
    name VARCHAR(128) NOT NULL,
    description VARCHAR(255),
    effect VARCHAR(16) NOT NULL DEFAULT 'ALLOW',
    action VARCHAR(64) NOT NULL,
    resource_type VARCHAR(64) NOT NULL,
    conditions JSONB,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cases (
    id VARCHAR(36) PRIMARY KEY,
    case_number VARCHAR(64) NOT NULL UNIQUE,
    title VARCHAR(255) NOT NULL,
    case_type VARCHAR(64) NOT NULL,
    description TEXT,
    status VARCHAR(32) NOT NULL DEFAULT 'Active',
    priority VARCHAR(32) NOT NULL DEFAULT 'Medium',
    sensitivity VARCHAR(32) NOT NULL DEFAULT 'Confidential',
    created_by VARCHAR(36) REFERENCES users(id),
    assigned_officer VARCHAR(255),
    department VARCHAR(128) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    closed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS case_assignments (
    id VARCHAR(36) PRIMARY KEY,
    case_id VARCHAR(36) NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_in_case VARCHAR(64) NOT NULL DEFAULT 'Lead Investigator',
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS documents (
    id VARCHAR(36) PRIMARY KEY,
    case_id VARCHAR(36) NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    document_type VARCHAR(64) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    classification VARCHAR(32) NOT NULL DEFAULT 'Confidential',
    current_version_id VARCHAR(36),
    owner_id VARCHAR(36) REFERENCES users(id),
    status VARCHAR(32) NOT NULL DEFAULT 'Active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS document_versions (
    id VARCHAR(36) PRIMARY KEY,
    document_id VARCHAR(36) NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL DEFAULT 1,
    storage_key VARCHAR(512) NOT NULL,
    sha256_hash VARCHAR(64) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_size INTEGER NOT NULL DEFAULT 0,
    mime_type VARCHAR(128) NOT NULL DEFAULT 'application/pdf',
    created_by VARCHAR(36) REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    change_reason VARCHAR(255) DEFAULT 'Initial upload',
    status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE'
);

CREATE TABLE IF NOT EXISTS storage_objects (
    id VARCHAR(36) PRIMARY KEY,
    version_id VARCHAR(36) NOT NULL UNIQUE REFERENCES document_versions(id) ON DELETE CASCADE,
    storage_provider VARCHAR(32) NOT NULL DEFAULT 'local',
    bucket VARCHAR(128) NOT NULL,
    storage_key VARCHAR(512) NOT NULL,
    file_size INTEGER NOT NULL,
    is_tampered_simulated BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS ai_processing_jobs (
    id VARCHAR(36) PRIMARY KEY,
    document_id VARCHAR(36) NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    version_id VARCHAR(36) NOT NULL,
    job_type VARCHAR(32) NOT NULL DEFAULT 'FULL_PIPELINE',
    status VARCHAR(32) NOT NULL DEFAULT 'QUEUED',
    progress INTEGER NOT NULL DEFAULT 0,
    error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS ai_extractions (
    id VARCHAR(36) PRIMARY KEY,
    document_id VARCHAR(36) NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    version_id VARCHAR(36) NOT NULL,
    model_version VARCHAR(64) NOT NULL DEFAULT 'nyaya-nlp-v2.1',
    classification VARCHAR(64) NOT NULL,
    classification_confidence DOUBLE PRECISION NOT NULL DEFAULT 0.95,
    extracted_fields JSONB,
    raw_text TEXT,
    review_required BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_reviews (
    id VARCHAR(36) PRIMARY KEY,
    extraction_id VARCHAR(36) NOT NULL REFERENCES ai_extractions(id) ON DELETE CASCADE,
    document_id VARCHAR(36) NOT NULL,
    reviewer_id VARCHAR(36) NOT NULL REFERENCES users(id),
    original_classification VARCHAR(64) NOT NULL,
    reviewed_classification VARCHAR(64) NOT NULL,
    original_fields JSONB,
    reviewed_fields JSONB,
    decision VARCHAR(32) NOT NULL DEFAULT 'ACCEPTED',
    review_notes TEXT,
    reviewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS search_documents (
    id VARCHAR(36) PRIMARY KEY,
    document_id VARCHAR(36) NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    version_id VARCHAR(36) NOT NULL,
    case_id VARCHAR(36) NOT NULL,
    title VARCHAR(255) NOT NULL,
    document_type VARCHAR(64) NOT NULL,
    classification VARCHAR(32) NOT NULL,
    content_text TEXT NOT NULL,
    tags VARCHAR(512),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS evidence (
    id VARCHAR(36) PRIMARY KEY,
    case_id VARCHAR(36) NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    evidence_number VARCHAR(64) NOT NULL UNIQUE,
    type VARCHAR(64) NOT NULL,
    description TEXT NOT NULL,
    collected_by VARCHAR(255) NOT NULL,
    collected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    current_custodian VARCHAR(255) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'COLLECTED',
    classification VARCHAR(32) NOT NULL DEFAULT 'Confidential',
    document_id VARCHAR(36) REFERENCES documents(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS custody_events (
    id VARCHAR(36) PRIMARY KEY,
    evidence_id VARCHAR(36) NOT NULL REFERENCES evidence(id) ON DELETE CASCADE,
    from_user VARCHAR(255) NOT NULL,
    to_user VARCHAR(255) NOT NULL,
    action VARCHAR(64) NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    context TEXT,
    signature_reference VARCHAR(255),
    previous_event_hash VARCHAR(64) NOT NULL,
    event_hash VARCHAR(64) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS integrity_records (
    id VARCHAR(36) PRIMARY KEY,
    document_id VARCHAR(36) NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    version_id VARCHAR(36) NOT NULL,
    sha256_hash VARCHAR(64) NOT NULL,
    verification_status VARCHAR(32) NOT NULL DEFAULT 'VERIFIED',
    last_verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_tampered_simulated BOOLEAN NOT NULL DEFAULT FALSE,
    tamper_notes TEXT
);

CREATE TABLE IF NOT EXISTS blockchain_transactions (
    id VARCHAR(36) PRIMARY KEY,
    document_id VARCHAR(36) NOT NULL,
    version_id VARCHAR(36) NOT NULL,
    sha256 VARCHAR(64) NOT NULL,
    transaction_id VARCHAR(128) NOT NULL UNIQUE,
    block_reference VARCHAR(64) NOT NULL,
    network VARCHAR(64) NOT NULL DEFAULT 'Hyperledger Fabric v2.5',
    channel VARCHAR(64) NOT NULL DEFAULT 'nyayachannel',
    status VARCHAR(32) NOT NULL DEFAULT 'COMMITTED',
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS digital_signatures (
    id VARCHAR(36) PRIMARY KEY,
    resource_type VARCHAR(32) NOT NULL,
    resource_id VARCHAR(36) NOT NULL,
    signer_id VARCHAR(36) NOT NULL REFERENCES users(id),
    signature_type VARCHAR(32) NOT NULL DEFAULT 'Aadhaar-eSign',
    signature_reference VARCHAR(255) NOT NULL,
    signed_hash VARCHAR(64) NOT NULL,
    signed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status VARCHAR(32) NOT NULL DEFAULT 'VALID'
);

CREATE TABLE IF NOT EXISTS audit_events (
    id VARCHAR(36) PRIMARY KEY,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    actor_id VARCHAR(36),
    actor_role VARCHAR(64),
    action VARCHAR(64) NOT NULL,
    resource_type VARCHAR(32) NOT NULL,
    resource_id VARCHAR(36),
    case_id VARCHAR(36),
    result VARCHAR(16) NOT NULL DEFAULT 'SUCCESS',
    severity VARCHAR(16) NOT NULL DEFAULT 'INFO',
    ip_address VARCHAR(64) DEFAULT '127.0.0.1',
    user_agent VARCHAR(255),
    metadata_json JSONB,
    previous_event_hash VARCHAR(64) NOT NULL,
    event_hash VARCHAR(64) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS security_events (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36),
    event_type VARCHAR(64) NOT NULL,
    resource_id VARCHAR(36),
    case_id VARCHAR(36),
    risk_score INTEGER NOT NULL DEFAULT 50,
    severity VARCHAR(16) NOT NULL DEFAULT 'MEDIUM',
    description TEXT NOT NULL,
    detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status VARCHAR(32) NOT NULL DEFAULT 'NEW'
);

CREATE TABLE IF NOT EXISTS security_alerts (
    id VARCHAR(36) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    severity VARCHAR(16) NOT NULL DEFAULT 'HIGH',
    status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
    event_id VARCHAR(36) REFERENCES security_events(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,
    resolved_by VARCHAR(36)
);

CREATE TABLE IF NOT EXISTS certificates (
    id VARCHAR(36) PRIMARY KEY,
    certificate_number VARCHAR(64) NOT NULL UNIQUE,
    case_id VARCHAR(36) NOT NULL REFERENCES cases(id),
    document_id VARCHAR(36) REFERENCES documents(id),
    evidence_id VARCHAR(36) REFERENCES evidence(id),
    generated_by VARCHAR(36) NOT NULL REFERENCES users(id),
    file_storage_key VARCHAR(512) NOT NULL,
    verification_hash VARCHAR(64) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notifications (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(64) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    resource_type VARCHAR(32),
    resource_id VARCHAR(36),
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS system_settings (
    id VARCHAR(36) PRIMARY KEY,
    key VARCHAR(64) NOT NULL UNIQUE,
    value VARCHAR(255) NOT NULL,
    description VARCHAR(255),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO roles (id, name, description) VALUES
    ('role_admin', 'Administrator', 'System administrator'),
    ('role_io', 'Investigating Officer', 'Investigating officer'),
    ('role_forensic', 'Forensic Staff', 'Forensic staff member'),
    ('role_senior', 'Senior Officer', 'Senior officer')
ON CONFLICT (name) DO NOTHING;

INSERT INTO permissions (id, code, name, description) VALUES
    ('perm_manage_users', 'manage_users', 'Manage Users', 'Approve and manage user accounts'),
    ('perm_view', 'view', 'View', 'View secured records'),
    ('perm_upload', 'upload', 'Upload', 'Upload secured records'),
    ('perm_download', 'download', 'Download', 'Download secured records'),
    ('perm_verify', 'verify', 'Verify', 'Verify record integrity'),
    ('perm_transfer', 'transfer', 'Transfer', 'Transfer evidence custody'),
    ('perm_sign', 'sign', 'Sign', 'Sign records'),
    ('perm_generate_certificate', 'generate_certificate', 'Generate Certificate', 'Generate certificates'),
    ('perm_manage_access', 'manage_access', 'Manage Access', 'Manage access policies'),
    ('perm_view_security_events', 'view_security_events', 'View Security Events', 'View security events'),
    ('perm_view_audit_logs', 'view_audit_logs', 'View Audit Logs', 'View audit logs'),
    ('perm_edit', 'edit', 'Edit', 'Edit records'),
    ('perm_delete', 'delete', 'Delete', 'Delete records')
ON CONFLICT (code) DO NOTHING;

INSERT INTO role_permissions (id, role_name, permission_code)
SELECT 'rp_' || md5(role_name || ':' || permission_code), role_name, permission_code
FROM (VALUES
    ('Administrator', 'manage_users'), ('Administrator', 'view'), ('Administrator', 'upload'), ('Administrator', 'download'), ('Administrator', 'verify'), ('Administrator', 'transfer'), ('Administrator', 'sign'), ('Administrator', 'generate_certificate'), ('Administrator', 'manage_access'), ('Administrator', 'view_security_events'), ('Administrator', 'view_audit_logs'), ('Administrator', 'edit'), ('Administrator', 'delete'),
    ('Investigating Officer', 'view'), ('Investigating Officer', 'upload'), ('Investigating Officer', 'download'), ('Investigating Officer', 'verify'), ('Investigating Officer', 'transfer'), ('Investigating Officer', 'sign'), ('Investigating Officer', 'generate_certificate'),
    ('Forensic Staff', 'view'), ('Forensic Staff', 'upload'), ('Forensic Staff', 'download'), ('Forensic Staff', 'verify'), ('Forensic Staff', 'sign'), ('Forensic Staff', 'generate_certificate'),
    ('Senior Officer', 'view'), ('Senior Officer', 'upload'), ('Senior Officer', 'download'), ('Senior Officer', 'verify'), ('Senior Officer', 'transfer'), ('Senior Officer', 'sign'), ('Senior Officer', 'generate_certificate'), ('Senior Officer', 'view_security_events'), ('Senior Officer', 'view_audit_logs')
) AS permissions(role_name, permission_code)
WHERE NOT EXISTS (
    SELECT 1 FROM role_permissions existing
    WHERE existing.role_name = permissions.role_name AND existing.permission_code = permissions.permission_code
);

INSERT INTO users (id, email, full_name, employee_id, department, designation, role, clearance_level, is_active, password_hash)
VALUES (
    'usr_admin_001',
    'admin@nyayavault.gov.in',
    'Rajesh Kumar (IPS)',
    'DL-NCRB-2024-001',
    'National Crime Records Bureau',
    'Director & Chief Administrator',
    'Administrator',
    'Level 4',
    TRUE,
    crypt('NyayaVault@2026', gen_salt('bf'))
)
ON CONFLICT (email) DO UPDATE SET
    role = EXCLUDED.role,
    clearance_level = EXCLUDED.clearance_level,
    is_active = TRUE,
    password_hash = EXCLUDED.password_hash,
    updated_at = NOW();
