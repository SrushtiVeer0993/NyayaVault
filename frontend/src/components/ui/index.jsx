// Shared UI Components for NyayaVault

export function Badge({ children, variant = 'default', className = '' }) {
  const variants = {
    default: 'bg-slate-100 text-slate-700',
    success: 'bg-green-100 text-green-800',
    warning: 'bg-amber-100 text-amber-800',
    danger: 'bg-red-100 text-red-800',
    info: 'bg-blue-100 text-blue-800',
    primary: 'bg-[#0F2747] text-white',
    verified: 'bg-green-100 text-green-800',
    tampered: 'bg-red-100 text-red-800',
    pending: 'bg-amber-100 text-amber-800',
    critical: 'bg-red-100 text-red-800',
    high: 'bg-orange-100 text-orange-800',
    medium: 'bg-amber-100 text-amber-800',
    low: 'bg-slate-100 text-slate-700',
    active: 'bg-green-100 text-green-800',
    closed: 'bg-slate-100 text-slate-600',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${variants[variant] || variants.default} ${className}`}>
      {children}
    </span>
  );
}

export function Button({ children, variant = 'primary', size = 'md', onClick, disabled, className = '', type = 'button', ...props }) {
  const variants = {
    primary: 'bg-[#0F2747] text-white hover:bg-[#0B1F36] border border-[#0F2747]',
    secondary: 'bg-white text-[#0F2747] border border-[#E2E8F0] hover:bg-[#F8FAFC]',
    danger: 'bg-[#B91C1C] text-white hover:bg-red-700 border border-[#B91C1C]',
    warning: 'bg-[#B45309] text-white hover:bg-amber-700 border border-[#B45309]',
    success: 'bg-[#15803D] text-white hover:bg-green-700 border border-[#15803D]',
    ghost: 'bg-transparent text-[#475569] hover:bg-[#F1F5F9] border border-transparent',
    link: 'bg-transparent text-[#0369A1] hover:underline border-0 p-0',
  };
  const sizes = {
    sm: 'px-2.5 py-1 text-xs',
    md: 'px-3.5 py-1.5 text-sm',
    lg: 'px-5 py-2 text-sm',
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-1.5 font-medium rounded transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function Card({ children, className = '', noPad = false }) {
  return (
    <div className={`bg-white border border-slate-200/80 rounded-2xl shadow-xs transition-all duration-200 ${noPad ? '' : 'p-5 sm:p-6'} ${className}`}>
      {children}
    </div>
  );
}

export function SectionHeader({ title, subtitle, actions, className = '' }) {
  return (
    <div className={`flex items-start justify-between gap-4 mb-4 ${className}`}>
      <div>
        <h2 className="text-base font-semibold text-[#0F2747]">{title}</h2>
        {subtitle && <p className="text-xs text-[#475569] mt-0.5">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}

export function StatusDot({ status }) {
  const colors = {
    Verified: 'bg-green-500',
    Tampered: 'bg-red-500',
    Pending: 'bg-amber-500',
    Mismatch: 'bg-red-500',
    Active: 'bg-green-500',
    Closed: 'bg-slate-400',
    Open: 'bg-red-500',
    Resolved: 'bg-green-500',
    Confirmed: 'bg-green-500',
  };
  return (
    <span className={`inline-block w-2 h-2 rounded-full ${colors[status] || 'bg-slate-400'}`} />
  );
}

export function IntegrityBadge({ status }) {
  if (status === 'Verified') return <Badge variant="success">✓ Verified</Badge>;
  if (status === 'Tampered') return <Badge variant="danger">⚠ Tampered</Badge>;
  if (status === 'Mismatch') return <Badge variant="danger">✗ Mismatch</Badge>;
  return <Badge variant="warning">⏳ Pending</Badge>;
}

export function SeverityBadge({ severity }) {
  const map = {
    Critical: 'critical',
    High: 'high',
    Medium: 'medium',
    Low: 'low',
  };
  return <Badge variant={map[severity] || 'default'}>{severity}</Badge>;
}

export function Modal({ isOpen, onClose, title, children, size = 'md' }) {
  if (!isOpen) return null;
  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className={`bg-white rounded-lg shadow-xl w-full ${sizes[size]} max-h-[90vh] flex flex-col`}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#E2E8F0]">
          <h3 className="font-semibold text-[#0F2747] text-sm">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none cursor-pointer">&times;</button>
        </div>
        <div className="overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  );
}

export function Table({ columns, data, onRowClick, emptyMessage = 'No records found' }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[#E2E8F0]">
            {columns.map((col, i) => (
              <th key={i} className="text-left py-2.5 px-3 text-xs font-semibold text-[#475569] uppercase tracking-wide whitespace-nowrap">
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="py-8 px-3 text-center text-[#475569] text-sm">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, i) => (
              <tr
                key={i}
                className={`border-b border-[#F1F5F9] last:border-0 ${onRowClick ? 'cursor-pointer hover:bg-[#F8FAFC]' : ''}`}
                onClick={() => onRowClick && onRowClick(row)}
              >
                {columns.map((col, j) => {
                  const key = col.key || col.accessor;
                  const val = key !== undefined && row ? row[key] : undefined;
                  return (
                    <td key={j} className="py-2.5 px-3 text-[#1E293B] whitespace-nowrap">
                      {col.render ? col.render(row, val) : (val !== undefined ? val : '—')}
                    </td>
                  );
                })}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export function Tabs({ tabs, activeTab, onTabChange }) {
  return (
    <div className="border-b border-[#E2E8F0]">
      <div className="flex gap-0 overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors cursor-pointer ${
              activeTab === tab.id
                ? 'border-[#0F2747] text-[#0F2747]'
                : 'border-transparent text-[#475569] hover:text-[#1E293B] hover:border-slate-300'
            }`}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${activeTab === tab.id ? 'bg-[#0F2747] text-white' : 'bg-slate-100 text-slate-600'}`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

export function Select({ value, onChange, options, className = '', label }) {
  return (
    <div className={className}>
      {label && <label className="block text-xs font-medium text-[#475569] mb-1">{label}</label>}
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full border border-[#E2E8F0] rounded px-2.5 py-1.5 text-sm text-[#1E293B] bg-white focus:outline-none focus:ring-1 focus:ring-[#0F2747] cursor-pointer"
      >
        {options.map(opt => (
          <option key={opt.value || opt} value={opt.value || opt}>
            {opt.label || opt}
          </option>
        ))}
      </select>
    </div>
  );
}

export function Input({ value, onChange, placeholder, label, type = 'text', className = '' }) {
  return (
    <div className={className}>
      {label && <label className="block text-xs font-medium text-[#475569] mb-1">{label}</label>}
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full border border-[#E2E8F0] rounded px-2.5 py-1.5 text-sm text-[#1E293B] bg-white focus:outline-none focus:ring-1 focus:ring-[#0F2747] placeholder:text-slate-400"
      />
    </div>
  );
}

export function Toggle({ enabled, onToggle, label, description }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <div className="text-sm font-medium text-[#1E293B]">{label}</div>
        {description && <div className="text-xs text-[#475569] mt-0.5">{description}</div>}
      </div>
      <button
        onClick={() => onToggle(!enabled)}
        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors cursor-pointer ${enabled ? 'bg-[#0F2747]' : 'bg-slate-200'}`}
        role="switch"
        aria-checked={enabled}
      >
        <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${enabled ? 'translate-x-4.5' : 'translate-x-0.5'}`} />
      </button>
    </div>
  );
}

export function MetricCard({ title, value, subtitle, icon: Icon, variant = 'default', onClick, badge }) {
  const variants = {
    default: 'border-slate-200/80 bg-white hover:border-slate-300',
    danger: 'border-rose-200/80 bg-gradient-to-br from-white to-rose-50/50 hover:border-rose-300',
    warning: 'border-amber-200/80 bg-gradient-to-br from-white to-amber-50/50 hover:border-amber-300',
    success: 'border-emerald-200/80 bg-gradient-to-br from-white to-emerald-50/50 hover:border-emerald-300',
    info: 'border-cyan-200/80 bg-gradient-to-br from-white to-cyan-50/50 hover:border-cyan-300',
  };
  const iconBgs = {
    default: 'bg-slate-100 text-slate-700',
    danger: 'bg-rose-100 text-rose-700',
    warning: 'bg-amber-100 text-amber-700',
    success: 'bg-emerald-100 text-emerald-700',
    info: 'bg-cyan-100 text-cyan-700',
  };
  return (
    <div
      className={`border rounded-2xl p-5 flex items-start justify-between gap-3 shadow-xs hover:shadow-md transition-all duration-200 ${variants[variant] || variants.default} ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider">{title}</span>
          {badge && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600">{badge}</span>}
        </div>
        <div className="text-2xl sm:text-3xl font-black text-slate-900 mt-2 tracking-tight">{value}</div>
        {subtitle && <div className="text-xs text-slate-500 mt-1.5 truncate">{subtitle}</div>}
      </div>
      {Icon && (
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-2xs ${iconBgs[variant] || iconBgs.default}`}>
          <Icon size={20} />
        </div>
      )}
    </div>
  );
}

export function Timeline({ events }) {
  return (
    <div className="relative">
      {events.map((event, i) => (
        <div key={i} className="flex gap-3 mb-4 last:mb-0">
          <div className="flex flex-col items-center">
            <div className={`w-2.5 h-2.5 rounded-full mt-1 shrink-0 ${event.color || 'bg-[#0F2747]'}`} />
            {i < events.length - 1 && <div className="w-px flex-1 bg-[#E2E8F0] mt-1" />}
          </div>
          <div className="pb-4 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="text-sm font-medium text-[#1E293B]">{event.title}</div>
                {event.subtitle && <div className="text-xs text-[#475569] mt-0.5">{event.subtitle}</div>}
              </div>
              <div className="text-xs text-[#475569] whitespace-nowrap shrink-0">{event.time}</div>
            </div>
            {event.details && <div className="text-xs text-[#475569] mt-1 leading-relaxed">{event.details}</div>}
          </div>
        </div>
      ))}
    </div>
  );
}

export function HashDisplay({ hash, label = 'SHA-256' }) {
  return (
    <div>
      {label && <div className="text-xs font-medium text-[#475569] mb-1">{label}</div>}
      <div className="font-mono text-xs bg-[#F8FAFC] border border-[#E2E8F0] rounded px-2.5 py-1.5 text-[#1E293B] break-all">
        {hash}
      </div>
    </div>
  );
}

export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      {Icon && <Icon size={36} className="text-slate-300 mb-3" />}
      <div className="text-sm font-medium text-[#475569]">{title}</div>
      {description && <div className="text-xs text-slate-400 mt-1 max-w-xs">{description}</div>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function PageHeader({ title, subtitle, breadcrumbs, actions, action }) {
  const actionItems = actions || action;
  return (
    <div className="mb-5">
      {breadcrumbs && (
        <div className="flex items-center gap-1.5 text-xs text-[#475569] mb-2">
          {breadcrumbs.map((crumb, i) => (
            <span key={i} className="flex items-center gap-1.5">
              {i > 0 && <span>/</span>}
              {crumb.href ? (
                <a href={crumb.href} className="hover:text-[#0F2747]">{crumb.label}</a>
              ) : (
                <span className={i === breadcrumbs.length - 1 ? 'text-[#0F2747] font-medium' : ''}>{crumb.label}</span>
              )}
            </span>
          ))}
        </div>
      )}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#0F2747]">{title}</h1>
          {subtitle && <p className="text-sm text-[#475569] mt-0.5">{subtitle}</p>}
        </div>
        {actionItems && <div className="flex items-center gap-2 shrink-0">{actionItems}</div>}
      </div>
    </div>
  );
}

export function SearchBar({ value, onChange, placeholder = 'Search...', className = '' }) {
  return (
    <div className={`relative ${className}`}>
      <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      <input
        type="search"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-8 pr-3 py-1.5 border border-[#E2E8F0] rounded text-sm text-[#1E293B] bg-white focus:outline-none focus:ring-1 focus:ring-[#0F2747] placeholder:text-slate-400"
      />
    </div>
  );
}

export function Divider({ className = '' }) {
  return <hr className={`border-[#E2E8F0] ${className}`} />;
}

export function Spinner({ size = 'md' }) {
  const sizes = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-8 h-8' };
  return (
    <div className={`${sizes[size]} border-2 border-[#E2E8F0] border-t-[#0F2747] rounded-full animate-spin`} />
  );
}

export function Alert({ type = 'info', children, className = '' }) {
  const types = {
    info: 'bg-blue-50 border-blue-200 text-blue-800',
    success: 'bg-green-50 border-green-200 text-green-800',
    warning: 'bg-amber-50 border-amber-200 text-amber-800',
    danger: 'bg-red-50 border-red-200 text-red-800',
  };
  const icons = {
    info: 'ℹ',
    success: '✓',
    warning: '⚠',
    danger: '✗',
  };
  return (
    <div className={`flex items-start gap-2 border rounded p-3 text-sm ${types[type]} ${className}`}>
      <span className="font-bold mt-0.5">{icons[type]}</span>
      <div>{children}</div>
    </div>
  );
}

export function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatDateTime(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function truncateHash(hash) {
  if (!hash) return '—';
  return `${hash.substring(0, 8)}...${hash.substring(hash.length - 4)}`;
}
