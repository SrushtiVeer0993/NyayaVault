import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_health_endpoints(client: AsyncClient):
    response = await client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "HEALTHY"
    assert data["service"] == "NyayaVault"

    db_resp = await client.get("/api/v1/health/db")
    assert db_resp.status_code == 200
    assert db_resp.json()["status"] == "UP"

    storage_resp = await client.get("/api/v1/health/storage")
    assert storage_resp.status_code == 200
    assert storage_resp.json()["status"] == "UP"

    bc_resp = await client.get("/api/v1/health/blockchain")
    assert bc_resp.status_code == 200
    assert bc_resp.json()["status"] == "UP"


@pytest.mark.asyncio
async def test_authentication_workflow(client: AsyncClient):
    # 1. Invalid login
    bad_login = await client.post(
        "/api/v1/auth/login",
        json={"email": "admin@nyayavault.gov.in", "password": "WrongPassword!"},
    )
    assert bad_login.status_code == 401

    # 2. Valid login
    login_resp = await client.post(
        "/api/v1/auth/login",
        json={"email": "admin@nyayavault.gov.in", "password": "NyayaVault@2026"},
    )
    assert login_resp.status_code == 200
    login_data = login_resp.json()
    assert "access_token" in login_data
    token = login_data["access_token"]

    # 3. Access current user profile
    headers = {"Authorization": f"Bearer {token}"}
    me_resp = await client.get("/api/v1/auth/me", headers=headers)
    assert me_resp.status_code == 200
    assert me_resp.json()["email"] == "admin@nyayavault.gov.in"
    assert me_resp.json()["role"] == "Administrator"


@pytest.mark.asyncio
async def test_registration_request_approval_workflow(client: AsyncClient):
    import uuid

    suffix = uuid.uuid4().hex[:8]
    applicant = {
        "email": f"officer-{suffix}@nyayavault.gov.in",
        "password": "OfficerPass@2026",
        "full_name": "Asha Rao",
        "employee_id": f"EMP-{suffix}",
        "department": "Digital Investigation Unit",
        "designation": "Investigation Officer",
        "posting_location": "Pune Cyber Cell",
        "justification": "I require secure access to manage assigned investigation records.",
        "requested_role": "Investigating Officer",
        "supporting_document_name": "asha-rao-id.pdf",
    }

    signup = await client.post("/api/v1/auth/signup", json=applicant)
    assert signup.status_code == 201
    request_data = signup.json()
    assert request_data["status"] == "PENDING"

    pending_login = await client.post(
        "/api/v1/auth/login",
        json={"email": applicant["email"], "password": applicant["password"]},
    )
    assert pending_login.status_code == 403
    assert "pending" in pending_login.json()["detail"].lower()

    unauthenticated_queue = await client.get("/api/v1/auth/registration-requests")
    assert unauthenticated_queue.status_code in (401, 403)

    admin_login = await client.post(
        "/api/v1/auth/login",
        json={"email": "admin@nyayavault.gov.in", "password": "NyayaVault@2026"},
    )
    admin_headers = {"Authorization": f"Bearer {admin_login.json()['access_token']}"}

    queue = await client.get("/api/v1/auth/registration-requests", headers=admin_headers)
    assert queue.status_code == 200
    assert any(item["id"] == request_data["id"] for item in queue.json())

    approval = await client.post(
        f"/api/v1/auth/registration-requests/{request_data['id']}/approve",
        headers=admin_headers,
    )
    assert approval.status_code == 200
    assert approval.json()["status"] == "APPROVED"

    approved_login = await client.post(
        "/api/v1/auth/login",
        json={"email": applicant["email"], "password": applicant["password"]},
    )
    assert approved_login.status_code == 200
    assert approved_login.json()["user"]["role"] == "Investigating Officer"


@pytest.mark.asyncio
async def test_cases_workflow(client: AsyncClient):
    # 1. List cases
    cases_resp = await client.get("/api/v1/cases")
    assert cases_resp.status_code == 200
    cases = cases_resp.json()
    assert len(cases) >= 1
    assert any(c["case_number"] == "MH-PN-2026-01428" for c in cases)

    # 2. Create a new case
    import uuid
    uid = uuid.uuid4().hex[:6].upper()
    new_case_payload = {
        "case_number": f"DL-SPL-2026-{uid}",
        "title": "State vs. Syndicate (Money Laundering)",
        "case_type": "Financial Crime",
        "description": "Seizure of illicit shell companies",
        "priority": "High",
        "sensitivity": "Confidential",
        "department": "Economic Offences Wing",
    }
    create_resp = await client.post("/api/v1/cases", json=new_case_payload)
    assert create_resp.status_code == 201
    created = create_resp.json()
    assert created["case_number"] == f"DL-SPL-2026-{uid}"

@pytest.mark.asyncio
async def test_document_upload_and_integrity(client: AsyncClient):
    # 1. Upload Document
    file_bytes = b"FIRST INFORMATION REPORT (DIGITAL COPY)\nSection: IPC 302/120B\nOfficer: Vikram Shinde"
    files = {"file": ("FIR_Murder_Case.pdf", file_bytes, "application/pdf")}

    data = {
        "case_id": "case_mh_01428",
        "document_type": "FIR",
        "classification": "Confidential",
        "title": "FIR_Murder_Case.pdf",
    }

    upload_resp = await client.post(
        "/api/v1/documents",
        data=data,
        files=files,
    )

    assert upload_resp.status_code == 201

    doc = upload_resp.json()
    assert doc["title"] == "FIR_Murder_Case.pdf"

    version_id = doc["latest_version"]["id"]

    # 2. Verify Integrity
    verify_resp = await client.post(
        f"/api/v1/integrity/verify/{version_id}"
    )

    assert verify_resp.status_code == 200
    assert verify_resp.json()["status"] == "VERIFIED"

    # 3. Simulate Tampering
    tamper_resp = await client.post(
        f"/api/v1/integrity/simulate-tamper/{version_id}"
    )

    assert tamper_resp.status_code == 200
    assert tamper_resp.json()["status"] == "INTEGRITY_MISMATCH"

    # 4. Verify that tampering is detected
    verify_again = await client.post(
        f"/api/v1/integrity/verify/{version_id}"
    )

    assert verify_again.json()["status"] == "INTEGRITY_MISMATCH"

    # 5. Restore Integrity
    restore_resp = await client.post(
        f"/api/v1/integrity/restore/{version_id}"
    )

    assert restore_resp.status_code == 200
    assert restore_resp.json()["status"] == "VERIFIED"


@pytest.mark.asyncio
async def test_document_lifecycle_history(client: AsyncClient):

    # 1. Create a document so lifecycle audit events definitely exist
    file_bytes = (
        b"FIRST INFORMATION REPORT (DIGITAL COPY)\n"
        b"Section: IPC 302/120B\n"
        b"Officer: Vikram Shinde"
    )

    files = {
        "file": (
            "Lifecycle_Test_FIR.pdf",
            file_bytes,
            "application/pdf",
        )
    }

    data = {
        "case_id": "case_mh_01428",
        "document_type": "FIR",
        "classification": "Confidential",
        "title": "Lifecycle_Test_FIR.pdf",
    }

    upload_resp = await client.post(
        "/api/v1/documents",
        data=data,
        files=files,
    )

    assert upload_resp.status_code == 201

    document = upload_resp.json()
    document_id = document["id"]

    # 2. Retrieve the document lifecycle history
    response = await client.get(
        f"/api/v1/audit/document/{document_id}"
    )

    assert response.status_code == 200

    events = response.json()

    # 3. The upload should have created an audit event
    assert isinstance(events, list)
    assert len(events) > 0

    # 4. Every returned event must belong to this document
    for event in events:
        assert event["resource_type"] == "document"
        assert event["resource_id"] == document_id

    # 5. Lifecycle history must be chronological
    timestamps = [event["timestamp"] for event in events]

    assert timestamps == sorted(timestamps)

    
@pytest.mark.asyncio
async def test_evidence_custody_transfer(client: AsyncClient):
    # 1. List evidence
    ev_resp = await client.get("/api/v1/evidence")
    assert ev_resp.status_code == 200
    items = ev_resp.json()
    assert len(items) >= 1
    ev_id = items[0]["id"]

    # 2. Transfer evidence
    transfer_resp = await client.post(
        f"/api/v1/evidence/{ev_id}/transfer",
        json={
            "to_user": "Court Registrar, Special NDPS Court",
            "context": "Submission of forensic physical drives for judicial custody.",
            "signature_reference": "SIG-JUDICIAL-0012",
        },
    )
    assert transfer_resp.status_code == 200
    updated_ev = transfer_resp.json()
    assert updated_ev["current_custodian"] == "Court Registrar, Special NDPS Court"
    assert len(updated_ev["custody_events"]) >= 2


@pytest.mark.asyncio
async def test_certificate_generation(client: AsyncClient):
    gen_resp = await client.post(
        "/api/v1/certificates/generate",
        json={"case_id": "case_mh_01428", "document_id": "doc_fir_001"},
    )
    assert gen_resp.status_code == 201
    cert = gen_resp.json()
    assert cert["certificate_number"].startswith("CERT-65B-")

    # Download PDF
    dl_resp = await client.get(f"/api/v1/certificates/{cert['id']}/download")
    assert dl_resp.status_code == 200
    assert dl_resp.headers["content-type"] == "application/pdf"
    assert len(dl_resp.content) > 500


@pytest.mark.asyncio
async def test_audit_chain_verification(client: AsyncClient):
    verify_resp = await client.get("/api/v1/audit/verify-chain")
    assert verify_resp.status_code == 200
    data = verify_resp.json()
    assert data["is_valid"] is True
    assert data["verified_events"] > 0

@pytest.mark.asyncio
async def test_audit_chain_detects_tampering(client: AsyncClient):
    from app.db.session import AsyncSessionLocal
    from app.db.models import AuditEvent
    from sqlalchemy import select

    # 1. Get the audit events in the same order used by verification
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(AuditEvent).order_by(AuditEvent.timestamp.asc())
        )
        events = result.scalars().all()

        assert len(events) > 0

        # Select the first event in the verification order
        event = events[0]
        event_id = event.id
        original_action = event.action

        # 2. Tamper with the event without changing its stored hash
        event.action = "TAMPERED_ACTION"
        await session.commit()

    try:
        # 3. Verify the chain
        verify_resp = await client.get("/api/v1/audit/verify-chain")

        assert verify_resp.status_code == 200

        data = verify_resp.json()

        # 4. Tampering must be detected
        assert data["is_valid"] is False
        assert data["broken_event_id"] == event_id
        assert "Hash mismatch detected" in data["message"]

    finally:
        # 5. Restore the original database state
        async with AsyncSessionLocal() as session:
            result = await session.execute(
                select(AuditEvent).where(AuditEvent.id == event_id)
            )
            event = result.scalar_one()

            event.action = original_action
            await session.commit()

@pytest.mark.asyncio
async def test_analytics_dashboard(client: AsyncClient):
    dash_resp = await client.get("/api/v1/analytics/dashboard")
    assert dash_resp.status_code == 200
    dash = dash_resp.json()
    assert "overview" in dash
    assert dash["overview"]["total_cases"] >= 1
    assert dash["overview"]["integrity_score_percent"] >= 90.0
