import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import {
  AlertTriangle, FileText, FolderOpen, LockKeyhole, RefreshCw,
  ShieldAlert, Upload, Users,
} from 'lucide-react';

import { api } from '../api/apiClient';
import { Card, PageHeader, formatDateTime } from '../components/ui';

const RANGE_OPTIONS = [7, 30, 90];

function EmptyChart() {
  return <div className="h-52 flex items-center justify-center text-center text-xs text-slate-500">No activity in selected period.</div>;
}

function ChartCard({ title, children, className = '' }) {
  return (
    <Card className={className}>
      <h2 className="text-xs font-semibold text-[#475569] uppercase tracking-wide mb-4">{title}</h2>
      {children}
    </Card>
  );
}

function AnalyticsTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-[#E2E8F0] rounded-lg p-2.5 shadow-sm text-xs">
      {label && <div className="font-medium text-[#0F2747] mb-1">{label}</div>}
      {payload.map((item) => <div key={item.dataKey} style={{ color: item.color }}>{item.name || item.dataKey}: {item.value}</div>)}
    </div>
  );
}

function DistributionChart({ data, color = '#0F2747' }) {
  if (!data.length) return <EmptyChart />;
  return (
    <ResponsiveContainer width="100%" height={210}>
      <BarChart data={data} margin={{ top: 0, right: 10, left: -20, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
        <XAxis dataKey="category" tick={{ fontSize: 10, fill: '#475569' }} angle={-18} textAnchor="end" height={55} interval={0} />
        <YAxis tick={{ fontSize: 10, fill: '#475569' }} allowDecimals={false} />
        <Tooltip content={<AnalyticsTooltip />} />
        <Bar dataKey="count" name="Count" fill={color} radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function TrendChart({ data, color = '#0369A1' }) {
  if (!data.length) return <EmptyChart />;
  return (
    <ResponsiveContainer width="100%" height={210}>
      <LineChart data={data} margin={{ top: 0, right: 10, left: -20, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
        <XAxis dataKey="bucket" tick={{ fontSize: 10, fill: '#475569' }} />
        <YAxis tick={{ fontSize: 10, fill: '#475569' }} allowDecimals={false} />
        <Tooltip content={<AnalyticsTooltip />} />
        <Line type="monotone" dataKey="count" name="Count" stroke={color} strokeWidth={2} dot={{ r: 3 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

function IntegrityChart({ integrity }) {
  const data = [
    { category: 'Verified', count: integrity.verified, color: '#15803D' },
    { category: 'Failed/Mismatch', count: integrity.failed_or_mismatch, color: '#B91C1C' },
    { category: 'Pending/Unknown', count: integrity.pending_or_unknown, color: '#B45309' },
  ];
  const total = data.reduce((sum, item) => sum + item.count, 0);
  if (!total) return <EmptyChart />;

  return (
    <div className="flex items-center gap-4 min-h-52">
      <ResponsiveContainer width="52%" height={180}>
        <PieChart>
          <Pie data={data} dataKey="count" nameKey="category" cx="50%" cy="50%" innerRadius={42} outerRadius={68} paddingAngle={2}>
            {data.map((item) => <Cell key={item.category} fill={item.color} />)}
          </Pie>
          <Tooltip content={<AnalyticsTooltip />} />
        </PieChart>
      </ResponsiveContainer>
      <div className="space-y-2 text-xs min-w-0">
        {data.map((item) => (
          <div key={item.category} className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
            <span className="text-slate-600 truncate">{item.category}</span>
            <span className="font-bold text-slate-800">{item.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function RecentActivity({ items }) {
  if (!items.length) return <EmptyChart />;
  return (
    <div className="divide-y divide-slate-100">
      {items.map((item) => (
        <div key={item.category} className="py-3 flex items-center justify-between gap-4 text-xs">
          <div className="min-w-0">
            <div className="font-semibold text-slate-800 truncate">{item.category}</div>
            <div className="text-slate-500 mt-0.5">Latest: {formatDateTime(item.latest_occurred_at)}</div>
          </div>
          <span className="shrink-0 font-bold text-cyan-800 bg-cyan-50 border border-cyan-100 px-2 py-1 rounded-md">{item.event_count}</span>
        </div>
      ))}
    </div>
  );
}

export default function Analytics() {
  const [windowDays, setWindowDays] = useState(30);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [backgroundError, setBackgroundError] = useState(null);
  const analyticsRef = useRef(null);
  const requestInFlightRef = useRef(false);
  const requestIdRef = useRef(0);
  const abortControllerRef = useRef(null);

  const cancelActiveRequest = useCallback(() => {
    requestIdRef.current += 1;
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    requestInFlightRef.current = false;
  }, []);

  const loadAnalytics = useCallback(async () => {
    if (requestInFlightRef.current) return;

    const requestId = requestIdRef.current + 1;
    const controller = new AbortController();
    const hasExistingData = Boolean(analyticsRef.current);
    requestIdRef.current = requestId;
    requestInFlightRef.current = true;
    abortControllerRef.current = controller;

    if (hasExistingData) {
      setRefreshing(true);
      setBackgroundError(null);
    } else {
      setLoading(true);
      setError(null);
    }

    try {
      const response = await api.getOperationalAnalytics(windowDays, { signal: controller.signal });
      if (requestId !== requestIdRef.current) return;

      analyticsRef.current = response;
      setAnalytics(response);
      setError(null);
      setBackgroundError(null);
    } catch (requestError) {
      if (requestError.name === 'AbortError' || requestId !== requestIdRef.current) return;

      const errorDetails = {
        status: requestError.status,
        message: requestError.message || 'Unable to load operational analytics.',
      };
      if (analyticsRef.current) {
        setBackgroundError(errorDetails);
      } else {
        setError(errorDetails);
      }
    } finally {
      if (requestId === requestIdRef.current) {
        requestInFlightRef.current = false;
        abortControllerRef.current = null;
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [windowDays]);

  useEffect(() => {
    loadAnalytics();
    const pollingInterval = window.setInterval(loadAnalytics, 30000);

    return () => {
      window.clearInterval(pollingInterval);
      cancelActiveRequest();
    };
  }, [cancelActiveRequest, loadAnalytics]);

  const accessRestricted = error?.status === 401 || error?.status === 403;
  const backgroundAccessRestricted = backgroundError?.status === 401 || backgroundError?.status === 403;

  return (
    <div className="space-y-5">
      <PageHeader title="Analytics & Operational Intelligence" subtitle="Authorized, metadata-only operational telemetry" breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Analytics' }]} />

      <Card className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-sm font-semibold text-slate-800">Analytics window</div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
            <span>{analytics?.generated_at ? `Last updated ${formatDateTime(analytics.generated_at)}` : 'Select a period to load authorized analytics.'}</span>
            {refreshing && <span className="inline-flex items-center gap-1 text-cyan-700"><RefreshCw size={11} className="animate-spin" /> Refreshing</span>}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1">
            {RANGE_OPTIONS.map((days) => (
              <button key={days} type="button" onClick={() => setWindowDays(days)} disabled={loading} className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors disabled:cursor-not-allowed ${windowDays === days ? 'bg-[#0F2747] text-white shadow-sm' : 'text-slate-600 hover:bg-white'}`}>
                {days} Days
              </button>
            ))}
          </div>
          <button type="button" onClick={loadAnalytics} disabled={loading || refreshing} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60">
            <RefreshCw size={13} className={loading || refreshing ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>
      </Card>

      {loading && <Card className="py-16 text-center"><RefreshCw size={24} className="mx-auto text-cyan-700 animate-spin" /><div className="mt-3 text-sm font-semibold text-slate-700">Loading authorized analytics…</div><div className="mt-1 text-xs text-slate-500">Querying current aggregate telemetry for the selected period.</div></Card>}

      {!loading && error && (
        <Card className="py-12 text-center">
          {accessRestricted ? <LockKeyhole size={28} className="mx-auto text-amber-600" /> : <AlertTriangle size={28} className="mx-auto text-rose-600" />}
          <div className="mt-3 text-sm font-semibold text-slate-800">{accessRestricted ? 'Analytics access is restricted' : 'Analytics could not be loaded'}</div>
          <div className="mt-1 text-xs text-slate-500 max-w-md mx-auto">{accessRestricted ? 'Your account does not have the required role and Level 4 clearance for operational analytics.' : error.message}</div>
          {!accessRestricted && <button type="button" onClick={loadAnalytics} className="mt-4 text-xs font-semibold text-cyan-700 hover:text-cyan-800 hover:underline">Try again</button>}
        </Card>
      )}

      {!loading && analytics && backgroundError && (
        <div className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs ${backgroundAccessRestricted ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-rose-200 bg-rose-50 text-rose-800'}`}>
          {backgroundAccessRestricted ? <LockKeyhole size={14} /> : <AlertTriangle size={14} />}
          <span>{backgroundAccessRestricted ? 'Analytics access is restricted. Showing the last authorized result.' : `Unable to refresh analytics. Showing the last updated result. ${backgroundError.message}`}</span>
        </div>
      )}

      {!loading && analytics && (
        <>
          <section>
            <h2 className="text-sm font-bold text-slate-800 mb-3">Overview</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
              {[
                { label: 'Total Documents', value: analytics.overview.total_documents, icon: FileText, color: 'text-blue-700 bg-blue-50' },
                { label: 'Active Cases', value: analytics.overview.active_cases, icon: FolderOpen, color: 'text-indigo-700 bg-indigo-50' },
                { label: 'Active Users', value: analytics.overview.active_users, icon: Users, color: 'text-cyan-700 bg-cyan-50' },
                { label: 'Uploads in Period', value: analytics.overview.uploads_in_period, icon: Upload, color: 'text-emerald-700 bg-emerald-50' },
                { label: 'Denied Access', value: analytics.overview.denied_access_attempts_in_period, icon: LockKeyhole, color: 'text-amber-700 bg-amber-50' },
                { label: 'Security Events', value: analytics.overview.security_events_in_period, icon: ShieldAlert, color: 'text-rose-700 bg-rose-50' },
              ].map((metric) => {
                const Icon = metric.icon;
                return <Card key={metric.label} className="p-3"><div className={`w-7 h-7 rounded-lg flex items-center justify-center ${metric.color}`}><Icon size={15} /></div><div className="text-xl font-bold text-[#0F2747] mt-3">{metric.value}</div><div className="text-[11px] font-medium text-slate-500 mt-0.5">{metric.label}</div></Card>;
              })}
            </div>
          </section>

          <section><h2 className="text-sm font-bold text-slate-800 mb-3">Document Analytics</h2><div className="grid grid-cols-1 lg:grid-cols-2 gap-4"><ChartCard title="Documents by Type"><DistributionChart data={analytics.documents_by_type} /></ChartCard><ChartCard title="Document Upload Trend"><TrendChart data={analytics.document_upload_trend} /></ChartCard></div></section>
          <section><h2 className="text-sm font-bold text-slate-800 mb-3">Case Analytics</h2><ChartCard title="Cases by Status"><DistributionChart data={analytics.cases_by_status} color="#475569" /></ChartCard></section>
          <section><h2 className="text-sm font-bold text-slate-800 mb-3">Evidence Analytics</h2><div className="grid grid-cols-1 lg:grid-cols-3 gap-4"><ChartCard title="Evidence by Status"><DistributionChart data={analytics.evidence_by_status} color="#7C3AED" /></ChartCard><ChartCard title="Evidence by Type"><DistributionChart data={analytics.evidence_by_type} color="#0369A1" /></ChartCard><ChartCard title="Custody Activity Trend"><TrendChart data={analytics.custody_activity_trend} color="#15803D" /></ChartCard></div></section>
          <section><h2 className="text-sm font-bold text-slate-800 mb-3">Integrity</h2><ChartCard title="Integrity Verification Results"><IntegrityChart integrity={analytics.integrity} /></ChartCard></section>
          <section><h2 className="text-sm font-bold text-slate-800 mb-3">Security</h2><div className="grid grid-cols-1 lg:grid-cols-3 gap-4"><ChartCard title="Security Events by Severity"><DistributionChart data={analytics.security_events_by_severity} color="#B91C1C" /></ChartCard><ChartCard title="Security Events by Status"><DistributionChart data={analytics.security_events_by_status} color="#B45309" /></ChartCard><ChartCard title="Security Event Trend"><TrendChart data={analytics.security_event_trend} color="#B91C1C" /></ChartCard></div></section>
          <section><h2 className="text-sm font-bold text-slate-800 mb-3">Activity</h2><div className="grid grid-cols-1 lg:grid-cols-3 gap-4"><ChartCard title="Activity by Category"><DistributionChart data={analytics.activity_by_category} color="#0F2747" /></ChartCard><ChartCard title="Activity Trend"><TrendChart data={analytics.activity_trend} color="#0891B2" /></ChartCard><ChartCard title="Recent Activity Categories"><RecentActivity items={analytics.recent_activity_categories} /></ChartCard></div></section>
        </>
      )}
    </div>
  );
}
