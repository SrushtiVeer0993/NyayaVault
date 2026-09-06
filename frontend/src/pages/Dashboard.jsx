import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import {
  FolderOpen, FileText, Package, Clock, Shield, ShieldCheck,
  ArrowRightLeft, CheckCircle, Upload, Search, Award, ClipboardList,
  AlertTriangle, TrendingUp, Sparkles, ArrowUpRight, CheckCircle2,
  Lock, Activity, Fingerprint, ChevronRight, Layers,
} from 'lucide-react';
import {
  MetricCard, Card, SectionHeader, Badge, SeverityBadge, IntegrityBadge,
  formatDateTime, formatDate, truncateHash, Button,
} from '../components/ui';

export default function Dashboard() {
  const { state } = useApp();
  const navigate = useNavigate();

  const activeCases = state.cases.filter(c => c.status === 'Active' || c.status === 'Under Investigation').length;
  const totalDocs = state.documents.length;
  const evidenceCount = state.evidence.length;
  const pendingReviews = state.documents.filter(d => d.humanReviewRequired).length;
  const openAlerts = state.securityEvents.filter(e => e.status === 'Open').length;
  const verifiedDocs = state.documents.filter(d => d.integrityStatus === 'Verified').length;
  const pendingTransfers = state.evidence.filter(e => e.status === 'Collected').length;

  const recentCases = [...state.cases].sort((a, b) => new Date(b.lastUpdated) - new Date(a.lastUpdated)).slice(0, 5);
  const recentDocs = [...state.documents].sort((a, b) => new Date(b.uploadDate) - new Date(a.uploadDate)).slice(0, 5);
  const recentAudit = state.auditEvents.slice(0, 6);
  const openEvents = state.securityEvents.filter(e => e.status === 'Open').slice(0, 3);
  const reviewQueue = state.documents.filter(d => d.humanReviewRequired).slice(0, 3);

  const integrityPercent = totalDocs > 0 ? Math.round((verifiedDocs / totalDocs) * 100) : 100;

  const QUICK_ACTIONS = [
    { label: 'Upload Document', icon: Upload, to: '/documents', color: 'from-cyan-500/10 to-blue-500/10 hover:from-cyan-500/20 hover:to-blue-500/20 text-cyan-800' },
    { label: 'AI Hybrid Search', icon: Search, to: '/search', color: 'from-blue-500/10 to-indigo-500/10 hover:from-blue-500/20 hover:to-indigo-500/20 text-blue-800' },
    { label: 'Section 65B Cert', icon: Award, to: '/certificates', color: 'from-amber-500/10 to-orange-500/10 hover:from-amber-500/20 hover:to-orange-500/20 text-amber-800' },
    { label: 'Verify Integrity', icon: ShieldCheck, to: '/integrity', color: 'from-emerald-500/10 to-teal-500/10 hover:from-emerald-500/20 hover:to-teal-500/20 text-emerald-800' },
    { label: 'Custody Chain', icon: ArrowRightLeft, to: '/chain-of-custody', color: 'from-purple-500/10 to-pink-500/10 hover:from-purple-500/20 hover:to-pink-500/20 text-purple-800' },
    { label: 'Audit Ledger', icon: ClipboardList, to: '/audit', color: 'from-slate-500/10 to-slate-600/10 hover:from-slate-500/20 hover:to-slate-600/20 text-slate-800' },
  ];

  return (
    <div className="space-y-6">
      {/* 1. Hero Bento Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#0B1A2C] via-[#0F2747] to-[#123159] p-6 sm:p-8 text-white shadow-lg border border-slate-700/50">
        <div className="absolute right-0 top-0 -mt-12 -mr-12 w-96 h-96 rounded-full bg-gradient-to-br from-cyan-500/10 to-blue-500/0 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/15 border border-cyan-400/30 text-cyan-300 text-xs font-semibold tracking-wide">
              <Sparkles size={13} />
              <span>National Judicial & Forensic Evidence Vault</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Welcome back, {state.currentUser.name}
            </h1>
            <p className="text-sm text-slate-300 font-normal leading-relaxed">
              Serving as <strong className="text-white">{state.currentRole}</strong> at <span className="text-cyan-200">{state.currentUser.station || 'Cyber Crime Division, HQ'}</span>. All cryptographic chains are synchronized with the national ledger.
            </p>
          </div>

          {/* Real-time Status Bento Pills */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 shrink-0">
            <div className="bg-white/5 backdrop-blur-md rounded-2xl p-3 border border-white/10 text-left">
              <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Blockchain Ledger</div>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span className="text-xs font-bold text-white">nyayachannel</span>
              </div>
              <div className="text-[10px] text-emerald-400/90 font-mono mt-0.5">Block #14,291</div>
            </div>

            <div className="bg-white/5 backdrop-blur-md rounded-2xl p-3 border border-white/10 text-left">
              <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Integrity Index</div>
              <div className="text-base font-black text-white mt-0.5">{integrityPercent}%</div>
              <div className="text-[10px] text-cyan-300 font-medium mt-0.5">{verifiedDocs} / {totalDocs} Verified</div>
            </div>

            <div className="bg-white/5 backdrop-blur-md rounded-2xl p-3 border border-white/10 text-left col-span-2 sm:col-span-1">
              <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Access Policy</div>
              <div className="text-xs font-bold text-white mt-1">ABAC Level 4</div>
              <div className="text-[10px] text-slate-400 font-medium mt-0.5">Strict Clearance</div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Top Bento KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Active Cases"
          value={activeCases}
          subtitle={`${state.cases.length} Total Registered Cases`}
          icon={FolderOpen}
          variant="default"
          onClick={() => navigate('/cases')}
          badge="Live"
        />
        <MetricCard
          title="Vault Documents"
          value={totalDocs}
          subtitle={`${verifiedDocs} Integrity Verified`}
          icon={FileText}
          variant="info"
          onClick={() => navigate('/documents')}
          badge="SHA-256"
        />
        <MetricCard
          title="Evidence Records"
          value={evidenceCount}
          subtitle={`${pendingTransfers} In Transit`}
          icon={Package}
          variant={pendingTransfers > 0 ? 'warning' : 'default'}
          onClick={() => navigate('/evidence')}
          badge="Custody"
        />
        <MetricCard
          title="Security Radar"
          value={openAlerts}
          subtitle={openAlerts === 0 ? 'Zero Threat Alerts' : `${openAlerts} Incidents Require Action`}
          icon={Shield}
          variant={openAlerts > 0 ? 'danger' : 'success'}
          onClick={() => navigate('/security')}
          badge={openAlerts > 0 ? 'Action Req.' : 'Tamper-Free'}
        />
      </div>

      {/* 3. Core Asymmetrical Bento Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Bento Tile A: Recent Cases & Judicial Workstreams (Span 7) */}
        <Card className="lg:col-span-7 flex flex-col justify-between">
          <div>
            <SectionHeader
              title="Active Case Dossiers & Workstreams"
              subtitle="Real-time case proceedings synchronized with e-Courts and CCTNS"
              actions={
                <Button variant="secondary" size="sm" onClick={() => navigate('/cases')}>
                  View All Cases <ArrowUpRight size={13} />
                </Button>
              }
            />

            <div className="divide-y divide-slate-100 mt-2">
              {recentCases.map(c => (
                <div
                  key={c.id}
                  onClick={() => navigate(`/cases/${c.id}`)}
                  className="py-3 px-3 -mx-2 rounded-xl hover:bg-slate-50 flex items-center justify-between gap-4 cursor-pointer transition-colors group"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200/80">
                        {c.id}
                      </span>
                      <Badge variant={c.priority === 'Critical' ? 'danger' : c.priority === 'High' ? 'warning' : 'default'}>
                        {c.priority} Priority
                      </Badge>
                      <span className="text-[11px] text-slate-400 font-medium">· {c.type}</span>
                    </div>
                    <div className="text-sm font-semibold text-slate-900 group-hover:text-cyan-700 transition-colors truncate mt-1">
                      {c.title}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      Investigating Officer: <span className="font-medium text-slate-700">{c.assignedOfficer}</span> · Updated {formatDate(c.lastUpdated)}
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center gap-3">
                    <Badge variant={c.status === 'Active' ? 'active' : c.status === 'Closed' ? 'closed' : 'warning'}>
                      {c.status}
                    </Badge>
                    <ChevronRight size={16} className="text-slate-300 group-hover:text-slate-600 transition-colors" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Showing {recentCases.length} recent cases</span>
            <button onClick={() => navigate('/cases')} className="font-semibold text-cyan-700 hover:text-cyan-800 hover:underline">
              Create New Case +
            </button>
          </div>
        </Card>

        {/* Bento Tile B: Cryptographic Integrity & Blockchain Sentinel (Span 5) */}
        <Card className="lg:col-span-5 bg-gradient-to-br from-white via-slate-50/50 to-cyan-50/20 flex flex-col justify-between">
          <div>
            <SectionHeader
              title="Cryptographic Integrity Sentinel"
              subtitle="SHA-256 byte-level ledger verification"
              actions={
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full">
                  <CheckCircle2 size={12} /> Active Sentinel
                </span>
              }
            />

            {/* Gauge Bento Widget */}
            <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-3 mt-2">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-slate-500 font-medium">Vault Verification Ratio</div>
                  <div className="text-3xl font-black text-slate-900 mt-0.5">{integrityPercent}%</div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-200">
                    Tamper-Free
                  </span>
                  <div className="text-[10px] text-slate-400 mt-1">{verifiedDocs} of {totalDocs} records checked</div>
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-emerald-500 to-cyan-500 h-2.5 rounded-full transition-all duration-500"
                  style={{ width: `${integrityPercent}%` }}
                />
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1 text-[11px] text-slate-600">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>Canonical Original: <strong>Synced</strong></span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-cyan-500" />
                  <span>Ledger Fabric: <strong>Anchored</strong></span>
                </div>
              </div>
            </div>

            {/* Interactive Tamper & Verification Shortcuts */}
            <div className="mt-4 p-3.5 rounded-2xl bg-slate-100/70 border border-slate-200/80 space-y-2">
              <div className="text-xs font-semibold text-slate-700">Audit & Demonstration Commands</div>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => navigate('/integrity')}
                  className="justify-center text-xs"
                >
                  <ShieldCheck size={14} /> Full Audit Scan
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => navigate('/integrity')}
                  className="justify-center text-xs"
                >
                  Simulate Tamper
                </Button>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] font-mono text-slate-400 truncate">
            Head Hash: 6a82f1b490...d7e2910c (Validated)
          </div>
        </Card>
      </div>

      {/* 4. Second Row of Bento Tiles */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-5">
        {/* Bento Tile C: Quick Command Center (Span 4) */}
        <Card className="lg:col-span-4">
          <SectionHeader
            title="Command Center"
            subtitle="Rapid forensic and legal workflows"
          />
          <div className="grid grid-cols-2 gap-2.5 mt-2">
            {QUICK_ACTIONS.map(action => (
              <button
                key={action.label}
                onClick={() => navigate(action.to)}
                className={`p-3.5 rounded-2xl bg-gradient-to-br ${action.color} border border-slate-200/70 flex flex-col items-start justify-between h-24 hover:scale-[1.02] hover:shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-600 focus-visible:ring-offset-2 transition-all duration-200 cursor-pointer text-left group`}
              >
                <div className="w-8 h-8 rounded-xl bg-white shadow-2xs flex items-center justify-center">
                  <action.icon size={16} />
                </div>
                <div className="font-bold text-xs leading-tight">{action.label}</div>
              </button>
            ))}
          </div>
        </Card>

        {/* Bento Tile D: Human-in-the-Loop AI Review Queue (Span 4) */}
        <Card className="lg:col-span-4 flex flex-col justify-between">
          <div>
            <SectionHeader
              title="AI Extraction Review"
              subtitle="Human-in-the-loop validation (< 80% threshold)"
              actions={
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                  {reviewQueue.length} Pending
                </span>
              }
            />

            {reviewQueue.length === 0 ? (
              <div className="py-8 text-center space-y-2">
                <CheckCircle2 size={32} className="mx-auto text-emerald-500" />
                <div className="text-xs font-semibold text-slate-700">AI Extractions Verified</div>
                <div className="text-[11px] text-slate-400">All document OCR confidence scores exceed 80%</div>
              </div>
            ) : (
              <div className="space-y-2.5 mt-2">
                {reviewQueue.map(doc => (
                  <div
                    key={doc.id}
                    onClick={() => navigate(`/documents/${doc.id}`)}
                    className="p-3 rounded-xl border border-amber-200/80 bg-amber-50/50 hover:bg-amber-50 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-bold text-amber-800 bg-amber-200/70 px-1.5 py-0.5 rounded uppercase">
                        Review Needed
                      </span>
                      <span className="text-[11px] font-bold text-amber-700">
                        {doc.aiClassification?.confidence}% Conf.
                      </span>
                    </div>
                    <div className="text-xs font-bold text-slate-900 truncate mt-1.5">{doc.name}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">{doc.type} · Case {doc.caseId}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Automated Classification Engine</span>
            <button onClick={() => navigate('/documents')} className="font-semibold text-cyan-700 hover:underline">
              Inspect Documents →
            </button>
          </div>
        </Card>

        {/* Bento Tile E: Active Security & Threat Radar (Span 4) */}
        <Card className="lg:col-span-4 flex flex-col justify-between">
          <div>
            <SectionHeader
              title="Security & Threat Radar"
              subtitle="Automated anomaly and tampering detection"
              actions={
                <Button variant="ghost" size="sm" onClick={() => navigate('/security')}>
                  Details
                </Button>
              }
            />

            {openEvents.length === 0 ? (
              <div className="py-8 text-center space-y-2">
                <ShieldCheck size={32} className="mx-auto text-emerald-500" />
                <div className="text-xs font-semibold text-slate-700">Security Posture: Pristine</div>
                <div className="text-[11px] text-slate-400">No active unauthorized attempts or hash mismatches</div>
              </div>
            ) : (
              <div className="space-y-2.5 mt-2">
                {openEvents.map(ev => (
                  <div
                    key={ev.id}
                    onClick={() => navigate('/security')}
                    className="p-3 rounded-xl border border-rose-200/80 bg-rose-50/40 hover:bg-rose-50 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                        <AlertTriangle size={13} className={ev.severity === 'Critical' ? 'text-rose-600' : 'text-amber-500'} />
                        <span>{ev.type}</span>
                      </div>
                      <SeverityBadge severity={ev.severity} />
                    </div>
                    <div className="text-xs text-slate-600 truncate mt-1">{ev.activity}</div>
                    <div className="text-[10px] text-slate-400 mt-1">Risk Score: {ev.riskScore}/100 · {formatDateTime(ev.timestamp)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Threat Intelligence v2</span>
            <button onClick={() => navigate('/security')} className="font-semibold text-rose-700 hover:underline">
              Security Center →
            </button>
          </div>
        </Card>
      </div>

      {/* 5. Bottom Bento Row: Recent Documents & Live Audit Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Bento Tile F: Recent Documents Stream (Span 7) */}
        <Card className="lg:col-span-7">
          <SectionHeader
            title="Recent Vault Deposited Records"
            subtitle="Immutable digital and physical documents with cryptographic hashes"
            actions={
              <Button variant="secondary" size="sm" onClick={() => navigate('/documents')}>
                View All Docs <ArrowUpRight size={13} />
              </Button>
            }
          />

          <div className="divide-y divide-slate-100 mt-2">
            {recentDocs.map(doc => (
              <div
                key={doc.id}
                onClick={() => navigate(`/documents/${doc.id}`)}
                className="py-3 px-3 -mx-2 rounded-xl hover:bg-slate-50 flex items-center justify-between gap-4 cursor-pointer transition-colors group"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-900 group-hover:text-cyan-700 truncate">
                      {doc.name}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-md font-medium bg-slate-100 text-slate-600 border border-slate-200">
                      {doc.type}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 mt-1 truncate">
                    Case: <span className="font-mono text-slate-700">{doc.caseId}</span> · Deposited by <span className="text-slate-700">{doc.uploadedBy}</span> on {formatDate(doc.uploadDate)}
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-2">
                  <IntegrityBadge status={doc.integrityStatus} />
                  {doc.humanReviewRequired && <Badge variant="warning">Review</Badge>}
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Bento Tile G: Real-Time Audit Trail Stream (Span 5) */}
        <Card className="lg:col-span-5">
          <SectionHeader
            title="Live Audit Ledger Stream"
            subtitle="Append-only cryptographic event block stream"
            actions={
              <Button variant="ghost" size="sm" onClick={() => navigate('/audit')}>
                Full Audit Trail
              </Button>
            }
          />

          <div className="space-y-3 mt-2">
            {recentAudit.map((ev, i) => (
              <div key={ev.id || i} className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-slate-50 transition-colors">
                <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                  ev.severity === 'Critical' ? 'bg-rose-600' :
                  ev.severity === 'High' ? 'bg-orange-500' :
                  ev.severity === 'Medium' ? 'bg-amber-500' : 'bg-slate-400'
                }`} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-800">{ev.action}</span>
                    <span className="text-[10px] text-slate-400 font-mono shrink-0">{formatDateTime(ev.timestamp)}</span>
                  </div>
                  <div className="text-xs text-slate-500 truncate mt-0.5">
                    Actor: <span className="text-slate-700 font-medium">{ev.actor}</span> ({ev.role})
                  </div>
                  {ev.hash && (
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5 truncate">
                      SHA256: {truncateHash(ev.hash)}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
