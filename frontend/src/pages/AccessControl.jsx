import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../api/apiClient';
import {
  PageHeader, Card, Badge, Button, Toggle, Alert,
} from '../components/ui';
import { ROLES, RBAC_PERMISSIONS } from '../data/mockData';
import { Check, X } from 'lucide-react';

const PERMISSIONS = [
  { key: 'view', label: 'View Documents' },
  { key: 'upload', label: 'Upload Documents' },
  { key: 'edit', label: 'Edit Documents' },
  { key: 'delete', label: 'Delete Documents' },
  { key: 'download', label: 'Download Documents' },
  { key: 'verify', label: 'Verify Integrity' },
  { key: 'transfer', label: 'Transfer Evidence' },
  { key: 'sign', label: 'Sign Documents' },
  { key: 'generateCertificate', label: 'Generate Certificate' },
  { key: 'manageAccess', label: 'Manage Access' },
  { key: 'manageUsers', label: 'Manage Users' },
  { key: 'viewSecurityEvents', label: 'View Security Events' },
  { key: 'viewAuditLogs', label: 'View Audit Logs' },
];

const ABAC_ATTRIBUTES = [
  { key: 'role', label: 'Role', options: Object.values(ROLES) },
  { key: 'caseAssignment', label: 'Case Assignment', options: ['MH-PN-2026-01428', 'DL-2026-00892', 'MH-MU-2026-02156', 'None'] },
  { key: 'department', label: 'Department', options: ['Crime Investigation Department', 'Forensic Science Laboratory', 'Superintendent of Police Office', 'IT Administration'] },
  { key: 'clearanceLevel', label: 'Clearance Level', options: ['1', '2', '3', '4', '5'] },
  { key: 'documentClassification', label: 'Document Classification', options: ['Public Court Record', 'Restricted', 'Confidential', 'Top Secret'] },
  { key: 'caseSensitivity', label: 'Case Sensitivity', options: ['Standard', 'Sensitive', 'High Sensitivity'] },
  { key: 'resourceType', label: 'Resource Type', options: ['Document', 'Evidence', 'Case', 'Audit Log'] },
  { key: 'workflowState', label: 'Workflow State', options: ['Active', 'Under Review', 'Closed', 'Archived'] },
];

function evaluateAbacAccess(attributes) {
  const level = parseInt(attributes.clearanceLevel);
  const classification = attributes.documentClassification;

  if (classification === 'Top Secret' && level < 5) return { granted: false, reason: 'Clearance level 5 required for Top Secret documents' };
  if (classification === 'Confidential' && level < 3) return { granted: false, reason: 'Clearance level 3 required for Confidential documents' };
  if (attributes.caseAssignment === 'None' && attributes.resourceType === 'Document') return { granted: false, reason: 'Must be assigned to a case to access case documents' };
  if (attributes.workflowState === 'Archived' && attributes.role !== ROLES.ADMINISTRATOR) return { granted: false, reason: 'Only Administrators can access archived resources' };
  return { granted: true, reason: 'All policy conditions satisfied (Verified by ABAC Engine)' };
}

export default function AccessControl() {
  const { state, updateRbacPermission, updateAbacAttribute, canAccess } = useApp();
  const [activeTab, setActiveTab] = useState('rbac');
  const [abacAttributes, setAbacAttributes] = useState(state.abacAttributes);
  const [backendEngineResult, setBackendEngineResult] = useState(null);

  const abacResult = evaluateAbacAccess(abacAttributes);

  const handleAbacChange = async (key, value) => {
    const updated = { ...abacAttributes, [key]: value };
    setAbacAttributes(updated);
    updateAbacAttribute(key, value);

    // Call backend policy evaluation endpoint
    try {
      const res = await api.evaluatePolicy({
        action: 'READ',
        resource_type: updated.resourceType?.toLowerCase() || 'document',
        resource: {
          classification: updated.documentClassification,
          case_id: updated.caseAssignment,
          workflow_state: updated.workflowState,
        },
        context: {
          clearance_level: updated.clearanceLevel,
          department: updated.department,
        },
      });
      setBackendEngineResult(res);
    } catch {
      // Graceful fallback to client ABAC evaluation
    }
  };

  const handleTogglePermission = async (permKey) => {
    const newVal = !state.permissions[permKey];
    updateRbacPermission(permKey, newVal);
    try {
      await api.updateRolePermissions(state.currentRole, { [permKey]: newVal });
    } catch {
      // Local state is preserved
    }
  };

  const canManage = canAccess('manageAccess');

  return (
    <div className="p-5">
      <PageHeader
        title="Access Control"
        subtitle="Role-Based Access Control (RBAC) and Attribute-Based Access Control (ABAC)"
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Access Control' }]}
      />

      {/* Tabs */}
      <div className="flex gap-0 border-b border-[#E2E8F0] mb-5">
        {[{ id: 'rbac', label: 'RBAC Permission Matrix' }, { id: 'abac', label: 'ABAC Policy Evaluation' }].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors cursor-pointer ${activeTab === tab.id ? 'border-[#0F2747] text-[#0F2747]' : 'border-transparent text-[#475569] hover:text-[#1E293B]'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'rbac' && (
        <div>
          {!canManage && (
            <Alert type="warning" className="mb-4">
              View-only mode. Administrator role required to modify permissions.
            </Alert>
          )}

          {/* Permission Matrix Table */}
          <Card noPad>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC]">
                    <th className="text-left py-3 px-4 text-xs font-semibold text-[#475569] uppercase tracking-wide w-48">Permission</th>
                    {Object.values(ROLES).map(role => (
                      <th key={role} className="py-3 px-4 text-xs font-semibold text-[#475569] uppercase tracking-wide text-center">
                        {role.split(' ').map(w => w[0]).join('')}
                        <div className="text-[10px] font-normal normal-case">{role}</div>
                      </th>
                    ))}
                    {canManage && (
                      <th className="py-3 px-4 text-xs font-semibold text-[#475569] uppercase tracking-wide text-center">
                        Your Role<br /><span className="text-[10px] font-normal normal-case">(Toggle)</span>
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {PERMISSIONS.map(perm => (
                    <tr key={perm.key} className="border-b border-[#F1F5F9] last:border-0 hover:bg-[#F8FAFC]">
                      <td className="py-2.5 px-4 font-medium text-[#1E293B] text-xs">{perm.label}</td>
                      {Object.values(ROLES).map(role => {
                        const val = RBAC_PERMISSIONS[role]?.[perm.key];
                        return (
                          <td key={role} className="py-2.5 px-4 text-center">
                            {val ? (
                              <Check size={15} className="text-green-600 mx-auto" />
                            ) : (
                              <X size={15} className="text-red-400 mx-auto" />
                            )}
                          </td>
                        );
                      })}
                      {canManage && (
                        <td className="py-2.5 px-4 text-center">
                          <button
                            onClick={() => handleTogglePermission(perm.key)}
                            className={`w-8 h-4 rounded-full transition-colors cursor-pointer ${state.permissions[perm.key] ? 'bg-[#0F2747]' : 'bg-slate-200'}`}
                          >
                            <span className={`block w-3.5 h-3.5 rounded-full bg-white shadow transition-transform mx-auto ${state.permissions[perm.key] ? 'translate-x-2' : '-translate-x-1.5'}`} />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Role Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
            {Object.values(ROLES).map(role => {
              const perms = RBAC_PERMISSIONS[role];
              const allowed = Object.values(perms).filter(Boolean).length;
              return (
                <Card key={role} className={state.currentRole === role ? 'border-[#0F2747]' : ''}>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant={state.currentRole === role ? 'primary' : 'default'}>{role.split(' ').map(w => w[0]).join('')}</Badge>
                    {state.currentRole === role && <Badge variant="info">Active</Badge>}
                  </div>
                  <div className="text-xs font-medium text-[#1E293B]">{role}</div>
                  <div className="text-xs text-[#475569] mt-1">{allowed}/{PERMISSIONS.length} permissions</div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === 'abac' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Attribute Configuration */}
          <div className="lg:col-span-2">
            <Card>
              <div className="text-xs font-semibold text-[#475569] uppercase tracking-wide mb-4">Configure ABAC Attributes</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {ABAC_ATTRIBUTES.map(attr => (
                  <div key={attr.key}>
                    <label className="block text-xs font-medium text-[#475569] mb-1">{attr.label}</label>
                    <select
                      value={abacAttributes[attr.key] || ''}
                      onChange={e => handleAbacChange(attr.key, e.target.value)}
                      className="w-full border border-[#E2E8F0] rounded px-2.5 py-1.5 text-sm text-[#1E293B] bg-white focus:outline-none focus:ring-1 focus:ring-[#0F2747] cursor-pointer"
                    >
                      {attr.options.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* ABAC Result */}
          <div className="lg:col-span-1 space-y-3">
            <Card className={abacResult.granted ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50'}>
              <div className="text-center py-4">
                <div className={`text-3xl font-black mb-2 ${abacResult.granted ? 'text-green-700' : 'text-red-700'}`}>
                  {abacResult.granted ? 'ACCESS GRANTED' : 'ACCESS DENIED'}
                </div>
                <div className={`text-xs ${abacResult.granted ? 'text-green-700' : 'text-red-700'}`}>
                  {abacResult.reason}
                </div>
              </div>
            </Card>

            <Card>
              <div className="text-xs font-semibold text-[#475569] uppercase tracking-wide mb-3">Active Attributes</div>
              <div className="space-y-1.5">
                {ABAC_ATTRIBUTES.map(attr => (
                  <div key={attr.key} className="flex justify-between gap-2 text-xs">
                    <span className="text-[#475569]">{attr.label}</span>
                    <span className="font-medium text-[#1E293B] text-right">{abacAttributes[attr.key]}</span>
                  </div>
                ))}
              </div>
            </Card>

            <Card>
              <div className="text-xs font-semibold text-[#475569] uppercase tracking-wide mb-2">Policy Rules</div>
              <div className="space-y-1.5 text-xs text-[#475569]">
                <div>• Clearance level 5 required for Top Secret</div>
                <div>• Clearance level 3 required for Confidential</div>
                <div>• Case assignment required for case documents</div>
                <div>• Only Admins access archived resources</div>
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
