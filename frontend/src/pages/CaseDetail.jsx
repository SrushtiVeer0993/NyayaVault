import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import {
  PageHeader, Card, Tabs, Badge, Button, Timeline,
  IntegrityBadge, SeverityBadge, Table, formatDate, formatDateTime,
} from '../components/ui';
import { FileText, Package, Link2, Activity, Users, Shield, ArrowLeft } from 'lucide-react';

export default function CaseDetail() {
  const { id } = useParams();
  const { state } = useApp();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');

  const caseData = state.cases.find(c => c.id === id);
  const caseDocs = state.documents.filter(d => d.caseId === id);
  const caseEvidence = state.evidence.filter(e => e.caseId === id);
  const caseAudit = state.auditEvents.filter(e => e.caseId === id);
  const caseSecEvents = state.securityEvents.filter(e => e.caseId === id);

  if (!caseData) {
    return (
      <div className="p-5">
        <PageHeader
          title="Case Not Found"
          breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Cases', href: '/cases' }, { label: id }]}
        />
        <Card>
          <div className="text-center py-10 text-[#475569]">
            Case <span className="font-mono">{id}</span> not found.
            <div className="mt-3">
              <Button variant="primary" onClick={() => navigate('/cases')}>
                <ArrowLeft size={14} /> Back to Cases
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'documents', label: 'Documents', count: caseDocs.length },
    { id: 'evidence', label: 'Evidence', count: caseEvidence.length },
    { id: 'custody', label: 'Chain of Custody' },
    { id: 'activity', label: 'Activity', count: caseAudit.length },
    { id: 'access', label: 'Access' },
  ];

  const custodyEvents = caseEvidence.flatMap(ev =>
    (ev.custodyChain || []).map(c => ({
      title: `${c.action}: ${ev.id}`,
      subtitle: `${c.from} → ${c.to}`,
      time: formatDateTime(c.date),
      details: c.notes,
      color: c.action === 'Collection' ? 'bg-blue-500' : c.action.includes('Transfer') ? 'bg-amber-500' : 'bg-green-500',
    }))
  ).sort((a, b) => new Date(b.time) - new Date(a.time));

  const activityTimeline = caseAudit.map(ev => ({
    title: ev.action,
    subtitle: `${ev.actor} (${ev.role})`,
    time: formatDateTime(ev.timestamp),
    details: ev.details,
    color: ev.severity === 'High' || ev.severity === 'Critical' ? 'bg-red-500' : ev.result === 'Success' || ev.result === 'Verified' ? 'bg-green-500' : 'bg-slate-400',
  }));

  const priorityVariant = { Critical: 'danger', High: 'warning', Medium: 'medium', Low: 'low' };
  const statusVariant = { Active: 'active', 'Under Investigation': 'info', Closed: 'closed', 'Pending Trial': 'warning' };

  return (
    <div className="p-5">
      <PageHeader
        title={caseData.title}
        subtitle={caseData.id}
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Cases', href: '/cases' },
          { label: caseData.id },
        ]}
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => navigate('/cases')}>
              <ArrowLeft size={13} /> Cases
            </Button>
            <Button variant="primary" size="sm" onClick={() => navigate('/documents')}>
              <FileText size={13} /> View Documents
            </Button>
          </div>
        }
      />

      {/* Status Bar */}
      <div className="flex flex-wrap gap-2 mb-4">
        <Badge variant={statusVariant[caseData.status] || 'default'}>{caseData.status}</Badge>
        <Badge variant={priorityVariant[caseData.priority]}>{caseData.priority} Priority</Badge>
        <Badge variant="info">{caseData.type}</Badge>
        <Badge variant={caseData.sensitivityLevel === 'Top Secret' ? 'danger' : caseData.sensitivityLevel === 'Confidential' ? 'warning' : 'default'}>
          {caseData.sensitivityLevel}
        </Badge>
        <IntegrityBadge status={caseData.integrityState} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Left Panel */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <div className="text-xs font-semibold text-[#475569] uppercase tracking-wide mb-3">Case Details</div>
            <div className="space-y-2.5">
              {[
                { label: 'Case ID', value: <span className="font-mono text-xs">{caseData.id}</span> },
                { label: 'Created', value: formatDate(caseData.createdDate) },
                { label: 'Last Updated', value: formatDate(caseData.lastUpdated) },
                { label: 'Station', value: caseData.station },
                { label: 'Documents', value: caseDocs.length },
                { label: 'Evidence Items', value: caseEvidence.length },
              ].map(({ label, value }) => (
                <div key={label}>
                  <div className="text-[10px] text-[#475569] uppercase tracking-wide">{label}</div>
                  <div className="text-sm text-[#1E293B] mt-0.5">{value}</div>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <div className="text-xs font-semibold text-[#475569] uppercase tracking-wide mb-3">Officers</div>
            <div className="space-y-2">
              {caseData.officers.map((officer, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-[#0F2747] text-white flex items-center justify-center text-[10px] font-bold">
                    {officer.split(' ').map(n => n[0]).join('').substring(0, 2)}
                  </div>
                  <div className="text-xs text-[#1E293B]">{officer}</div>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <div className="text-xs font-semibold text-[#475569] uppercase tracking-wide mb-3">Legal Sections</div>
            <div className="flex flex-wrap gap-1.5">
              {caseData.sections.map(s => (
                <span key={s} className="text-xs bg-[#F8FAFC] border border-[#E2E8F0] rounded px-2 py-0.5 font-mono">{s}</span>
              ))}
            </div>
          </Card>
        </div>

        {/* Right Panel with Tabs */}
        <div className="lg:col-span-3">
          <Card noPad>
            <Tabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
            <div className="p-4">
              {activeTab === 'overview' && (
                <div className="space-y-4">
                  <div>
                    <div className="text-xs font-semibold text-[#475569] uppercase tracking-wide mb-1.5">Description</div>
                    <p className="text-sm text-[#1E293B] leading-relaxed">{caseData.description}</p>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded p-3">
                      <div className="text-lg font-bold text-[#0F2747]">{caseDocs.length}</div>
                      <div className="text-xs text-[#475569]">Documents</div>
                    </div>
                    <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded p-3">
                      <div className="text-lg font-bold text-[#0F2747]">{caseEvidence.length}</div>
                      <div className="text-xs text-[#475569]">Evidence Items</div>
                    </div>
                    <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded p-3">
                      <div className="text-lg font-bold text-[#0F2747]">{caseSecEvents.length}</div>
                      <div className="text-xs text-[#475569]">Security Events</div>
                    </div>
                  </div>
                  {caseSecEvents.length > 0 && (
                    <div>
                      <div className="text-xs font-semibold text-[#475569] uppercase tracking-wide mb-2">Security Events</div>
                      {caseSecEvents.map(ev => (
                        <div key={ev.id} className="flex items-start gap-2 py-2 border-b border-[#F1F5F9] last:border-0">
                          <SeverityBadge severity={ev.severity} />
                          <div className="flex-1">
                            <div className="text-sm font-medium text-[#1E293B]">{ev.type}</div>
                            <div className="text-xs text-[#475569]">{ev.activity}</div>
                          </div>
                          <Badge variant={ev.status === 'Resolved' ? 'success' : 'danger'}>{ev.status}</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'documents' && (
                <div>
                  {caseDocs.length === 0 ? (
                    <div className="text-center py-8 text-[#475569] text-sm">No documents for this case</div>
                  ) : (
                    caseDocs.map(doc => (
                      <div
                        key={doc.id}
                        className="flex items-center gap-3 py-2.5 border-b border-[#F1F5F9] last:border-0 cursor-pointer hover:bg-[#F8FAFC] -mx-1 px-1 rounded"
                        onClick={() => navigate(`/documents/${doc.id}`)}
                      >
                        <FileText size={16} className="text-[#475569] shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-[#1E293B]">{doc.name}</div>
                          <div className="text-xs text-[#475569]">{doc.type} · v{doc.version} · {doc.uploadedBy}</div>
                        </div>
                        <div className="flex gap-1.5">
                          <IntegrityBadge status={doc.integrityStatus} />
                          <Badge>{doc.classification}</Badge>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {activeTab === 'evidence' && (
                <div>
                  {caseEvidence.length === 0 ? (
                    <div className="text-center py-8 text-[#475569] text-sm">No evidence for this case</div>
                  ) : (
                    caseEvidence.map(ev => (
                      <div
                        key={ev.id}
                        className="py-2.5 border-b border-[#F1F5F9] last:border-0 cursor-pointer hover:bg-[#F8FAFC] -mx-1 px-1 rounded"
                        onClick={() => navigate('/evidence')}
                      >
                        <div className="flex items-center gap-2">
                          <Package size={15} className="text-[#475569] shrink-0" />
                          <span className="font-mono text-xs text-[#475569]">{ev.id}</span>
                          <Badge>{ev.type}</Badge>
                          <IntegrityBadge status={ev.integrityStatus} />
                        </div>
                        <div className="text-sm text-[#1E293B] mt-1 ml-5">{ev.description}</div>
                        <div className="text-xs text-[#475569] ml-5 mt-0.5">Custodian: {ev.currentCustodian}</div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {activeTab === 'custody' && (
                <Timeline events={custodyEvents.length > 0 ? custodyEvents : [{ title: 'No custody events', time: '', color: 'bg-slate-300' }]} />
              )}

              {activeTab === 'activity' && (
                <Timeline events={activityTimeline.length > 0 ? activityTimeline : [{ title: 'No activity recorded', time: '', color: 'bg-slate-300' }]} />
              )}

              {activeTab === 'access' && (
                <div className="space-y-3">
                  <div>
                    <div className="text-xs font-semibold text-[#475569] uppercase tracking-wide mb-2">Access Classification</div>
                    <div className="flex items-center gap-2">
                      <Badge variant={caseData.sensitivityLevel === 'Top Secret' ? 'danger' : caseData.sensitivityLevel === 'Confidential' ? 'warning' : 'default'}>
                        {caseData.sensitivityLevel}
                      </Badge>
                      <span className="text-sm text-[#475569]">Case-level classification</span>
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-[#475569] uppercase tracking-wide mb-2">Authorized Personnel</div>
                    <div className="space-y-2">
                      {caseData.officers.map((officer, i) => (
                        <div key={i} className="flex items-center justify-between py-1.5 border-b border-[#F1F5F9] last:border-0">
                          <div className="flex items-center gap-2">
                            <Users size={14} className="text-[#475569]" />
                            <span className="text-sm text-[#1E293B]">{officer}</span>
                          </div>
                          <Badge variant="success">Authorized</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-[#475569] uppercase tracking-wide mb-2">Access Statistics</div>
                    <div className="text-sm text-[#475569]">
                      {caseAudit.filter(a => a.action === 'View').length} view events · {caseAudit.filter(a => a.action === 'Download').length} downloads
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
