import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { api } from '../api/apiClient';
import {
  PageHeader, Card, SearchBar, Select, Badge, SeverityBadge,
  Timeline, formatDateTime, Button,
} from '../components/ui';
import { ShieldCheck, CheckCircle2, AlertOctagon } from 'lucide-react';

const ACTION_TYPES = [
  'All', 'Login', 'Logout', 'Upload', 'View', 'Download', 'Edit', 'Delete',
  'Version Creation', 'Signature', 'Transfer', 'Permission Change',
  'Integrity Verification', 'Integrity Failure', 'Certificate Generation',
  'Tamper Simulation', 'Access Denied', 'Restore Original', 'Role Switch',
  'Unauthorized Access Attempt', 'Case Created',
];

const SEVERITY_OPTIONS = ['All', 'Critical', 'High', 'Medium', 'Low'];
const VIEW_MODES = ['table', 'timeline'];

export default function AuditTrail() {
  const { state } = useApp();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [userFilter, setUserFilter] = useState('All');
  const [caseFilter, setCaseFilter] = useState('All');
  const [actionFilter, setActionFilter] = useState('All');
  const [severityFilter, setSeverityFilter] = useState('All');
  const [viewMode, setViewMode] = useState('table');
  const [verifyingChain, setVerifyingChain] = useState(false);
  const [chainResult, setChainResult] = useState(null);

  const users = ['All', ...new Set(state.auditEvents.map(e => e.actor).filter(Boolean))];
  const cases = ['All', ...new Set(state.auditEvents.map(e => e.caseId).filter(Boolean))];

  const filtered = state.auditEvents.filter(ev => {
    const matchSearch = !search || ev.actor?.toLowerCase().includes(search.toLowerCase()) || ev.action?.toLowerCase().includes(search.toLowerCase()) || ev.resource?.toLowerCase().includes(search.toLowerCase()) || ev.details?.toLowerCase().includes(search.toLowerCase());
    const matchUser = userFilter === 'All' || ev.actor === userFilter;
    const matchCase = caseFilter === 'All' || ev.caseId === caseFilter;
    const matchAction = actionFilter === 'All' || ev.action === actionFilter;
    const matchSeverity = severityFilter === 'All' || ev.severity === severityFilter;
    return matchSearch && matchUser && matchCase && matchAction && matchSeverity;
  });

  const handleVerifyChain = async () => {
    setVerifyingChain(true);
    try {
      const res = await api.verifyAuditChain();
      setChainResult(res);
    } catch (err) {
      setChainResult({ is_valid: false, message: 'Verification error: ' + (err.message || 'Unknown') });
    } finally {
      setVerifyingChain(false);
    }
  };

  const resultVariant = { Success: 'success', Denied: 'danger', Verified: 'success', 'Integrity Mismatch': 'danger', Restored: 'success', 'Alert Generated': 'warning' };
  const severityColor = { Critical: 'bg-red-500', High: 'bg-orange-500', Medium: 'bg-amber-500', Low: 'bg-slate-300' };

  const timelineEvents = filtered.map(ev => ({
    title: ev.action,
    subtitle: `${ev.actor} (${ev.role})${ev.resource ? ` · ${ev.resource}` : ''}`,
    time: formatDateTime(ev.timestamp),
    details: ev.details,
    color: severityColor[ev.severity] || 'bg-slate-300',
  }));

  return (
    <div className="p-5">
      <PageHeader
        title="Audit Trail"
        subtitle={`${filtered.length} of ${state.auditEvents.length} events recorded · Cryptographic Append-Only Ledger`}
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Audit Trail' }]}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={verifyingChain}
              onClick={handleVerifyChain}
            >
              <ShieldCheck size={14} className="text-blue-600" />
              {verifyingChain ? 'Verifying Chain...' : 'Verify Hash Chain'}
            </Button>
            <div className="flex gap-1 border border-[#E2E8F0] rounded p-0.5">
              {VIEW_MODES.map(mode => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`px-3 py-1 text-xs font-medium rounded cursor-pointer capitalize ${viewMode === mode ? 'bg-[#0F2747] text-white' : 'text-[#475569] hover:bg-[#F8FAFC]'}`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>
        }
      />

      {/* Cryptographic Chain Status Banner */}
      {chainResult && (
        <Card className={`mb-4 border-l-4 ${chainResult.is_valid ? 'border-l-green-600 bg-green-50/50' : 'border-l-red-600 bg-red-50/50'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {chainResult.is_valid ? (
                <CheckCircle2 className="text-green-600 shrink-0" size={24} />
              ) : (
                <AlertOctagon className="text-red-600 shrink-0" size={24} />
              )}
              <div>
                <div className="text-sm font-bold text-[#0F2747]">
                  {chainResult.is_valid ? 'Audit Hash Chain Verified & Tamper-Free' : 'Audit Chain Discrepancy Detected'}
                </div>
                <div className="text-xs text-[#475569] mt-0.5">
                  {chainResult.message} ({chainResult.verified_events || 0}/{chainResult.total_events || 0} event blocks verified)
                </div>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setChainResult(null)}>
              Dismiss
            </Button>
          </div>
        </Card>
      )}

      {/* Filters */}
      <Card className="mb-4">
        <div className="flex flex-wrap gap-3 items-end">
          <SearchBar value={search} onChange={setSearch} placeholder="Search events..." className="w-60" />
          <Select label="User" value={userFilter} onChange={setUserFilter} options={users} className="w-52" />
          <Select label="Case" value={caseFilter} onChange={setCaseFilter} options={cases} className="w-48" />
          <Select label="Action" value={actionFilter} onChange={setActionFilter} options={ACTION_TYPES} className="w-52" />
          <Select label="Severity" value={severityFilter} onChange={setSeverityFilter} options={SEVERITY_OPTIONS} className="w-36" />
        </div>
      </Card>

      {/* Content */}
      {viewMode === 'table' ? (
        <Card noPad>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#E2E8F0]">
                  {['Timestamp', 'Actor', 'Role', 'Action', 'Resource', 'Case', 'Result', 'Severity'].map(h => (
                    <th key={h} className="text-left py-2.5 px-3 text-xs font-semibold text-[#475569] uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-sm text-[#475569]">No audit events found</td>
                  </tr>
                ) : (
                  filtered.map(ev => (
                    <tr key={ev.id} className="border-b border-[#F1F5F9] last:border-0 hover:bg-[#F8FAFC]">
                      <td className="py-2.5 px-3 text-xs text-[#475569] whitespace-nowrap">{formatDateTime(ev.timestamp)}</td>
                      <td className="py-2.5 px-3 text-xs font-medium text-[#1E293B] whitespace-nowrap">{ev.actor || '—'}</td>
                      <td className="py-2.5 px-3 text-xs text-[#475569] whitespace-nowrap">{ev.role}</td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <Badge variant={ev.action.includes('Tamper') ? 'warning' : ev.action.includes('Unauthorized') || ev.action.includes('Denied') ? 'danger' : 'default'}>
                          {ev.action}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-3 text-xs text-[#475569] max-w-[150px] truncate">
                        {ev.resourceId ? (
                          <button
                            onClick={() => navigate(`/documents/${ev.resourceId}`)}
                            className="text-[#0369A1] hover:underline cursor-pointer text-left"
                          >
                            {ev.resource}
                          </button>
                        ) : ev.resource}
                      </td>
                      <td className="py-2.5 px-3 text-xs font-mono text-[#475569] whitespace-nowrap">
                        {ev.caseId ? (
                          <button onClick={() => navigate(`/cases/${ev.caseId}`)} className="text-[#0369A1] hover:underline cursor-pointer">
                            {ev.caseId}
                          </button>
                        ) : '—'}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <Badge variant={resultVariant[ev.result] || 'default'}>{ev.result}</Badge>
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <SeverityBadge severity={ev.severity} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <Card>
          <Timeline events={timelineEvents} />
        </Card>
      )}
    </div>
  );
}
