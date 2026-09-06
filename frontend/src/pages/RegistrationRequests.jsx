import { useEffect, useState } from 'react';
import { Check, X } from 'lucide-react';
import { api } from '../api/apiClient';
import { PageHeader } from '../components/ui/index.jsx';

export default function RegistrationRequests() {
  const [requests, setRequests] = useState([]);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);

  async function loadRequests() {
    try {
      setRequests(await api.getRegistrationRequests());
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => { loadRequests(); }, []);

  async function approve(id) {
    setBusyId(id);
    try { await api.approveRegistrationRequest(id); await loadRequests(); } catch (err) { setError(err.message); } finally { setBusyId(null); }
  }

  async function reject(request) {
    const reason = window.prompt('Reason for rejecting this request:');
    if (!reason) return;
    setBusyId(request.id);
    try { await api.rejectRegistrationRequest(request.id, reason); await loadRequests(); } catch (err) { setError(err.message); } finally { setBusyId(null); }
  }

  return (
    <div className="p-6 lg:p-8">
      <PageHeader title="Registration requests" subtitle="Review officer access requests before accounts are created." />
      {error && <div className="mb-5 rounded-lg bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700">{error}</div>}
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Applicant</th><th className="px-4 py-3">Role</th><th className="px-4 py-3">Department</th><th className="px-4 py-3">Details</th><th className="px-4 py-3">Action</th></tr></thead>
          <tbody className="divide-y divide-slate-100">{requests.map((request) => <tr key={request.id} className="align-top"><td className="px-4 py-4"><div className="font-semibold text-slate-900">{request.full_name}</div><div className="text-slate-500">{request.email}</div><div className="text-xs text-slate-400">{request.employee_id}</div></td><td className="px-4 py-4"><span className="rounded-full bg-cyan-50 px-2.5 py-1 text-xs font-semibold text-cyan-800">{request.requested_role}</span></td><td className="px-4 py-4 text-slate-700">{request.department}<div className="text-xs text-slate-400">{request.posting_location}</div></td><td className="max-w-sm px-4 py-4 text-slate-600"><div>{request.designation}</div><p className="mt-1 line-clamp-2 text-xs">{request.justification}</p>{request.supporting_document_name && <div className="mt-1 text-xs text-slate-400">Document: {request.supporting_document_name}</div>}</td><td className="px-4 py-4"><div className="flex gap-2"><button disabled={busyId === request.id} onClick={() => approve(request.id)} title="Approve request" className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"><Check size={14} />Approve</button><button disabled={busyId === request.id} onClick={() => reject(request)} title="Reject request" className="inline-flex items-center gap-1 rounded-lg bg-rose-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"><X size={14} />Reject</button></div></td></tr>)}{requests.length === 0 && <tr><td colSpan="5" className="px-4 py-12 text-center text-slate-500">No pending registration requests.</td></tr>}</tbody>
        </table>
      </div>
    </div>
  );
}
