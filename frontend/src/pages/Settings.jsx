import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { PageHeader, Card, Toggle, Button, Badge, Input } from '../components/ui';
import { ROLES } from '../data/mockData';

export default function Settings() {
  const { state, switchRole } = useApp();

  const [securityPrefs, setSecurityPrefs] = useState({
    twoFactorAuth: true,
    sessionTimeout: true,
    loginAlerts: true,
    downloadAlerts: false,
    integrityNotifications: true,
  });

  const [notifPrefs, setNotifPrefs] = useState({
    integrityMismatch: true,
    aiReviewRequired: true,
    documentTransferred: true,
    certificateGenerated: true,
    unauthorizedAccess: true,
    permissionChanged: true,
    newCaseAssignment: true,
    evidenceTransfer: false,
  });

  const [appearance, setAppearance] = useState({
    compactMode: false,
    showHashPreview: true,
    autoVerifyOnView: false,
  });

  const [profile, setProfile] = useState({
    name: state.currentUser.name,
    email: state.currentUser.email,
    station: state.currentUser.station,
  });

  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="p-5">
      <PageHeader
        title="Settings"
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Settings' }]}
        actions={
          <Button variant="primary" onClick={handleSave}>
            {saved ? '✓ Saved' : 'Save Changes'}
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Profile */}
        <Card>
          <div className="text-xs font-semibold text-[#475569] uppercase tracking-wide mb-4">Profile</div>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-[#0F2747] text-white flex items-center justify-center text-lg font-bold">
              {state.currentUser.avatar}
            </div>
            <div>
              <div className="font-semibold text-[#0F2747]">{state.currentUser.name}</div>
              <div className="text-xs text-[#475569]">{state.currentUser.badge}</div>
            </div>
          </div>
          <div className="space-y-3">
            <Input label="Name" value={profile.name} onChange={v => setProfile(p => ({ ...p, name: v }))} />
            <Input label="Email" value={profile.email} onChange={v => setProfile(p => ({ ...p, email: v }))} type="email" />
            <Input label="Station" value={profile.station} onChange={v => setProfile(p => ({ ...p, station: v }))} />
            <div>
              <label className="block text-xs font-medium text-[#475569] mb-1">Department</label>
              <div className="text-sm text-[#1E293B] bg-[#F8FAFC] border border-[#E2E8F0] rounded px-2.5 py-1.5">{state.currentUser.department}</div>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#475569] mb-1">Clearance Level</label>
              <div className="text-sm text-[#1E293B] bg-[#F8FAFC] border border-[#E2E8F0] rounded px-2.5 py-1.5">Level {state.currentUser.clearanceLevel}</div>
            </div>
          </div>
        </Card>

        {/* Role */}
        <Card>
          <div className="text-xs font-semibold text-[#475569] uppercase tracking-wide mb-4">Role & Permissions</div>
          <div className="mb-3">
            <div className="text-xs text-[#475569] mb-1">Current Role</div>
            <Badge variant="primary">{state.currentRole}</Badge>
          </div>
          <div className="text-xs font-medium text-[#475569] mb-2">Switch Role</div>
          <div className="space-y-2">
            {Object.values(ROLES).map(role => (
              <button
                key={role}
                onClick={() => switchRole(role)}
                className={`flex items-center justify-between w-full px-3 py-2 rounded border cursor-pointer text-sm transition-colors ${state.currentRole === role ? 'border-[#0F2747] bg-[#F8FAFC] font-medium text-[#0F2747]' : 'border-[#E2E8F0] text-[#475569] hover:border-[#0F2747]'}`}
              >
                {role}
                {state.currentRole === role && <span className="text-[#0F2747] text-xs">✓ Active</span>}
              </button>
            ))}
          </div>
        </Card>

        {/* Security Preferences */}
        <Card>
          <div className="text-xs font-semibold text-[#475569] uppercase tracking-wide mb-4">Security Preferences</div>
          <div className="space-y-4">
            <Toggle
              enabled={securityPrefs.twoFactorAuth}
              onToggle={v => setSecurityPrefs(p => ({ ...p, twoFactorAuth: v }))}
              label="Two-Factor Authentication"
              description="Require OTP for all logins"
            />
            <Toggle
              enabled={securityPrefs.sessionTimeout}
              onToggle={v => setSecurityPrefs(p => ({ ...p, sessionTimeout: v }))}
              label="Auto Session Timeout"
              description="Log out after 30 minutes of inactivity"
            />
            <Toggle
              enabled={securityPrefs.loginAlerts}
              onToggle={v => setSecurityPrefs(p => ({ ...p, loginAlerts: v }))}
              label="Login Alerts"
              description="Alert on new device logins"
            />
            <Toggle
              enabled={securityPrefs.downloadAlerts}
              onToggle={v => setSecurityPrefs(p => ({ ...p, downloadAlerts: v }))}
              label="Download Alerts"
              description="Notify supervisors on document downloads"
            />
            <Toggle
              enabled={securityPrefs.integrityNotifications}
              onToggle={v => setSecurityPrefs(p => ({ ...p, integrityNotifications: v }))}
              label="Integrity Failure Alerts"
              description="Immediate alert on integrity mismatch"
            />
          </div>
        </Card>

        {/* Notification Preferences */}
        <Card>
          <div className="text-xs font-semibold text-[#475569] uppercase tracking-wide mb-4">Notification Preferences</div>
          <div className="space-y-4">
            {[
              { key: 'integrityMismatch', label: 'Integrity Mismatch', desc: 'Document hash mismatch detected' },
              { key: 'aiReviewRequired', label: 'AI Review Required', desc: 'Low-confidence AI extraction' },
              { key: 'documentTransferred', label: 'Document Transferred', desc: 'Document shared with you' },
              { key: 'certificateGenerated', label: 'Certificate Generated', desc: 'Section 65B certificate created' },
              { key: 'unauthorizedAccess', label: 'Unauthorized Access', desc: 'Access denied events' },
              { key: 'permissionChanged', label: 'Permission Changed', desc: 'Your permissions were modified' },
              { key: 'newCaseAssignment', label: 'New Case Assignment', desc: 'Assigned to new case' },
              { key: 'evidenceTransfer', label: 'Evidence Transfer', desc: 'Evidence custody change' },
            ].map(({ key, label, desc }) => (
              <Toggle
                key={key}
                enabled={notifPrefs[key]}
                onToggle={v => setNotifPrefs(p => ({ ...p, [key]: v }))}
                label={label}
                description={desc}
              />
            ))}
          </div>
        </Card>

        {/* Appearance */}
        <Card>
          <div className="text-xs font-semibold text-[#475569] uppercase tracking-wide mb-4">Appearance</div>
          <div className="space-y-4">
            <Toggle
              enabled={appearance.compactMode}
              onToggle={v => setAppearance(p => ({ ...p, compactMode: v }))}
              label="Compact Mode"
              description="Reduce spacing for denser information display"
            />
            <Toggle
              enabled={appearance.showHashPreview}
              onToggle={v => setAppearance(p => ({ ...p, showHashPreview: v }))}
              label="Show Hash Preview"
              description="Display truncated SHA-256 hash in document lists"
            />
            <Toggle
              enabled={appearance.autoVerifyOnView}
              onToggle={v => setAppearance(p => ({ ...p, autoVerifyOnView: v }))}
              label="Auto-Verify on View"
              description="Automatically verify integrity when opening documents"
            />
          </div>
        </Card>

        {/* System Information */}
        <Card>
          <div className="text-xs font-semibold text-[#475569] uppercase tracking-wide mb-4">System Information</div>
          <div className="space-y-2 text-xs">
            {[
              { label: 'Application', value: 'NyayaVault v1.0.0' },
              { label: 'Organization', value: 'Ministry of Home Affairs' },
              { label: 'Department', value: 'National Crime Records Bureau (NCRB)' },
              { label: 'Division', value: 'Women Safety Division' },
              { label: 'Blockchain', value: 'Hyperledger Fabric (Demo)' },
              { label: 'Storage', value: 'MinIO / S3-compatible (Demo)' },
              { label: 'AI / OCR', value: 'NyayaVault AI Engine (Demo)' },
              { label: 'Deployment', value: 'Docker / Docker Compose' },
              { label: 'Frontend', value: 'React 18 + Vite + Tailwind CSS' },
              { label: 'Backend Direction', value: 'Python + FastAPI + PostgreSQL' },
              { label: 'Build Date', value: new Date().toLocaleDateString('en-IN') },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between gap-2 py-1.5 border-b border-[#F1F5F9] last:border-0">
                <span className="text-[#475569]">{label}</span>
                <span className="font-medium text-[#1E293B]">{value}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
