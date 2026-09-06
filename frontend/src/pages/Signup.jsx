import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const roles = ['Investigating Officer', 'Forensic Staff', 'Senior Officer'];
const initialForm = {
  full_name: '', email: '', password: '', employee_id: '', department: '', designation: '',
  posting_location: '', requested_role: roles[0], justification: '', supporting_document_name: '',
};

export default function Signup() {
  const { isAuthenticated, signup } = useAuth();
  const [form, setForm] = useState(initialForm);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const response = await signup({ ...form, supporting_document_name: form.supporting_document_name || null });
      setResult(response);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    return (
      <main className="min-h-screen bg-[#071322] flex items-center justify-center px-4 py-10">
        <section className="w-full max-w-lg bg-white rounded-2xl shadow-2xl p-8">
          <div className="w-11 h-11 rounded-xl bg-emerald-600 flex items-center justify-center text-white mb-5"><ShieldCheck size={24} /></div>
          <h1 className="text-2xl font-bold text-slate-900">Request submitted</h1>
          <p className="mt-2 text-slate-600">An administrator must approve your account before you can sign in.</p>
          <dl className="mt-6 rounded-xl bg-slate-50 p-4 text-sm space-y-2">
            <div className="flex justify-between gap-4"><dt className="text-slate-500">Request ID</dt><dd className="font-mono text-slate-800">{result.id}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-slate-500">Role</dt><dd className="font-semibold text-slate-800">{result.requested_role}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-slate-500">Status</dt><dd className="font-semibold text-amber-700">Pending approval</dd></div>
          </dl>
          <Link to="/login" className="mt-6 block text-center rounded-lg bg-cyan-700 px-4 py-2.5 font-semibold text-white">Return to sign in</Link>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#071322] px-4 py-8">
      <section className="mx-auto max-w-3xl rounded-2xl bg-white p-6 shadow-2xl md:p-8">
        <div className="flex items-center gap-3 mb-6"><div className="w-10 h-10 rounded-xl bg-cyan-700 flex items-center justify-center text-white"><ShieldCheck size={22} /></div><div><h1 className="text-xl font-bold text-slate-900">Request NyayaVault access</h1><p className="text-sm text-slate-500">Your account is created only after administrator approval.</p></div></div>
        {error && <div className="mb-4 rounded-lg bg-rose-50 border border-rose-200 px-3 py-2 text-sm text-rose-700">{error}</div>}
        <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
          <label className="text-sm font-medium text-slate-700">Full name<input required value={form.full_name} onChange={(e) => update('full_name', e.target.value)} className="field" /></label>
          <label className="text-sm font-medium text-slate-700">Official email<input required type="email" value={form.email} onChange={(e) => update('email', e.target.value)} className="field" /></label>
          <label className="text-sm font-medium text-slate-700">Password<input required minLength="8" type="password" value={form.password} onChange={(e) => update('password', e.target.value)} className="field" /></label>
          <label className="text-sm font-medium text-slate-700">Employee / badge ID<input required value={form.employee_id} onChange={(e) => update('employee_id', e.target.value)} className="field" /></label>
          <label className="text-sm font-medium text-slate-700">Department<input required value={form.department} onChange={(e) => update('department', e.target.value)} className="field" /></label>
          <label className="text-sm font-medium text-slate-700">Designation<input required value={form.designation} onChange={(e) => update('designation', e.target.value)} className="field" /></label>
          <label className="text-sm font-medium text-slate-700">Posting location<input required value={form.posting_location} onChange={(e) => update('posting_location', e.target.value)} className="field" /></label>
          <label className="text-sm font-medium text-slate-700">Requested role<select value={form.requested_role} onChange={(e) => update('requested_role', e.target.value)} className="field">{roles.map((role) => <option key={role}>{role}</option>)}</select></label>
          <label className="text-sm font-medium text-slate-700 md:col-span-2">Supporting document filename (optional)<input value={form.supporting_document_name} onChange={(e) => update('supporting_document_name', e.target.value)} placeholder="Upload integration will be added next" className="field" /></label>
          <label className="text-sm font-medium text-slate-700 md:col-span-2">Why do you need access?<textarea required minLength="10" value={form.justification} onChange={(e) => update('justification', e.target.value)} className="field min-h-28" /></label>
          <div className="md:col-span-2 flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-between sm:items-center"><Link to="/login" className="text-sm font-semibold text-cyan-700">Already have an account?</Link><button disabled={submitting} className="rounded-lg bg-cyan-700 px-5 py-2.5 font-semibold text-white hover:bg-cyan-800 disabled:opacity-60">{submitting ? 'Submitting...' : 'Submit access request'}</button></div>
        </form>
      </section>
    </main>
  );
}
