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
    upload_resp = await client.post("/api/v1/documents", data=data, files=files)
    assert upload_resp.status_code == 201
    doc = upload_resp.json()
    assert doc["title"] == "FIR_Murder_Case.pdf"
    version_id = doc["latest_version"]["id"]
    sha256 = doc["latest_version"]["sha256_hash"]

    # 2. Verify Integrity
    verify_resp = await client.post(f"/api/v1/integrity/verify/{version_id}")
    assert verify_resp.status_code == 200
    assert verify_resp.json()["status"] == "VERIFIED"

    # 3. Simulate Tampering
    tamper_resp = await client.post(f"/api/v1/integrity/simulate-tamper/{version_id}")
    assert tamper_resp.status_code == 200
    assert tamper_resp.json()["status"] == "INTEGRITY_MISMATCH"

    # Verify that it now fails
    verify_again = await client.post(f"/api/v1/integrity/verify/{version_id}")
    assert verify_again.json()["status"] == "INTEGRITY_MISMATCH"

    # 4. Restore Integrity
    restore_resp = await client.post(f"/api/v1/integrity/restore/{version_id}")
    assert restore_resp.status_code == 200
    assert restore_resp.json()["status"] == "VERIFIED"


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
async def test_analytics_dashboard(client: AsyncClient):
    dash_resp = await client.get("/api/v1/analytics/dashboard")
    assert dash_resp.status_code == 200
    dash = dash_resp.json()
    assert "overview" in dash
    assert dash["overview"]["total_cases"] >= 1
    assert dash["overview"]["integrity_score_percent"] >= 90.0
