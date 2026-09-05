import io
import uuid
from datetime import datetime, timezone
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from reportlab.lib import colors


class CertificateService:
    @staticmethod
    def generate_section_65b_pdf(
        cert_number: str,
        case_number: str,
        doc_title: str,
        sha256_hash: str,
        officer_name: str,
        department: str,
        blockchain_tx: str,
        timestamp: str,
    ) -> bytes:
        buffer = io.BytesIO()
        c = canvas.Canvas(buffer, pagesize=letter)
        width, height = letter

        # Header Box
        c.setStrokeColor(colors.HexColor("#1e3a8a"))
        c.setFillColor(colors.HexColor("#0f172a"))
        c.rect(40, height - 100, width - 80, 70, fill=True, stroke=True)

        c.setFillColor(colors.white)
        c.setFont("Helvetica-Bold", 16)
        c.drawCentredString(width / 2, height - 55, "CERTIFICATE UNDER SECTION 65B")
        c.setFont("Helvetica", 11)
        c.drawCentredString(width / 2, height - 75, "OF THE INDIAN EVIDENCE ACT, 1872 / BSA 2023")

        # Watermark
        c.saveState()
        c.setFont("Helvetica-Bold", 55)
        c.setFillColor(colors.HexColor("#f1f5f9"))
        c.translate(width / 2, height / 2)
        c.rotate(45)
        c.drawCentredString(0, 0, "NYAYAVAULT VERIFIED")
        c.restoreState()

        # Body Content
        y = height - 140
        c.setFillColor(colors.black)
        c.setFont("Helvetica-Bold", 11)
        c.drawString(50, y, f"Certificate Identifier: {cert_number}")
        y -= 25
        c.drawString(50, y, f"Case Reference: {case_number}")
        y -= 25
        c.drawString(50, y, f"Generated On: {timestamp}")
        y -= 35

        c.setFont("Helvetica", 10)
        c.drawString(50, y, "I, the undersigned authorized officer, hereby certify the following electronic record:")
        y -= 25

        # Document Details Table Box
        c.setStrokeColor(colors.HexColor("#cbd5e1"))
        c.setFillColor(colors.HexColor("#f8fafc"))
        c.rect(50, y - 110, width - 100, 110, fill=True, stroke=True)

        c.setFillColor(colors.black)
        c.setFont("Helvetica-Bold", 10)
        c.drawString(65, y - 20, "Document Name:")
        c.setFont("Helvetica", 10)
        c.drawString(180, y - 20, doc_title)

        c.setFont("Helvetica-Bold", 10)
        c.drawString(65, y - 45, "SHA-256 Hash:")
        c.setFont("Helvetica", 9)
        c.drawString(180, y - 45, sha256_hash)

        c.setFont("Helvetica-Bold", 10)
        c.drawString(65, y - 70, "Ledger Anchor:")
        c.setFont("Helvetica", 9)
        c.drawString(180, y - 70, blockchain_tx)

        c.setFont("Helvetica-Bold", 10)
        c.drawString(65, y - 95, "Integrity Status:")
        c.setFont("Helvetica-Bold", 10)
        c.setFillColor(colors.HexColor("#16a34a"))
        c.drawString(180, y - 95, "CRYPTOGRAPHICALLY VERIFIED & UNALTERED")

        y -= 150
        c.setFillColor(colors.black)
        c.setFont("Helvetica", 9)
        declaration = [
            "1. The electronic record produced above was retrieved from the secure digital repository NyayaVault.",
            "2. The computer system / repository was operating properly during the relevant custody period.",
            "3. Cryptographic provenance was validated against the distributed ledger network before generation.",
            "4. The contents of the record reproduce accurately the original data stored in digital custody.",
        ]
        for line in declaration:
            c.drawString(50, y, line)
            y -= 20

        # Signatory Section
        y -= 30
        c.setFont("Helvetica-Bold", 10)
        c.drawString(width - 250, y, "Authorized Signatory:")
        y -= 18
        c.setFont("Helvetica", 10)
        c.drawString(width - 250, y, officer_name)
        y -= 16
        c.drawString(width - 250, y, department)
        y -= 16
        c.drawString(width - 250, y, "Digital Signature: Aadhaar-eSign (DSC Verified)")

        # Footer
        c.setFont("Helvetica-Oblique", 8)
        c.setFillColor(colors.gray)
        c.drawCentredString(width / 2, 30, "NyayaVault — National Crime Records Bureau — Document Authenticity Assurance System")

        c.showPage()
        c.save()
        return buffer.getvalue()
