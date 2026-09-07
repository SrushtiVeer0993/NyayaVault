import { useApp } from '../context/AppContext';
import { getRoleProfile } from '../data/rolePermissions';
import { PageHeader, Card, Badge, formatDateTime } from '../components/ui';
import { ShieldCheck, CheckCircle2, Building2, IdCard, Mail, Award } from 'lucide-react';

export default function Profile() {
  const { state } = useApp();
  const { currentUser, currentRole } = state;

  const profile = getRoleProfile(currentRole);

  const stats = [
    { label: 'Documents', value: state.documents.length },
    { label: 'Cases', value: state.cases.length },
    { label: 'Evidence Items', value: state.evidence.length },
  ];

  return (
    <div className="p-5">
      <PageHeader
        title="My Profile"
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Profile' }]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: Identity Card */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <div className="flex flex-col items-center text-center py-3">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center text-white text-lg font-bold shadow-md"
                style={{ backgroundColor: profile.color }}
              >
                {profile.badge}
              </div>
              <div className="mt-3 text-base font-bold text-[#0F2747]">{currentUser?.name}</div>
              <div className="text-xs text-[#475569] mt-0.5">{currentUser?.designation || currentRole}</div>
              <span
                className="mt-2 text-[10px] font-bold px-2.5 py-1 rounded-full border"
                style={{ color: profile.color, borderColor: profile.color, backgroundColor: `${profile.color}14` }}
              >
                {currentRole}
              </span>
            </div>
          </Card>

          <Card>
            <div className="text-xs font-semibold text-[#475569] uppercase tracking-wide mb-3">Account Details</div>
            <div className="space-y-3">
              <div className="flex items-start gap-2.5">
                <Mail size={14} className="text-[#475569] mt-0.5 shrink-0" />
                <div>
                  <div className="text-[10px] text-[#475569] uppercase tracking-wide">Email</div>
                  <div className="text-sm text-[#1E293B]">{currentUser?.email}</div>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <IdCard size={14} className="text-[#475569] mt-0.5 shrink-0" />
                <div>
                  <div className="text-[10px] text-[#475569] uppercase tracking-wide">Employee ID</div>
                  <div className="text-sm text-[#1E293B]">{currentUser?.employee_id || '—'}</div>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <Building2 size={14} className="text-[#475569] mt-0.5 shrink-0" />
                <div>
                  <div className="text-[10px] text-[#475569] uppercase tracking-wide">Department</div>
                  <div className="text-sm text-[#1E293B]">{currentUser?.department || '—'}</div>
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <div className="text-xs font-semibold text-[#475569] uppercase tracking-wide mb-3">Clearance Level</div>
            <div className="flex items-center gap-2.5">
              <ShieldCheck size={20} style={{ color: profile.color }} />
              <div>
                <div className="text-sm font-bold text-[#0F2747]">{profile.clearance}</div>
                <div className="text-xs text-[#475569] mt-0.5">Governs access to classified case material</div>
              </div>
            </div>
          </Card>
        </div>

        {/* Right: Permissions & Stats */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <div className="text-xs font-semibold text-[#475569] uppercase tracking-wide mb-1">Role Overview</div>
            <p className="text-sm text-[#1E293B] leading-relaxed mt-1">{profile.tagline}</p>
          </Card>

          <Card>
            <div className="flex items-center gap-2 mb-3">
              <Award size={15} className="text-[#0F2747]" />
              <div className="text-xs font-semibold text-[#475569] uppercase tracking-wide">Permitted Operations</div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {profile.operations.map((op) => (
                <div
                  key={op}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC]"
                >
                  <CheckCircle2 size={14} className="text-green-600 shrink-0" />
                  <span className="text-sm text-[#1E293B]">{op}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <div className="text-xs font-semibold text-[#475569] uppercase tracking-wide mb-3">Activity Snapshot</div>
            <div className="grid grid-cols-3 gap-3">
              {stats.map((s) => (
                <div key={s.label} className="bg-[#F8FAFC] border border-[#E2E8F0] rounded p-3 text-center">
                  <div className="text-xl font-bold text-[#0F2747]">{s.value}</div>
                  <div className="text-xs text-[#475569] mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}