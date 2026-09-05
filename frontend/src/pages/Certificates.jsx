import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { api } from '../api/apiClient';
import {
  PageHeader, Card, Button, Badge, IntegrityBadge, Select,
  HashDisplay, formatDate, formatDateTime, Alert,
} from '../components/ui';
import { Award, Download, Printer, Check, Shield, ChevronRight } from 'lucide-react';

const STEPS = [
  'Select Case',
  'Select Document',
  'Review Metadata',
  'Verify Integrity',
  'Generate Certificate',
  'Preview Certificate',
  'Download / Print',
];

export default function Certificates() {
  const { state, generateCertificate, verifyIntegrity, canAccess } = useApp();
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);
  const [selectedCaseId, setSelectedCaseId] = useState('');
  const [selectedDocId, setSelectedDocId] = useState('');
  const [verified, setVerified] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [generatedCert, setGeneratedCert] = useState(null);
  const [showHistory, setShowHistory] = useState(false);

  const selectedCase = state.cases.find(c => c.id === selectedCaseId);
  const caseDocs = state.documents.filter(d => d.caseId === selectedCaseId);
  const selectedDoc = state.documents.find(d => d.id === selectedDocId);

  const canGenerate = canAccess('generateCertificate');

  const handleVerify = async () => {
    setVerifying(true);
    if (selectedDoc) {
      await verifyIntegrity(selectedDocId);
    }
    setVerified(true);
    setVerifying(false);
    setActiveStep(4);
  };

  const handleGenerate = async () => {
    if (!selectedDoc) return;
    setGenerating(true);
    try {
      const cert = await generateCertificate({
        caseId: selectedCaseId,
        caseNumber: selectedCaseId,
        documentId: selectedDocId,
        documentName: selectedDoc.name,
        documentHash: selectedDoc.sha256,
        storageRef: selectedDoc.storageRef,
        verificationStatus: 'Verified',
        blockchainTx: selectedDoc.blockchainTx,
        signatoryName: state.currentUser.name,
        signatoryDesignation: state.currentUser.role,
        signatoryBadge: state.currentUser.badge,
      });
      setGeneratedCert(cert);
      setActiveStep(5);
    } catch (err) {
      alert('Failed to generate Section 65B certificate: ' + (err.message || 'Unknown error'));
    } finally {
      setGenerating(false);
    }
  };

  const handleDownloadPdf = async (certId) => {
    if (!certId) return;
    setDownloading(true);
    try {
      const blob = await api.downloadCertificate(certId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `section-65b-${certId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      alert('Failed to download certificate PDF: ' + (err.message || 'Unknown error'));
    } finally {
      setDownloading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleReset = () => {
    setActiveStep(0);
    setSelectedCaseId('');
    setSelectedDocId('');
    setVerified(false);
    setGeneratedCert(null);
    setShowHistory(false);
  };

  return (
    <div className="p-5">
      <PageHeader
        title="Section 65B Certificate Generation"
        subtitle="Generate electronic evidence certificates for legal proceedings"
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Certificates' }]}
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => setShowHistory(!showHistory)}>
              {showHistory ? 'New Certificate' : 'Certificate History'}
            </Button>
          </div>
        }
      />

      {!canGenerate && (
        <Alert type="warning" className="mb-4">
          Your current role ({state.currentRole}) does not have permission to generate certificates. Switch to Senior Officer or Administrator role.
        </Alert>
      )}

      {showHistory ? (
        /* Certificate History */
        <div className="space-y-3">
          <div className="text-sm font-semibold text-[#475569]">Generated Certificates ({state.certificates.length})</div>
          {state.certificates.map(cert => (
            <Card key={cert.id}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Award size={16} className="text-[#0F2747]" />
                    <span className="font-mono text-sm font-bold text-[#0F2747]">{cert.id}</span>
                    <Badge variant="success">Valid</Badge>
                  </div>
                  <div className="mt-1.5 space-y-1 text-xs text-[#475569]">
                    <div>Document: <span className="font-medium text-[#1E293B]">{cert.documentName}</span></div>
                    <div>Case: <span className="font-mono">{cert.caseNumber}</span></div>
                    <div>Generated by: <span className="font-medium text-[#1E293B]">{cert.generatedBy}</span></div>
                    <div>Date: {formatDateTime(cert.generatedAt)}</div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" onClick={() => { setGeneratedCert(cert); setShowHistory(false); setActiveStep(5); }}>
                    View
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => handleDownloadPdf(cert.id)}>
                    <Download size={12} /> PDF
                  </Button>
                </div>
              </div>
            </Card>
          ))}
          {state.certificates.length === 0 && (
            <Card><div className="py-8 text-center text-sm text-[#475569]">No certificates generated yet</div></Card>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Wizard Steps */}
          <div className="lg:col-span-1">
            <Card>
              <div className="text-xs font-semibold text-[#475569] uppercase tracking-wide mb-3">Workflow</div>
              <div className="space-y-0">
                {STEPS.map((step, i) => (
                  <div key={i} className="flex items-center gap-2.5 py-2.5 border-b border-[#F1F5F9] last:border-0">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                      i < activeStep ? 'bg-green-500 text-white' :
                      i === activeStep ? 'bg-[#0F2747] text-white' :
                      'bg-[#F1F5F9] text-[#475569]'
                    }`}>
                      {i < activeStep ? <Check size={12} /> : i + 1}
                    </div>
                    <span className={`text-sm ${i === activeStep ? 'font-semibold text-[#0F2747]' : i < activeStep ? 'text-green-700' : 'text-[#475569]'}`}>
                      {step}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Step Content */}
          <div className="lg:col-span-3">
            <Card>
              <div className="text-sm font-semibold text-[#0F2747] mb-4">
                Step {activeStep + 1}: {STEPS[activeStep]}
              </div>

              {/* Step 0: Select Case */}
              {activeStep === 0 && (
                <div className="space-y-4">
                  <Select
                    label="Select Case"
                    value={selectedCaseId}
                    onChange={v => { setSelectedCaseId(v); setSelectedDocId(''); }}
                    options={[{ value: '', label: '— Choose a case —' }, ...state.cases.map(c => ({ value: c.id, label: `${c.id} · ${c.title}` }))]}
                  />
                  {selectedCase && (
                    <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded p-3 text-sm">
                      <div className="font-medium text-[#1E293B]">{selectedCase.title}</div>
                      <div className="text-xs text-[#475569] mt-1">{selectedCase.type} · {selectedCase.status} · {selectedCase.assignedOfficer}</div>
                    </div>
                  )}
                  <Button variant="primary" disabled={!selectedCaseId} onClick={() => setActiveStep(1)}>
                    Continue <ChevronRight size={13} />
                  </Button>
                </div>
              )}

              {/* Step 1: Select Document */}
              {activeStep === 1 && (
                <div className="space-y-4">
                  <div className="text-xs text-[#475569]">Case: <span className="font-mono font-medium text-[#1E293B]">{selectedCaseId}</span></div>
                  {caseDocs.length === 0 ? (
                    <div className="text-sm text-[#475569] py-4 text-center">No documents in this case</div>
                  ) : (
                    <div className="space-y-2">
                      {caseDocs.map(doc => (
                        <div
                          key={doc.id}
                          className={`border rounded p-3 cursor-pointer hover:border-[#0F2747] transition-colors ${selectedDocId === doc.id ? 'border-[#0F2747] bg-blue-50/30' : 'border-[#E2E8F0]'}`}
                          onClick={() => setSelectedDocId(doc.id)}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium text-sm text-[#1E293B]">{doc.name}</div>
                              <div className="text-xs text-[#475569]">{doc.type} · v{doc.version}</div>
                            </div>
                            <div className="flex gap-1.5">
                              <IntegrityBadge status={doc.integrityStatus} />
                              {selectedDocId === doc.id && <Check size={16} className="text-[#0F2747]" />}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Button variant="secondary" onClick={() => setActiveStep(0)}>Back</Button>
                    <Button variant="primary" disabled={!selectedDocId} onClick={() => setActiveStep(2)}>
                      Continue <ChevronRight size={13} />
                    </Button>
                  </div>
                </div>
              )}

              {/* Step 2: Review Metadata */}
              {activeStep === 2 && selectedDoc && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {[
                      { label: 'Document Name', value: selectedDoc.name },
                      { label: 'Document Type', value: selectedDoc.type },
                      { label: 'Case Number', value: selectedDoc.caseId },
                      { label: 'Uploaded By', value: selectedDoc.uploadedBy },
                      { label: 'Upload Date', value: formatDateTime(selectedDoc.uploadDate) },
                      { label: 'Version', value: `v${selectedDoc.version}` },
                      { label: 'Classification', value: selectedDoc.classification },
                      { label: 'Access Level', value: selectedDoc.accessLevel },
                    ].map(({ label, value }) => (
                      <div key={label} className="bg-[#F8FAFC] border border-[#E2E8F0] rounded p-2.5">
                        <div className="text-xs text-[#475569]">{label}</div>
                        <div className="font-medium text-[#1E293B] mt-0.5">{value}</div>
                      </div>
                    ))}
                  </div>
                  <HashDisplay hash={selectedDoc.sha256} label="SHA-256 Hash" />
                  <div className="flex gap-2">
                    <Button variant="secondary" onClick={() => setActiveStep(1)}>Back</Button>
                    <Button variant="primary" onClick={() => setActiveStep(3)}>
                      Proceed to Verification <ChevronRight size={13} />
                    </Button>
                  </div>
                </div>
              )}

              {/* Step 3: Verify Integrity */}
              {activeStep === 3 && (
                <div className="space-y-4">
                  {!verified ? (
                    <>
                      <div className="text-sm text-[#475569]">
                        Verify the integrity of <span className="font-medium text-[#1E293B]">{selectedDoc?.name}</span> against the blockchain record before generating the certificate.
                      </div>
                      <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded p-3 space-y-1.5 text-xs">
                        <div className="flex justify-between"><span className="text-[#475569]">Blockchain Transaction:</span><span className="font-mono">{selectedDoc?.blockchainTx}</span></div>
                        <div className="flex justify-between"><span className="text-[#475569]">Current Integrity:</span><IntegrityBadge status={selectedDoc?.integrityStatus} /></div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="secondary" onClick={() => setActiveStep(2)}>Back</Button>
                        <Button variant="primary" onClick={handleVerify} disabled={verifying}>
                          <Shield size={13} /> {verifying ? 'Verifying...' : 'Verify Integrity'}
                        </Button>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-4">
                      <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
                        <Check size={24} className="text-green-600" />
                      </div>
                      <div className="text-sm font-bold text-green-700">INTEGRITY VERIFIED</div>
                      <div className="text-xs text-[#475569] mt-1">Proceeding to certificate generation...</div>
                    </div>
                  )}
                </div>
              )}

              {/* Step 4: Generate */}
              {activeStep === 4 && (
                <div className="space-y-4">
                  <Alert type="success">
                    Integrity verified. Document hash matches blockchain record {selectedDoc?.blockchainTx}. Ready to generate Section 65B certificate.
                  </Alert>
                  {!canGenerate && (
                    <Alert type="danger">You do not have permission to generate certificates. Contact a Senior Officer or Administrator.</Alert>
                  )}
                  <div className="flex gap-2">
                    <Button variant="secondary" onClick={() => setActiveStep(3)}>Back</Button>
                    <Button variant="primary" onClick={handleGenerate} disabled={!canGenerate}>
                      <Award size={14} /> Generate Certificate
                    </Button>
                  </div>
                </div>
              )}

              {/* Step 5: Preview */}
              {activeStep === 5 && generatedCert && (
                <div className="space-y-4">
                  {/* Certificate Preview */}
                  <div className="border-2 border-[#0F2747] rounded-lg p-6 bg-white">
                    {/* Header */}
                    <div className="text-center border-b border-[#0F2747] pb-4 mb-4">
                      <div className="text-xs font-medium text-[#475569] tracking-widest uppercase">Government of India</div>
                      <div className="text-xs text-[#475569]">Ministry of Home Affairs · National Crime Records Bureau</div>
                      <div className="text-xl font-bold text-[#0F2747] mt-2">CERTIFICATE OF ELECTRONIC EVIDENCE</div>
                      <div className="text-sm text-[#475569]">Under Section 65B of the Indian Evidence Act, 1872</div>
                      <div className="text-[10px] text-amber-700 mt-1 italic">
                        * System-generated certificate for demonstration purposes. Legal validity requires independent verification.
                      </div>
                    </div>

                    {/* Certificate Body */}
                    <div className="space-y-3 text-sm">
                      <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                        {[
                          { label: 'Certificate ID', value: generatedCert.id },
                          { label: 'Case Number', value: generatedCert.caseNumber },
                          { label: 'Document Name', value: generatedCert.documentName },
                          { label: 'Storage Reference', value: generatedCert.storageRef },
                          { label: 'Blockchain Transaction', value: generatedCert.blockchainTx },
                          { label: 'Verification Status', value: 'VERIFIED' },
                          { label: 'Generated Date/Time', value: formatDateTime(generatedCert.generatedAt) },
                          { label: 'System', value: generatedCert.systemInfo },
                        ].map(({ label, value }) => (
                          <div key={label}>
                            <div className="text-[10px] text-[#475569] uppercase tracking-wide">{label}</div>
                            <div className={`font-medium text-[#1E293B] text-xs mt-0.5 ${label === 'Certificate ID' || label === 'Blockchain Transaction' ? 'font-mono' : ''}`}>{value}</div>
                          </div>
                        ))}
                      </div>

                      <div className="border border-[#E2E8F0] rounded p-2 mt-2">
                        <div className="text-[10px] text-[#475569] uppercase tracking-wide mb-1">SHA-256 Hash</div>
                        <div className="font-mono text-[10px] text-[#1E293B] break-all">{generatedCert.documentHash}</div>
                      </div>

                      {/* Signatory */}
                      <div className="border-t border-[#E2E8F0] pt-3 mt-4">
                        <div className="text-xs text-[#475569] mb-2">Authorized Signatory</div>
                        <div className="flex items-end justify-between">
                          <div>
                            <div className="font-bold text-[#0F2747]">{generatedCert.signatoryName}</div>
                            <div className="text-xs text-[#475569]">{generatedCert.signatoryDesignation}</div>
                            <div className="text-xs text-[#475569]">Badge: {generatedCert.signatoryBadge}</div>
                          </div>
                          <div className="text-right">
                            <div className="border border-[#0F2747] text-[#0F2747] text-xs px-3 py-1 rounded font-medium">
                              DIGITALLY SIGNED
                            </div>
                            <div className="text-[10px] text-[#475569] mt-1">{formatDate(generatedCert.generatedAt)}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 flex-wrap">
                    <Button variant="primary" onClick={handlePrint}>
                      <Printer size={13} /> Print Certificate
                    </Button>
                    <Button variant="secondary" disabled={downloading} onClick={() => handleDownloadPdf(generatedCert.id)}>
                      <Download size={13} /> {downloading ? 'Downloading...' : 'Download PDF'}
                    </Button>
                    <Button variant="ghost" onClick={handleReset}>
                      Generate Another
                    </Button>
                  </div>
                </div>
              )}

              {/* Step 6: Done */}
              {activeStep === 6 && (
                <div className="text-center py-8">
                  <Check size={40} className="text-green-500 mx-auto mb-3" />
                  <div className="text-lg font-bold text-[#0F2747]">Certificate Ready</div>
                  <Button variant="secondary" className="mt-4" onClick={handleReset}>Generate Another</Button>
                </div>
              )}
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
