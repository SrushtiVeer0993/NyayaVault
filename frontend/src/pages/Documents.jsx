import { useState, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Upload, FileText, Check } from 'lucide-react';
import {
  PageHeader, Card, SearchBar, Select, Table, Badge,
  Button, Modal, Input, IntegrityBadge, formatDate, formatDateTime,
} from '../components/ui';
import { DOCUMENT_TYPES } from '../data/mockData';

export default function Documents() {
  const { state, addDocument } = useApp();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const fileInputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [caseFilter, setCaseFilter] = useState(searchParams.get('case') || 'All');

  useEffect(() => {
    const caseParam = searchParams.get('case');
    if (caseParam) {
      setCaseFilter(caseParam);
      setUploadForm((prev) => ({ ...prev, caseId: caseParam }));
    }
  }, [searchParams]);
  const [integrityFilter, setIntegrityFilter] = useState('All');
  const [classFilter, setClassFilter] = useState('All');
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    name: '',
    type: DOCUMENT_TYPES[0],
    caseId: (caseFilter !== 'All' ? caseFilter : state.cases[0]?.id) || '',
    classification: 'Confidential',
    accessLevel: 'Case Team',
    description: '',
    size: '0 KB',
  });

  const filtered = state.documents.filter((d) => {
    const nameStr = (d.name || d.title || '').toLowerCase();
    const typeStr = (d.type || '').toLowerCase();
    const officerStr = (d.uploadedBy || '').toLowerCase();
    const q = search.toLowerCase();

    const matchSearch = !search || nameStr.includes(q) || typeStr.includes(q) || officerStr.includes(q);
    const matchType = typeFilter === 'All' || d.type === typeFilter;
    const matchCase = caseFilter === 'All' || d.caseId === caseFilter;
    const matchIntegrity = integrityFilter === 'All' || d.integrityStatus === integrityFilter;
    const matchClass = classFilter === 'All' || d.classification === classFilter;
    return matchSearch && matchType && matchCase && matchIntegrity && matchClass;
  });

  const handleFileSelected = (e) => {
    const f = e.target.files?.[0];
    if (f) {
      setSelectedFile(f);
      setUploadForm((prev) => ({
        ...prev,
        name: f.name.replace(/\.[^/.]+$/, ''),
        size: `${Math.round(f.size / 1024)} KB`,
      }));
    }
  };

  const handleUpload = async () => {
    if (!uploadForm.name.trim()) return;
    const targetCaseId = uploadForm.caseId || state.cases[0]?.id || 'case_mh_01428';
    await addDocument(
      {
        name: uploadForm.name,
        type: uploadForm.type,
        caseId: targetCaseId,
        classification: uploadForm.classification,
        accessLevel: uploadForm.accessLevel,
        description: uploadForm.description,
        size: uploadForm.size || '120 KB',
      },
      selectedFile
    );
    setUploadSuccess(true);
    setTimeout(() => {
      setUploadOpen(false);
      setUploadSuccess(false);
      setSelectedFile(null);
      setUploadForm({
        name: '',
        type: DOCUMENT_TYPES[0],
        caseId: state.cases[0]?.id || '',
        classification: 'Confidential',
        accessLevel: 'Case Team',
        description: '',
        size: '0 KB',
      });
    }, 1500);
  };

  const columns = [
    {
      header: 'Document',
      key: 'name',
      render: doc => (
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
            <FileText size={15} className="text-[#0F2747]" />
          </div>
          <div>
            <div className="font-semibold text-[#0F2747] text-sm hover:underline cursor-pointer">{doc.name}</div>
            <div className="text-xs text-slate-400">{doc.size || '142 KB'} · {doc.caseNumber || doc.caseId}</div>
          </div>
        </div>
      ),
    },
    {
      header: 'Type',
      key: 'type',
      render: doc => <Badge variant="secondary">{doc.type || doc.documentType}</Badge>,
    },
    {
      header: 'Case',
      key: 'caseId',
      render: doc => <span className="font-mono text-xs text-[#0F2747] font-medium">{doc.caseId}</span>,
    },
    {
      header: 'Version',
      key: 'version',
      render: doc => <span className="font-mono text-xs text-slate-500">v{doc.version || '1.0'}</span>,
    },
    {
      header: 'Uploaded By',
      key: 'uploadedBy',
      render: doc => <span className="text-xs text-[#475569]">{doc.uploadedBy || 'Investigating Officer'}</span>,
    },
    {
      header: 'Upload Date',
      key: 'uploadDate',
      render: doc => <span className="text-xs text-slate-400">{doc.uploadDate ? formatDateTime(doc.uploadDate) : 'Recent'}</span>,
    },
    {
      header: 'Integrity',
      key: 'integrityStatus',
      render: doc => <IntegrityBadge status={doc.integrityStatus} />,
    },
  ];

  return (
    <div className="p-5">
      <PageHeader
        title="Document Management"
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Documents' }]}
        action={
          <Button variant="primary" onClick={() => setUploadOpen(true)}>
            <Upload size={14} />
            Upload Document
          </Button>
        }
      />

      {/* Filters */}
      <Card className="mb-4">
        <div className="flex flex-wrap gap-3 items-end">
          <SearchBar value={search} onChange={setSearch} placeholder="Search by name, type, officer..." className="w-60" />
          <Select label="Type" value={typeFilter} onChange={setTypeFilter} options={['All', ...DOCUMENT_TYPES]} className="w-44" />
          <Select
            label="Case"
            value={caseFilter}
            onChange={setCaseFilter}
            options={['All', ...state.cases.map(c => ({ value: c.id, label: c.caseNumber || c.id }))]}
            className="w-48"
          />
          <Select label="Integrity" value={integrityFilter} onChange={setIntegrityFilter} options={['All', 'Verified', 'Tampered', 'Pending']} className="w-36" />
          <Select label="Classification" value={classFilter} onChange={setClassFilter} options={['All', 'Top Secret', 'Confidential', 'Restricted', 'Public Court Record']} className="w-44" />
        </div>
      </Card>

      {/* Documents Table */}
      <Card noPad>
        <Table
          columns={columns}
          data={filtered}
          onRowClick={d => navigate(`/documents/${d.id}`)}
          emptyMessage="No documents found in database. Click 'Upload Document' to add one."
        />
      </Card>

      {/* Upload Modal */}
      <Modal isOpen={uploadOpen} onClose={() => { setUploadOpen(false); setUploadSuccess(false); }} title="Upload Document" size="lg">
        {uploadSuccess ? (
          <div className="p-8 flex flex-col items-center justify-center gap-3">
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
              <Check size={24} className="text-green-600" />
            </div>
            <div className="text-sm font-semibold text-[#0F2747]">Document Uploaded Successfully</div>
            <div className="text-xs text-[#475569]">Hash recorded on blockchain. Cryptographic integrity secured.</div>
          </div>
        ) : (
          <div className="p-5 space-y-4">
            {/* Drop zone */}
            <input type="file" ref={fileInputRef} onChange={handleFileSelected} className="hidden" />
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-[#E2E8F0] hover:border-[#0F2747] cursor-pointer transition-colors rounded-lg p-6 text-center"
            >
              <Upload size={24} className="text-slate-400 mx-auto mb-2" />
              <div className="text-sm font-medium text-[#0F2747]">
                {selectedFile ? selectedFile.name : 'Click to browse or drop file here'}
              </div>
              <div className="text-xs text-slate-400 mt-1">Any file type — PDF, images, video, audio, text — up to 50MB</div>
            </div>
            <Input
              label="Document Title *"
              value={uploadForm.name}
              onChange={v => setUploadForm(f => ({ ...f, name: v }))}
              placeholder="e.g., FIR_01428_CyberCrime"
            />
            <div className="grid grid-cols-2 gap-3">
              <Select
                label="Document Type"
                value={uploadForm.type}
                onChange={v => setUploadForm(f => ({ ...f, type: v }))}
                options={DOCUMENT_TYPES}
              />
              <Select
                label="Case"
                value={uploadForm.caseId}
                onChange={v => setUploadForm(f => ({ ...f, caseId: v }))}
                options={state.cases.map(c => ({ value: c.id, label: `${c.caseNumber || c.id} — ${c.title}` }))}
              />
              <Select
                label="Classification"
                value={uploadForm.classification}
                onChange={v => setUploadForm(f => ({ ...f, classification: v }))}
                options={['Public Court Record', 'Restricted', 'Confidential', 'Top Secret']}
              />
              <Select
                label="Access Level"
                value={uploadForm.accessLevel}
                onChange={v => setUploadForm(f => ({ ...f, accessLevel: v }))}
                options={['Case Team', 'Case Team + Senior Officer', 'Case Team + Forensic', 'Senior Officer + Case Lead', 'Public Court Record']}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#475569] mb-1">Description</label>
              <textarea
                value={uploadForm.description}
                onChange={e => setUploadForm(f => ({ ...f, description: e.target.value }))}
                rows={2}
                placeholder="Brief description of the legal/investigation document..."
                className="w-full border border-[#E2E8F0] rounded px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-[#0F2747] resize-none"
              />
            </div>
            <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded p-3 text-xs text-[#475569]">
              <strong className="text-[#0F2747]">Upon upload:</strong> SHA-256 hash is computed, registered on the Hyperledger Fabric ledger, and queued for background OCR intelligence.
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setUploadOpen(false)}>Cancel</Button>
              <Button variant="primary" onClick={handleUpload} disabled={!uploadForm.name.trim()}>
                <Upload size={14} />
                Upload & Secure on Ledger
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
