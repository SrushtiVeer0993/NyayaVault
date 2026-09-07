import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { api } from '../api/apiClient';
import {
  PageHeader, Card, Tabs, Badge, Button, IntegrityBadge, HashDisplay,
  Alert, Timeline, formatDate, formatDateTime, Spinner,
} from '../components/ui';
import {
  ShieldCheck, AlertTriangle, RotateCcw, Award, ClipboardList,
  Download, Share2, GitBranch, ArrowLeft, CheckCircle, XCircle,
  FileText, ChevronRight,
} from 'lucide-react';

export default function DocumentDetail() {
  const { id } = useParams();
  const { state, verifyIntegrity, simulateTampering, restoreOriginal, generateCertificate, addAuditEvent } = useApp();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('details');
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState(null);
  const [reviewField, setReviewField] = useState(null);
  const [reviewValues, setReviewValues] = useState({});

  const doc = state.documents.find(d => d.id === id);

  if (!doc) {
    return (
      <div className="p-5">
        <PageHeader title="Document Not Found" breadcrumbs={[{ label: 'Documents', href: '/documents' }, { label: id }]} />
        <Card><div className="py-10 text-center text-[#475569]">Document not found. <Button variant="link" onClick={() => navigate('/documents')}>Back to Documents</Button></div></Card>
      </div>
    );
  }

  const docAudit = state.auditEvents.filter(e => e.resourceId === id).slice(0, 10);
  const currentDoc = state.documents.find(d => d.id === id);
  
  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewError, setPreviewError] = useState(false);

  useEffect(() => {
    let objectUrl = null;
    setPreviewUrl(null);
    setPreviewError(false);
    (async () => {
      try {
        const blob = await api.downloadDocument(id);
        objectUrl = window.URL.createObjectURL(blob);
        setPreviewUrl(objectUrl);
      } catch (err) {
        console.error('Preview load error:', err);
        setPreviewError(true);
      }
    })();
    return () => {
      if (objectUrl) window.URL.revokeObjectURL(objectUrl);
    };
  }, [id]);

  const handleVerify = async () => {
    setVerifying(true);
    setVerifyResult(null);
    await new Promise(r => setTimeout(r, 1800));
    verifyIntegrity(id);
    setVerifyResult('verified');
    setVerifying(false);
  };

  const handleTamper = () => {
    simulateTampering(id);
    setVerifyResult(null);
    setActiveTab('details');
  };

  const handleRestore = () => {
    restoreOriginal(id);
    setVerifyResult('restored');
  };

  const handleGenerateCert = () => {
    const cert = generateCertificate({
      caseId: doc.caseId,
      caseNumber: doc.caseId,
      documentId: doc.id,
      documentName: doc.name,
      documentHash: doc.sha256,
      storageRef: doc.storageRef,
      verificationStatus: 'Verified',
      blockchainTx: doc.blockchainTx,
      signatoryName: state.currentUser.name,
      signatoryDesignation: state.currentUser.role,
      signatoryBadge: state.currentUser.badge,
    });
    navigate('/certificates');
  };

  const handleDownload = async () => {
    try {
      const blob = await api.downloadDocument(doc.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.name || 'document.pdf';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download error:', err);
    }
  };

  const handleConfirmField = (field) => {
    setReviewValues(v => ({ ...v, [field]: true }));
    setReviewField(null);
  };

  const tabs = [
    { id: 'details', label: 'Details' },
    { id: 'ai', label: 'AI Extraction' },
    { id: 'versions', label: 'Versions', count: doc.versions?.length },
    { id: 'audit', label: 'Audit History', count: docAudit.length },
    { id: 'signatures', label: 'Signatures', count: doc.signatures?.length },
    { id: 'custody', label: 'Chain of Custody' },
  ];

  const classVariant = { 'Top Secret': 'danger', Confidential: 'warning', Restricted: 'info', 'Public Court Record': 'success' };

  return (
    <div className="p-5">
      <PageHeader
        title={doc.name}
        subtitle={`${doc.type} · Case ${doc.caseId}`}
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Documents', href: '/documents' },
          { label: doc.name },
        ]}
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => navigate('/documents')}>
              <ArrowLeft size={13} /> Back
            </Button>
            <Button variant="secondary" size="sm" onClick={handleDownload}>
              <Download size={13} /> Download
            </Button>
          </div>
        }
      />

      {/* Status Alerts */}
      {currentDoc.integrityStatus === 'Tampered' && (
        <Alert type="danger" className="mb-4">
          <strong>⚠ INTEGRITY MISMATCH DETECTED</strong> — This document's current hash does not match the blockchain record. The document may have been altered.
        </Alert>
      )}
      {doc.humanReviewRequired && (
        <Alert type="warning" className="mb-4">
          <strong>HUMAN REVIEW REQUIRED</strong> — AI classification confidence is {doc.aiClassification?.confidence}%, below the threshold. Please review the extracted fields.
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Preview Panel */}
        <div className="lg:col-span-1 space-y-3">
          {/* Document Preview */}
          <Card>
            <div className="text-xs font-semibold text-[#475569] uppercase tracking-wide mb-3">Document Preview</div>
            <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded overflow-hidden flex flex-col items-center justify-center min-h-48">
              {!previewUrl && !previewError && (
                <div className="py-10 flex flex-col items-center gap-2">
                  <Spinner size="sm" />
                  <div className="text-xs text-slate-400">Loading preview...</div>
                </div>
              )}

              {previewUrl && doc.mimeType?.startsWith('image/') && (
                <img src={previewUrl} alt={doc.name} className="w-full max-h-72 object-contain" />
              )}

              {previewUrl && doc.mimeType?.startsWith('video/') && (
                <video src={previewUrl} controls className="w-full max-h-72" />
              )}

              {previewUrl && doc.mimeType?.startsWith('audio/') && (
                <audio src={previewUrl} controls className="w-full my-6 px-3" />
              )}

              {previewUrl && doc.mimeType === 'application/pdf' && (
                <iframe src={previewUrl} title={doc.name} className="w-full h-72 border-0" />
              )}

              {previewUrl && doc.mimeType?.startsWith('text/') && (
                <iframe src={previewUrl} title={doc.name} className="w-full h-56 border-0 bg-white" />
              )}

              {(previewError || (previewUrl && !doc.mimeType?.startsWith('image/') && !doc.mimeType?.startsWith('video/') && !doc.mimeType?.startsWith('audio/') && doc.mimeType !== 'application/pdf' && !doc.mimeType?.startsWith('text/'))) && (
                <div className="py-10 flex flex-col items-center gap-2">
                  <FileText size={32} className="text-slate-300" />
                  <div className="text-sm text-[#475569] font-medium">{doc.name}</div>
                  <div className="text-xs text-slate-400">{doc.type} · {doc.size}</div>
                </div>
              )}

              <div className="w-full border-t border-[#E2E8F0] p-2 flex justify-center bg-white">
                <Button variant="ghost" size="sm" onClick={handleDownload}>
                  <Download size={13} /> Download
                </Button>
              </div>
            </div>
          </Card>

          {/* Key Metadata */}
          <Card>
            <div className="text-xs font-semibold text-[#475569] uppercase tracking-wide mb-3">Metadata</div>
            <div className="space-y-2">
              {[
                { label: 'Case', value: doc.caseId },
                { label: 'Type', value: doc.type },
                { label: 'Version', value: `v${doc.version}` },
                { label: 'Uploaded By', value: doc.uploadedBy },
                { label: 'Date', value: formatDateTime(doc.uploadDate) },
                { label: 'Size', value: doc.size },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between gap-2">
                  <span className="text-xs text-[#475569]">{label}</span>
                  <span className="text-xs font-medium text-[#1E293B] text-right">{value}</span>
                </div>
              ))}
              <div className="flex justify-between gap-2">
                <span className="text-xs text-[#475569]">Classification</span>
                <Badge variant={classVariant[doc.classification] || 'default'}>{doc.classification}</Badge>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-xs text-[#475569]">Integrity</span>
                <IntegrityBadge status={currentDoc.integrityStatus} />
              </div>
            </div>
          </Card>

          {/* Integrity Panel */}
          <Card>
            <div className="text-xs font-semibold text-[#475569] uppercase tracking-wide mb-3">Integrity & Blockchain</div>
            <HashDisplay hash={currentDoc.sha256} label="SHA-256 Hash" />
            <div className="mt-3 space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-[#475569]">Blockchain</span>
                <Badge variant="success">Confirmed</Badge>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-[#475569]">Transaction</span>
                <span className="font-mono text-[#1E293B]">{doc.blockchainTx}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-[#475569]">Status</span>
                <IntegrityBadge status={currentDoc.integrityStatus} />
              </div>
            </div>
          </Card>

          {/* Actions */}
          <Card>
            <div className="text-xs font-semibold text-[#475569] uppercase tracking-wide mb-3">Actions</div>
            <div className="space-y-2">
              <Button variant="primary" className="w-full justify-center" onClick={handleVerify} disabled={verifying}>
                {verifying ? <><Spinner size="sm" /> Verifying...</> : <><ShieldCheck size={13} /> Verify Integrity</>}
              </Button>
              {currentDoc.integrityStatus !== 'Tampered' ? (
                <Button variant="warning" className="w-full justify-center" onClick={handleTamper}>
                  <AlertTriangle size={13} /> Simulate Tampering
                </Button>
              ) : (
                <Button variant="success" className="w-full justify-center" onClick={handleRestore}>
                  <RotateCcw size={13} /> Restore Original
                </Button>
              )}
              <Button variant="secondary" className="w-full justify-center" onClick={handleGenerateCert}>
                <Award size={13} /> Generate Certificate
              </Button>
              <Button variant="ghost" className="w-full justify-center" onClick={() => navigate('/audit')}>
                <ClipboardList size={13} /> View Audit Trail
              </Button>
              <Button variant="ghost" className="w-full justify-center" onClick={() => navigate(`/documents/${id}?tab=versions`)}>
                <GitBranch size={13} /> Create Version
              </Button>
            </div>
          </Card>
        </div>

        {/* Main Tabs */}
        <div className="lg:col-span-2">
          {/* Verify Result Banner */}
          {verifyResult === 'verified' && (
            <div className="mb-3 flex items-center gap-2 bg-green-50 border border-green-200 rounded p-3">
              <CheckCircle size={16} className="text-green-600" />
              <div>
                <div className="text-sm font-semibold text-green-800">INTEGRITY VERIFIED</div>
                <div className="text-xs text-green-700">SHA-256 hash matches blockchain record {doc.blockchainTx}</div>
              </div>
            </div>
          )}
          {currentDoc.integrityStatus === 'Tampered' && (
            <div className="mb-3 bg-red-50 border border-red-200 rounded p-3">
              <div className="flex items-center gap-2 mb-2">
                <XCircle size={16} className="text-red-600" />
                <span className="text-sm font-bold text-red-800">INTEGRITY MISMATCH</span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                <div>
                  <div className="text-red-700 font-medium mb-1">Original Hash (Blockchain)</div>
                  <div className="bg-red-100 rounded p-2 break-all text-red-800">{doc.sha256.substring(0, 32)}...</div>
                </div>
                <div>
                  <div className="text-red-700 font-medium mb-1">Calculated Hash (Current)</div>
                  <div className="bg-red-100 rounded p-2 break-all text-red-800">91cd3f2b772a8e4a1c5d6e7f8a9b0c1d...</div>
                </div>
              </div>
            </div>
          )}

          <Card noPad>
            <Tabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
            <div className="p-4">
              {activeTab === 'details' && (
                <div className="space-y-4">
                  <div>
                    <div className="text-xs font-semibold text-[#475569] uppercase tracking-wide mb-2">Description</div>
                    <p className="text-sm text-[#1E293B]">{doc.description || 'No description provided.'}</p>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-[#475569] uppercase tracking-wide mb-2">Storage Reference</div>
                    <div className="font-mono text-xs bg-[#F8FAFC] border border-[#E2E8F0] rounded px-3 py-2 break-all text-[#475569]">
                      {doc.storageRef}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-[#475569] uppercase tracking-wide mb-2">Access Level</div>
                    <div className="text-sm text-[#1E293B]">{doc.accessLevel}</div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-[#475569] uppercase tracking-wide mb-2">AI Classification</div>
                    <div className="flex items-center gap-3">
                      <Badge variant="info">{doc.aiClassification?.type}</Badge>
                      <div className="flex-1 bg-[#F1F5F9] rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${doc.aiClassification?.confidence >= 80 ? 'bg-green-500' : doc.aiClassification?.confidence >= 60 ? 'bg-amber-500' : 'bg-red-500'}`}
                          style={{ width: `${doc.aiClassification?.confidence}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium text-[#1E293B]">{doc.aiClassification?.confidence}%</span>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'ai' && (
                <div className="space-y-4">
                  {doc.humanReviewRequired && (
                    <Alert type="warning">
                      <strong>HUMAN REVIEW REQUIRED</strong> — Confidence {doc.aiClassification?.confidence}% is below threshold. Review each extracted field below.
                    </Alert>
                  )}
                  <div>
                    <div className="text-xs font-semibold text-[#475569] uppercase tracking-wide mb-3">Extracted Fields</div>
                    <div className="space-y-2">
                      {Object.entries(doc.aiExtraction || {}).filter(([k]) => k !== 'confidence').map(([key, value]) => (
                        <div key={key} className={`flex items-center justify-between gap-3 py-2 px-3 rounded border ${reviewValues[key] ? 'border-green-200 bg-green-50' : 'border-[#E2E8F0] bg-[#F8FAFC]'}`}>
                          <div className="flex-1">
                            <div className="text-xs font-medium text-[#475569] uppercase">{key.replace(/([A-Z])/g, ' $1').trim()}</div>
                            <div className="text-sm text-[#1E293B] mt-0.5">
                              {Array.isArray(value) ? value.join(', ') : value?.toString() || '—'}
                            </div>
                          </div>
                          {doc.humanReviewRequired && (
                            reviewValues[key] ? (
                              <Badge variant="success">✓ Confirmed</Badge>
                            ) : (
                              <Button variant="ghost" size="sm" onClick={() => handleConfirmField(key)}>
                                Confirm
                              </Button>
                            )
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-xs text-[#475569]">Overall AI Confidence:</div>
                    <div className={`text-sm font-bold ${doc.aiExtraction?.confidence >= 80 ? 'text-green-700' : 'text-amber-700'}`}>
                      {doc.aiExtraction?.confidence}%
                    </div>
                    {doc.aiExtraction?.confidence < 70 && <Badge variant="warning">Low Confidence</Badge>}
                  </div>
                </div>
              )}

              {activeTab === 'versions' && (
                <div>
                  <div className="text-xs font-semibold text-[#475569] uppercase tracking-wide mb-3">Version History</div>
                  <div className="space-y-0">
                    {(doc.versions || []).map((v, i) => (
                      <div key={i} className={`flex items-start gap-3 py-3 border-b border-[#F1F5F9] last:border-0 ${i === 0 ? 'bg-blue-50/50 -mx-1 px-1 rounded' : ''}`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${i === 0 ? 'bg-[#0F2747] text-white' : 'bg-[#F1F5F9] text-[#475569]'}`}>
                          v{v.version}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-[#1E293B]">Version {v.version}</span>
                            {i === 0 && <Badge variant="info">Current</Badge>}
                          </div>
                          <div className="text-xs text-[#475569] mt-0.5">{v.notes}</div>
                          <div className="text-xs text-slate-400 mt-0.5">{v.uploadedBy} · {formatDateTime(v.date)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'audit' && (
                <div>
                  <div className="text-xs font-semibold text-[#475569] uppercase tracking-wide mb-3">Audit History</div>
                  {docAudit.length === 0 ? (
                    <div className="text-center py-6 text-sm text-[#475569]">No audit events for this document</div>
                  ) : (
                    <Timeline
                      events={docAudit.map(ev => ({
                        title: ev.action,
                        subtitle: `${ev.actor} (${ev.role}) · ${ev.result}`,
                        time: formatDateTime(ev.timestamp),
                        details: ev.details,
                        color: ev.result === 'Success' || ev.result === 'Verified' ? 'bg-green-500' : ev.result === 'Denied' ? 'bg-red-500' : 'bg-amber-500',
                      }))}
                    />
                  )}
                </div>
              )}

              {activeTab === 'signatures' && (
                <div>
                  <div className="text-xs font-semibold text-[#475569] uppercase tracking-wide mb-3">Digital Signatures</div>
                  {(!doc.signatures || doc.signatures.length === 0) ? (
                    <div className="text-center py-6 text-sm text-[#475569]">No signatures on this document</div>
                  ) : (
                    <div className="space-y-3">
                      {doc.signatures.map((sig, i) => (
                        <div key={i} className="border border-[#E2E8F0] rounded p-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-[#0F2747] text-white flex items-center justify-center text-xs font-bold">
                                {sig.signedBy.split(' ').map(n => n[0]).join('').substring(0, 2)}
                              </div>
                              <div>
                                <div className="text-sm font-medium text-[#1E293B]">{sig.signedBy}</div>
                                <div className="text-xs text-[#475569]">{formatDateTime(sig.date)}</div>
                              </div>
                            </div>
                            <Badge variant={sig.status === 'Valid' ? 'success' : 'danger'}>{sig.status}</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'custody' && (
                <div>
                  <div className="text-xs font-semibold text-[#475569] uppercase tracking-wide mb-3">Chain of Custody</div>
                  <div className="text-sm text-[#475569]">
                    Related evidence items for this document:
                  </div>
                  {state.evidence.filter(e => e.relatedDocuments?.includes(id)).length === 0 ? (
                    <div className="text-center py-6 text-sm text-[#475569] mt-3">No directly linked evidence items</div>
                  ) : (
                    state.evidence
                      .filter(e => e.relatedDocuments?.includes(id))
                      .map(ev => (
                        <div key={ev.id} className="mt-3 border border-[#E2E8F0] rounded p-3 cursor-pointer hover:bg-[#F8FAFC]" onClick={() => navigate('/chain-of-custody')}>
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-mono text-xs text-[#475569]">{ev.id}</div>
                              <div className="text-sm text-[#1E293B]">{ev.description.substring(0, 50)}...</div>
                            </div>
                            <ChevronRight size={14} className="text-[#475569]" />
                          </div>
                        </div>
                      ))
                  )}
                  <div className="mt-3">
                    <Button variant="secondary" size="sm" onClick={() => navigate('/chain-of-custody')}>
                      <ChevronRight size={13} /> View Full Chain of Custody
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
