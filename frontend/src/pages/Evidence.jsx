import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import {
  PageHeader, Card, SearchBar, Select, Badge, Button, IntegrityBadge,
  formatDate, Table, Modal, Input,
} from '../components/ui';
import { Package, ChevronRight, Plus } from 'lucide-react';
import { EVIDENCE_TYPES, EVIDENCE_STATUSES } from '../data/mockData';

export default function Evidence() {
  const { state, addEvidence } = useApp();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [caseFilter, setCaseFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedEvidence, setSelectedEvidence] = useState(null);

  // New evidence form
  const [registerOpen, setRegisterOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [newEvidence, setNewEvidence] = useState({
    caseId: state.cases[0]?.id || '',
    type: EVIDENCE_TYPES[0],
    description: '',
    currentCustodian: state.currentUser.name,
    storageLocation: 'Secure Evidence Locker A-1',
  });

  const filtered = state.evidence.filter(e => {
    const matchSearch = !search || e.id.toLowerCase().includes(search.toLowerCase()) || e.description.toLowerCase().includes(search.toLowerCase()) || (e.collectedBy && e.collectedBy.toLowerCase().includes(search.toLowerCase()));
    const matchType = typeFilter === 'All' || e.type === typeFilter;
    const matchCase = caseFilter === 'All' || e.caseId === caseFilter;
    const matchStatus = statusFilter === 'All' || e.status === statusFilter;
    return matchSearch && matchType && matchCase && matchStatus;
  });

  const handleRegisterEvidence = async (e) => {
    e.preventDefault();
    if (!newEvidence.description.trim()) return;
    setSubmitting(true);
    try {
      await addEvidence({
        caseId: newEvidence.caseId || state.cases[0]?.id,
        type: newEvidence.type,
        description: newEvidence.description,
        currentCustodian: newEvidence.currentCustodian,
        storageLocation: newEvidence.storageLocation,
      });
      setRegisterOpen(false);
      setNewEvidence({
        caseId: state.cases[0]?.id || '',
        type: EVIDENCE_TYPES[0],
        description: '',
        currentCustodian: state.currentUser.name,
        storageLocation: 'Secure Evidence Locker A-1',
      });
    } catch (err) {
      alert('Failed to register evidence: ' + (err.message || 'Unknown error'));
    } finally {
      setSubmitting(false);
    }
  };

  const statusVariant = {
    Collected: 'info',
    'In Analysis': 'warning',
    Verified: 'success',
    Transferred: 'medium',
    'Court Submitted': 'primary',
  };

  const columns = [
    { header: 'Evidence ID', key: 'id', render: e => <span className="font-mono text-xs text-[#475569]">{e.id}</span> },
    { header: 'Case', key: 'caseId', render: e => <span className="font-mono text-xs">{e.caseId}</span> },
    { header: 'Type', key: 'type', render: e => <Badge>{e.type}</Badge> },
    { header: 'Description', key: 'description', render: e => (
      <span className="text-sm text-[#1E293B]">{e.description.substring(0, 45)}...</span>
    )},
    { header: 'Collected By', key: 'collectedBy', render: e => <span className="text-xs">{e.collectedBy}</span> },
    { header: 'Collection Date', key: 'collectionDate', render: e => <span className="text-xs">{formatDate(e.collectionDate)}</span> },
    { header: 'Custodian', key: 'currentCustodian', render: e => <span className="text-xs">{e.currentCustodian}</span> },
    { header: 'Integrity', key: 'integrityStatus', render: e => <IntegrityBadge status={e.integrityStatus} /> },
    { header: 'Status', key: 'status', render: e => <Badge variant={statusVariant[e.status] || 'default'}>{e.status}</Badge> },
    { header: '', key: 'actions', render: e => (
      <Button variant="ghost" size="sm" onClick={ev => { ev.stopPropagation(); setSelectedEvidence(e); }}>
        <ChevronRight size={13} /> Detail
      </Button>
    )},
  ];

  return (
    <div className="p-5">
      <PageHeader
        title="Evidence Repository"
        subtitle={`${filtered.length} of ${state.evidence.length} evidence items`}
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Evidence' }]}
        actions={
          <Button variant="primary" onClick={() => setRegisterOpen(true)}>
            <Plus size={14} /> Register Evidence
          </Button>
        }
      />

      <Card className="mb-4">
        <div className="flex flex-wrap gap-3 items-end">
          <SearchBar value={search} onChange={setSearch} placeholder="Search evidence..." className="w-60" />
          <Select label="Type" value={typeFilter} onChange={setTypeFilter} options={['All', ...EVIDENCE_TYPES]} className="w-36" />
          <Select label="Case" value={caseFilter} onChange={setCaseFilter} options={['All', ...state.cases.map(c => ({ value: c.id, label: c.id }))]} className="w-48" />
          <Select label="Status" value={statusFilter} onChange={setStatusFilter} options={['All', ...EVIDENCE_STATUSES]} className="w-40" />
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className={selectedEvidence ? 'lg:col-span-2' : 'lg:col-span-3'}>
          <Card noPad>
            <Table
              columns={columns}
              data={filtered}
              onRowClick={e => setSelectedEvidence(e)}
              emptyMessage="No evidence items found"
            />
          </Card>
        </div>

        {/* Evidence Detail Panel */}
        {selectedEvidence && (
          <div className="lg:col-span-1">
            <Card>
              <div className="flex items-center justify-between mb-4">
                <div className="text-xs font-semibold text-[#475569] uppercase tracking-wide">Evidence Detail</div>
                <button onClick={() => setSelectedEvidence(null)} className="text-slate-400 hover:text-slate-600 text-xl cursor-pointer">&times;</button>
              </div>
              <div className="space-y-3">
                <div>
                  <div className="font-mono text-xs text-[#475569]">{selectedEvidence.id}</div>
                  <div className="font-medium text-[#1E293B] mt-1">{selectedEvidence.description}</div>
                </div>
                {[
                  { label: 'Type', value: <Badge>{selectedEvidence.type}</Badge> },
                  { label: 'Case', value: selectedEvidence.caseId },
                  { label: 'Status', value: <Badge variant={statusVariant[selectedEvidence.status] || 'default'}>{selectedEvidence.status}</Badge> },
                  { label: 'Integrity', value: <IntegrityBadge status={selectedEvidence.integrityStatus} /> },
                  { label: 'Collected By', value: selectedEvidence.collectedBy },
                  { label: 'Collection Date', value: formatDate(selectedEvidence.collectionDate) },
                  { label: 'Current Custodian', value: selectedEvidence.currentCustodian },
                  { label: 'Storage', value: selectedEvidence.storageLocation },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between gap-2">
                    <span className="text-xs text-[#475569]">{label}</span>
                    <div className="text-xs font-medium text-[#1E293B] text-right">{value}</div>
                  </div>
                ))}
                <div className="pt-2 space-y-1.5">
                  <Button variant="primary" size="sm" className="w-full justify-center" onClick={() => navigate('/chain-of-custody')}>
                    View Chain of Custody
                  </Button>
                  <Button variant="secondary" size="sm" className="w-full justify-center" onClick={() => navigate('/integrity')}>
                    Verify Integrity
                  </Button>
                </div>

                {/* Custody Timeline */}
                <div className="pt-2 border-t border-[#E2E8F0]">
                  <div className="text-xs font-semibold text-[#475569] uppercase tracking-wide mb-3">Custody Timeline</div>
                  <div className="space-y-3">
                    {(selectedEvidence.custodyChain || []).map((event, i) => (
                      <div key={event.id || i} className="flex gap-2">
                        <div className="flex flex-col items-center">
                          <div className={`w-2 h-2 rounded-full mt-1 ${i === (selectedEvidence.custodyChain || []).length - 1 ? 'bg-[#0F2747]' : 'bg-slate-300'}`} />
                          {i < (selectedEvidence.custodyChain || []).length - 1 && <div className="w-px flex-1 bg-[#E2E8F0] mt-1" />}
                        </div>
                        <div className="pb-3 flex-1">
                          <div className="text-xs font-medium text-[#1E293B]">{event.action}</div>
                          <div className="text-[10px] text-[#475569]">{event.from} → {event.to}</div>
                          <div className="text-[10px] text-slate-400">{event.notes}</div>
                        </div>
                      </div>
                    ))}
                    {(!selectedEvidence.custodyChain || selectedEvidence.custodyChain.length === 0) && (
                      <div className="text-xs text-slate-400 italic">No custody transfers recorded yet</div>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* Register Evidence Modal */}
      <Modal
        open={registerOpen}
        onClose={() => setRegisterOpen(false)}
        title="Register New Evidence"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setRegisterOpen(false)}>Cancel</Button>
            <Button variant="primary" disabled={submitting} onClick={handleRegisterEvidence}>
              {submitting ? 'Registering...' : 'Register Evidence'}
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <Select
            label="Associated Case"
            value={newEvidence.caseId}
            onChange={v => setNewEvidence({ ...newEvidence, caseId: v })}
            options={state.cases.map(c => ({ value: c.id, label: `${c.id} - ${c.title}` }))}
          />
          <Select
            label="Evidence Type"
            value={newEvidence.type}
            onChange={v => setNewEvidence({ ...newEvidence, type: v })}
            options={EVIDENCE_TYPES}
          />
          <div>
            <label className="block text-xs font-medium text-[#475569] mb-1">Description</label>
            <textarea
              className="w-full border border-[#E2E8F0] rounded p-2 text-sm focus:outline-none focus:border-[#0F2747]"
              rows={3}
              placeholder="Detailed description of evidence..."
              value={newEvidence.description}
              onChange={e => setNewEvidence({ ...newEvidence, description: e.target.value })}
            />
          </div>
          <Input
            label="Current Custodian"
            value={newEvidence.currentCustodian}
            onChange={e => setNewEvidence({ ...newEvidence, currentCustodian: e.target.value })}
          />
          <Input
            label="Secure Storage Location"
            value={newEvidence.storageLocation}
            onChange={e => setNewEvidence({ ...newEvidence, storageLocation: e.target.value })}
          />
        </div>
      </Modal>
    </div>
  );
}
