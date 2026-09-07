import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { isAuthenticated, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (isAuthenticated) return <Navigate to={location.state?.from || '/dashboard'} replace />;

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(form.email, form.password);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#071322] flex items-center justify-center px-4 py-10">
      <section className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-11 h-11 rounded-xl bg-cyan-700 flex items-center justify-center text-white">
            <ShieldCheck size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">NyayaVault</h1>
            <p className="text-sm text-slate-500">Secure officer access</p>
          </div>
        </div>
        <h2 className="text-2xl font-bold text-slate-900">Sign in</h2>
        <p className="text-sm text-slate-500 mt-1 mb-6">Use your approved NyayaVault account.</p>
        {error && <div className="mb-4 rounded-lg bg-rose-50 border border-rose-200 px-3 py-2 text-sm text-rose-700">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block text-sm font-medium text-slate-700">Email<input required type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5" /></label>
          <label className="block text-sm font-medium text-slate-700">Password<input required type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5" /></label>
          <button disabled={submitting} className="w-full rounded-lg bg-cyan-700 px-4 py-2.5 font-semibold text-white hover:bg-cyan-800 disabled:opacity-60">{submitting ? 'Signing in...' : 'Sign in'}</button>
        </form>
        <p className="mt-4 text-center text-sm text-slate-500">Need access? <Link className="font-semibold text-cyan-700 hover:underline" to="/signup">Request an account</Link></p>

        <div className="mt-6 bg-slate-50 border border-slate-200 rounded-lg p-3 text-[11px] text-slate-500 space-y-1">
          <div className="font-semibold text-slate-700 mb-1">Demo Accounts</div>
          <div>admin@nyayavault.gov.in</div>
          <div>investigator@nyayavault.gov.in</div>
          <div>forensics@nyayavault.gov.in</div>
          <div>senior@nyayavault.gov.in</div>
          <div className="pt-1">Password: <span className="font-mono">NyayaVault@2026</span></div>
        </div>
      </section>
    </main>
  );
}