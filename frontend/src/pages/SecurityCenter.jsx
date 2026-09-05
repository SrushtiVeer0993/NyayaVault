import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import {
  PageHeader, Card, Badge, Button, SeverityBadge, formatDateTime, Alert,
} from '../components/ui';
import { Shield, AlertTriangle, TrendingUp } from 'lucide-react';

export default function SecurityCenter() {
  const { state, resolveSecurityEvent, addAuditEvent } = useApp();
  const navigate = useNavigate();
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [restrictedUsers, setRestrictedUsers] = useState(new Set());

  const openEvents = state.securityEvents.filter(e => e.status === 'Open');
  const resolvedEvents = state.securityEvents.filter(e => e.status === 'Resolved');
  const criticalCount = openEvents.filter(e => e.severity === 'Critical').length;
  const highCount = openEvents.filter(e => e.severity === 'High').length;

  // Security posture score (simulated)
  const securityScore = Math.max(0, 100 - (criticalCount * 20) - (highCount * 10));
  const postureLevels = [
    { score: 80, label: 'Secure', color: 'text-green-700' },
    { score: 60, label: 'Moderate', color: 'text-amber-700' },
    { score: 0, label: 'At Risk', color: 'text-red-700' },
  ];
  const posture = postureLevels.find(p => securityScore >= p.score) || postureLevels[2];

  const handleInvestigate = (ev) => {
    setSelectedEvent(ev);
  };

  const handleRestrict = async (ev) => {
    const actorName = (ev.actor || 'Unknown').split('(')[0].trim();
    setRestrictedUsers(prev => new Set([...prev, actorName]));
    await addAuditEvent({
      action: 'Access Restricted',
      resource: `User: ${actorName}`,
      result: 'Success',
      severity: 'High',
      details: `Access restricted due to security incident: ${ev.type}`,
    });
    alert(`Access for "${actorName}" has been restricted.\nAudit event created.`);
  };

  const handleResolve = async (evId) => {
    await resolveSecurityEvent(evId);
    if (selectedEvent?.id === evId) setSelectedEvent(null);
  };

  const severityColors = {
    Critical: 'border-l-4 border-l-red-500',
    High: 'border-l-4 border-l-orange-500',
    Medium: 'border-l-4 border-l-amber-500',
    Low: 'border-l-4 border-l-slate-300',
  };

  return (
    <div className="p-5">
      <PageHeader
        title="Security Center"
        subtitle="Security monitoring, anomaly detection, and incident management"
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Security Center' }]}
      />

      {/* Posture + Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <Card className="col-span-2 sm:col-span-1">
          <div className="text-xs text-[#475569] uppercase font-medium tracking-wide mb-1">Security Posture</div>
          <div className={`text-2xl font-bold ${posture.color}`}>{posture.label}</div>
          <div className="mt-2 bg-[#F1F5F9] rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${securityScore >= 80 ? 'bg-green-500' : securityScore >= 60 ? 'bg-amber-500' : 'bg-red-500'}`}
              style={{ width: `${securityScore}%` }}
            />
          </div>
          <div className="text-xs text-[#475569] mt-1">{securityScore}/100</div>
        </Card>
        <Card>
          <div className="text-xs text-[#475569] uppercase font-medium tracking-wide">Open Incidents</div>
          <div className={`text-2xl font-bold mt-1 ${openEvents.length > 0 ? 'text-red-700' : 'text-green-700'}`}>{openEvents.length}</div>
        </Card>
        <Card>
          <div className="text-xs text-[#475569] uppercase font-medium tracking-wide">Critical</div>
          <div className={`text-2xl font-bold mt-1 ${criticalCount > 0 ? 'text-red-700' : 'text-[#475569]'}`}>{criticalCount}</div>
        </Card>
        <Card>
          <div className="text-xs text-[#475569] uppercase font-medium tracking-wide">Resolved</div>
          <div className="text-2xl font-bold text-green-700 mt-1">{resolvedEvents.length}</div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Events List */}
        <div className="lg:col-span-2 space-y-3">
          {openEvents.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-[#475569] uppercase tracking-wide mb-2">Open Incidents</div>
              {openEvents.map(ev => (
                <div
                  key={ev.id}
                  className={`bg-white border rounded-lg p-4 mb-3 cursor-pointer hover:shadow-sm transition-shadow ${severityColors[ev.severity]} ${selectedEvent?.id === ev.id ? 'ring-1 ring-[#0F2747]' : ''}`}
                  onClick={() => handleInvestigate(ev)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <AlertTriangle size={14} className={ev.severity === 'Critical' ? 'text-red-600' : 'text-orange-500'} />
                        <span className="text-sm font-semibold text-[#1E293B]">{ev.type}</span>
                        <SeverityBadge severity={ev.severity} />
                        <Badge variant="danger">OPEN</Badge>
                      </div>
                      <div className="text-sm text-[#475569] mt-1.5">{ev.activity}</div>
                      <div className="text-xs text-slate-400 mt-1">{formatDateTime(ev.timestamp)}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xs text-[#475569]">Risk Score</div>
                      <div className={`text-xl font-bold ${ev.riskScore >= 75 ? 'text-red-700' : ev.riskScore >= 50 ? 'text-amber-700' : 'text-[#475569]'}`}>
                        {ev.riskScore}/100
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <Button variant="primary" size="sm" onClick={e => { e.stopPropagation(); handleInvestigate(ev); }}>
                      Investigate
                    </Button>
                    <Button variant="ghost" size="sm" onClick={e => { e.stopPropagation(); navigate('/audit'); }}>
                      View Audit Trail
                    </Button>
                    <Button variant="warning" size="sm" onClick={e => { e.stopPropagation(); handleRestrict(ev); }}>
                      Restrict Access
                    </Button>
                    <Button variant="success" size="sm" onClick={e => { e.stopPropagation(); handleResolve(ev.id); }}>
                      Resolve
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {resolvedEvents.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-[#475569] uppercase tracking-wide mb-2">Resolved Incidents</div>
              {resolvedEvents.map(ev => (
                <div key={ev.id} className="bg-white border border-[#E2E8F0] rounded-lg p-3 mb-2 opacity-70">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-[#1E293B]">{ev.type}</span>
                        <SeverityBadge severity={ev.severity} />
                        <Badge variant="success">RESOLVED</Badge>
                      </div>
                      <div className="text-xs text-[#475569] mt-0.5">{ev.activity}</div>
                    </div>
                    <span className="text-xs text-slate-400">{formatDateTime(ev.timestamp)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Detail Panel */}
        <div className="lg:col-span-1 space-y-3">
          {selectedEvent ? (
            <Card>
              <div className="flex items-center justify-between mb-3">
                <div className="text-xs font-semibold text-[#475569] uppercase tracking-wide">Incident Detail</div>
                <button onClick={() => setSelectedEvent(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">&times;</button>
              </div>
              <div className="space-y-2.5">
                <div>
                  <div className="text-xs text-[#475569]">Type</div>
                  <div className="text-sm font-semibold text-[#1E293B]">{selectedEvent.type}</div>
                </div>
                <div>
                  <div className="text-xs text-[#475569]">Severity</div>
                  <SeverityBadge severity={selectedEvent.severity} />
                </div>
                <div>
                  <div className="text-xs text-[#475569]">Risk Score</div>
                  <div className={`text-lg font-bold ${selectedEvent.riskScore >= 75 ? 'text-red-700' : 'text-amber-700'}`}>
                    {selectedEvent.riskScore}/100
                  </div>
                </div>
                <div>
                  <div className="text-xs text-[#475569]">Actor</div>
                  <div className="text-sm text-[#1E293B]">{selectedEvent.actor}</div>
                </div>
                <div>
                  <div className="text-xs text-[#475569]">Activity</div>
                  <div className="text-sm text-[#1E293B]">{selectedEvent.activity}</div>
                </div>
                <div>
                  <div className="text-xs text-[#475569]">Timestamp</div>
                  <div className="text-sm text-[#1E293B]">{formatDateTime(selectedEvent.timestamp)}</div>
                </div>
                {selectedEvent.caseId && (
                  <div>
                    <div className="text-xs text-[#475569]">Related Case</div>
                    <Button variant="link" size="sm" onClick={() => navigate(`/cases/${selectedEvent.caseId}`)}>
                      {selectedEvent.caseId}
                    </Button>
                  </div>
                )}
              </div>
              <div className="border-t border-[#E2E8F0] mt-3 pt-3 space-y-2">
                <Button variant="ghost" size="sm" className="w-full justify-center" onClick={() => navigate('/audit')}>
                  View Related Audit Events
                </Button>
                {selectedEvent.status === 'Open' && (
                  <Button variant="success" size="sm" className="w-full justify-center" onClick={() => handleResolve(selectedEvent.id)}>
                    Mark as Resolved
                  </Button>
                )}
              </div>
            </Card>
          ) : (
            <Card>
              <div className="text-xs font-semibold text-[#475569] uppercase tracking-wide mb-3">Monitored Events</div>
              <div className="space-y-1.5">
                {[
                  'Failed login attempts',
                  'Unauthorized access attempts',
                  'Suspicious document access',
                  'Abnormal downloads',
                  'Integrity failures',
                  'Permission violations',
                  'Unusual access patterns',
                  'Suspicious transfers',
                ].map(item => (
                  <div key={item} className="flex items-center gap-2 text-xs text-[#475569]">
                    <Shield size={11} className="text-[#0F2747] shrink-0" />
                    {item}
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Anomaly Detection Example */}
          {openEvents.find(e => e.type === 'Anomaly Detected') && (
            <Card className="border-red-200 bg-red-50">
              <div className="text-xs font-bold text-red-800 mb-2">⚠ ANOMALY DETECTED</div>
              <div className="space-y-1.5 text-xs">
                <div><span className="text-red-700 font-medium">User:</span> Unknown (IP: 10.0.5.219)</div>
                <div><span className="text-red-700 font-medium">Activity:</span> 17 documents accessed in 2 minutes</div>
                <div><span className="text-red-700 font-medium">Risk:</span> 87/100</div>
                <div><span className="text-red-700 font-medium">Severity:</span> HIGH</div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
