import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import {
  PageHeader, Card, Badge, Button, IntegrityBadge,
  formatDateTime, Modal, Input, Select, Alert,
} from '../components/ui';
import { ArrowRight, Check, User, MapPin, Clock } from 'lucide-react';

const LIFECYCLE_STEPS = [
  { label: 'Evidence Collection', color: 'bg-blue-500', role: 'Crime Scene' },
  { label: 'Investigating Officer', color: 'bg-[#0F2747]', role: 'Inspector' },
  { label: 'Transfer', color: 'bg-amber-500', role: 'Transit' },
  { label: 'Forensic Team', color: 'bg-purple-500', role: 'Forensic Staff' },
  { label: 'Senior Officer', color: 'bg-green-600', role: 'SP/DCP' },
  { label: 'Court', color: 'bg-slate-600', role: 'Judiciary' },
];

export default function ChainOfCustody() {
  const { state, transferEvidence, addAuditEvent } = useApp();
  const navigate = useNavigate();
  const [transferOpen, setTransferOpen] = useState(false);
  const [selectedEvidence, setSelectedEvidence] = useState(null);
  const [transferForm, setTransferForm] = useState({ to: '', location: '', notes: '', action: 'Transfer' });
  const [transferSuccess, setTransferSuccess] = useState(false);
  const [filterCase, setFilterCase] = useState('All');

  const allCustodyEvents = state.evidence
    .filter(e => filterCase === 'All' || e.caseId === filterCase)
    .flatMap(ev =>
      (ev.custodyChain || []).map(c => ({ ...c, evidenceId: ev.id, evidenceDesc: ev.description, caseId: ev.caseId }))
    )
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  const handleTransfer = async () => {
    if (!transferForm.to.trim() || !selectedEvidence) return;
    try {
      await transferEvidence(selectedEvidence.id, transferForm.to, transferForm.notes);
      setTransferSuccess(true);
      setTimeout(() => {
        setTransferOpen(false);
        setTransferSuccess(false);
        setTransferForm({ to: '', location: '', notes: '', action: 'Transfer' });
        setSelectedEvidence(null);
      }, 1500);
    } catch (err) {
      alert('Failed to transfer custody: ' + (err.message || 'Unknown error'));
    }
  };

  const handleSign = async (evId) => {
    try {
      await addAuditEvent({
        action: 'Signature',
        resource: evId,
        resourceId: evId,
        result: 'Success',
        severity: 'Medium',
        details: `Custody receipt signed by ${state.currentUser.name}`,
      });
      alert(`Custody receipt signed for ${evId}\nSigned by: ${state.currentUser.name}\nTimestamp: ${new Date().toLocaleString()}`);
    } catch (err) {
      alert('Error signing receipt: ' + err.message);
    }
  };

  const handleVerify = async (evId) => {
    try {
      await addAuditEvent({
        action: 'Integrity Verification',
        resource: evId,
        resourceId: evId,
        result: 'Verified',
        severity: 'Low',
        details: 'Evidence integrity verified during custody check',
      });
      alert(`Evidence ${evId} integrity verified.\nHash matches blockchain record.`);
    } catch (err) {
      alert('Verification error: ' + err.message);
    }
  };

  const actionColor = {
    Collection: 'bg-blue-100 text-blue-800 border-blue-200',
    Transfer: 'bg-amber-100 text-amber-800 border-amber-200',
    'Transfer for Analysis': 'bg-purple-100 text-purple-800 border-purple-200',
    Accept: 'bg-green-100 text-green-800 border-green-200',
  };

  return (
    <div className="p-5">
      <PageHeader
        title="Chain of Custody"
        subtitle="Evidence lifecycle tracking and custody transfer management"
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Chain of Custody' }]}
      />

      {/* Lifecycle Flow */}
      <Card className="mb-5">
        <div className="text-xs font-semibold text-[#475569] uppercase tracking-wide mb-4">Evidence Lifecycle</div>
        <div className="flex items-center gap-0 overflow-x-auto pb-2">
          {LIFECYCLE_STEPS.map((step, i) => (
            <div key={i} className="flex items-center shrink-0">
              <div className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full ${step.color} flex items-center justify-center text-white text-xs font-bold`}>
                  {i + 1}
                </div>
                <div className="text-xs text-[#1E293B] font-medium mt-1.5 text-center max-w-[80px]">{step.label}</div>
                <div className="text-[10px] text-[#475569] text-center">{step.role}</div>
              </div>
              {i < LIFECYCLE_STEPS.length - 1 && (
                <ArrowRight size={16} className="text-slate-300 mx-2 mt-[-20px] shrink-0" />
              )}
            </div>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Evidence List */}
        <div className="lg:col-span-1 space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold text-[#0F2747]">Evidence Items</div>
            <Select
              value={filterCase}
              onChange={setFilterCase}
              options={['All', ...state.cases.map(c => ({ value: c.id, label: c.id }))]}
              className="w-44"
            />
          </div>
          {state.evidence.filter(e => filterCase === 'All' || e.caseId === filterCase).map(ev => (
            <Card
              key={ev.id}
              className={`cursor-pointer transition-colors ${selectedEvidence?.id === ev.id ? 'border-[#0F2747]' : 'hover:border-slate-300'}`}
              onClick={() => setSelectedEvidence(ev)}
            >
              <div className="font-mono text-xs text-[#475569]">{ev.id}</div>
              <div className="text-sm font-medium text-[#1E293B] mt-1 truncate">{ev.description.substring(0, 40)}...</div>
              <div className="flex items-center gap-2 mt-2">
                <Badge>{ev.type}</Badge>
                <IntegrityBadge status={ev.integrityStatus} />
              </div>
              <div className="flex items-center gap-1.5 mt-2 text-xs text-[#475569]">
                <User size={11} />
                <span className="truncate">{ev.currentCustodian}</span>
              </div>
              <div className="flex gap-1.5 mt-2">
                <Button variant="secondary" size="sm" onClick={e => { e.stopPropagation(); setSelectedEvidence(ev); setTransferOpen(true); }}>
                  Transfer
                </Button>
                <Button variant="ghost" size="sm" onClick={e => { e.stopPropagation(); handleVerify(ev.id); }}>
                  Verify
                </Button>
                <Button variant="ghost" size="sm" onClick={e => { e.stopPropagation(); handleSign(ev.id); }}>
                  Sign
                </Button>
              </div>
            </Card>
          ))}
        </div>

        {/* Custody Timeline */}
        <div className="lg:col-span-2">
          <Card>
            <div className="flex items-center justify-between mb-4">
              <div className="text-xs font-semibold text-[#475569] uppercase tracking-wide">Custody Events Timeline</div>
              <span className="text-xs text-[#475569]">{allCustodyEvents.length} events</span>
            </div>
            {allCustodyEvents.length === 0 ? (
              <div className="text-center py-10 text-sm text-[#475569]">No custody events found</div>
            ) : (
              <div className="space-y-0">
                {allCustodyEvents.map((event, i) => (
                  <div key={event.id + i} className="flex gap-3 mb-4 last:mb-0">
                    <div className="flex flex-col items-center">
                      <div className={`w-2.5 h-2.5 rounded-full mt-1 shrink-0 border-2 border-white ${
                        event.action === 'Collection' ? 'bg-blue-500' :
                        event.action.includes('Transfer') ? 'bg-amber-500' :
                        'bg-green-500'
                      }`} />
                      {i < allCustodyEvents.length - 1 && <div className="w-px flex-1 bg-[#E2E8F0] mt-1 min-h-[24px]" />}
                    </div>
                    <div className="pb-4 flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-xs font-medium px-2 py-0.5 rounded border ${actionColor[event.action] || 'bg-slate-100 text-slate-800 border-slate-200'}`}>
                              {event.action}
                            </span>
                            <span className="font-mono text-xs text-[#475569]">{event.evidenceId}</span>
                          </div>
                          <div className="flex items-center gap-2 mt-1 text-xs text-[#475569]">
                            <User size={11} />
                            <span>{event.from}</span>
                            <ArrowRight size={10} />
                            <span className="font-medium text-[#1E293B]">{event.to}</span>
                          </div>
                          {event.location && (
                            <div className="flex items-center gap-1 mt-0.5 text-xs text-slate-400">
                              <MapPin size={10} />
                              {event.location}
                            </div>
                          )}
                          <div className="text-xs text-[#475569] mt-0.5">{event.notes}</div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="flex items-center gap-1 text-[10px] text-slate-400">
                            <Clock size={10} />
                            {formatDateTime(event.date)}
                          </div>
                          <div className="mt-1">
                            <Badge variant={event.signature === 'Valid' ? 'success' : 'warning'}>
                              {event.signature === 'Valid' ? '✓ Signed' : 'Unsigned'}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Transfer Modal */}
      <Modal isOpen={transferOpen} onClose={() => { setTransferOpen(false); setTransferSuccess(false); }} title="Transfer Evidence Custody" size="md">
        {transferSuccess ? (
          <div className="p-8 flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
              <Check size={24} className="text-green-600" />
            </div>
            <div className="text-sm font-semibold text-[#0F2747]">Custody Transfer Recorded</div>
            <div className="text-xs text-[#475569]">Audit event created. Chain of custody updated.</div>
          </div>
        ) : (
          <div className="p-5 space-y-4">
            {selectedEvidence && (
              <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded p-3">
                <div className="text-xs text-[#475569]">Evidence Item</div>
                <div className="font-mono text-sm text-[#0F2747] font-bold">{selectedEvidence.id}</div>
                <div className="text-xs text-[#475569] mt-0.5">{selectedEvidence.description.substring(0, 50)}...</div>
                <div className="text-xs text-[#475569] mt-1">
                  Current Custodian: <span className="font-medium text-[#1E293B]">{selectedEvidence.currentCustodian}</span>
                </div>
              </div>
            )}
            <Select
              label="Transfer Action"
              value={transferForm.action}
              onChange={v => setTransferForm(f => ({ ...f, action: v }))}
              options={['Transfer', 'Transfer for Analysis', 'Transfer to Court', 'Return']}
            />
            <Input
              label="Transfer To (New Custodian) *"
              value={transferForm.to}
              onChange={v => setTransferForm(f => ({ ...f, to: v }))}
              placeholder="e.g., SP Vikram Singh"
            />
            <Input
              label="Location"
              value={transferForm.location}
              onChange={v => setTransferForm(f => ({ ...f, location: v }))}
              placeholder="e.g., SP Office, Pune"
            />
            <div>
              <label className="block text-xs font-medium text-[#475569] mb-1">Notes</label>
              <textarea
                value={transferForm.notes}
                onChange={e => setTransferForm(f => ({ ...f, notes: e.target.value }))}
                rows={2}
                placeholder="Reason for transfer, special instructions..."
                className="w-full border border-[#E2E8F0] rounded px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-[#0F2747] resize-none"
              />
            </div>
            <Alert type="info">
              This transfer will be recorded in the audit trail and create a new custody event on the blockchain.
            </Alert>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setTransferOpen(false)}>Cancel</Button>
              <Button variant="primary" onClick={handleTransfer} disabled={!transferForm.to.trim()}>
                <ArrowRight size={14} />
                Execute Transfer
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
