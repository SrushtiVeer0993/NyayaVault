import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Lock, Mail, AlertCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';

export default function Login() {
  const { login } = useApp();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!email.trim() || !password.trim()) {
      setError('Please enter both email and password.');
      return;
    }
    setLoading(true);
    try {
      await login(email.trim(), password);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err?.message || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0F2747] px-4">
      <div className="w-full max-w-sm bg-white rounded-xl shadow-xl p-8">
        <div className="flex flex-col items-center mb-6">
          <div className="w-12 h-12 rounded-full bg-[#0F2747] flex items-center justify-center mb-3">
            <Shield size={22} className="text-white" />
          </div>
          <h1 className="text-lg font-bold text-[#0F2747]">NyayaVault</h1>
          <p className="text-xs text-slate-400 mt-1">Secure Digital Legal & Investigation Vault</p>
        </div>

        {error && (
          <div className="mb-4 flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-xs rounded px-3 py-2">
            <AlertCircle size={14} />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#475569] mb-1">Email</label>
            <div className="relative">
              <Mail size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@nyayavault.gov.in"
                autoComplete="username"
                className="w-full border border-[#E2E8F0] rounded pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#0F2747]"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-[#475569] mb-1">Password</label>
            <div className="relative">
              <Lock size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="********"
                autoComplete="current-password"
                className="w-full border border-[#E2E8F0] rounded pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#0F2747]"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#0F2747] text-white text-sm font-semibold rounded py-2.5 hover:bg-[#0c1e38] transition-colors disabled:opacity-60"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="mt-6 bg-[#F8FAFC] border border-[#E2E8F0] rounded p-3 text-[11px] text-slate-500 space-y-1">
          <div className="font-semibold text-[#0F2747] mb-1">Demo Accounts</div>
          <div>admin@nyayavault.gov.in</div>
          <div>investigator@nyayavault.gov.in</div>
          <div>forensics@nyayavault.gov.in</div>
          <div>senior@nyayavault.gov.in</div>
          <div className="pt-1">Password: <span className="font-mono">NyayaVault@2026</span></div>
        </div>
      </div>
    </div>
  );
}