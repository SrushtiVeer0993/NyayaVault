import { useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { ROLES } from '../data/mockData';
import {
  LayoutDashboard, FolderOpen, FileText, Package, Search,
  Link2, ShieldCheck, Shield, ClipboardList, Award, Users,
  BarChart2, Settings, HelpCircle, LogOut, ChevronDown,
  Bell, Menu, X, User, ChevronLeft, ChevronRight,
  Sparkles,
} from 'lucide-react';
import { Badge, formatDateTime } from './ui/index.jsx';

const NAV_ITEMS = [
  { label: 'Dashboard', icon: LayoutDashboard, to: '/dashboard' },
  { label: 'Cases', icon: FolderOpen, to: '/cases' },
  { label: 'Documents', icon: FileText, to: '/documents' },
  { label: 'Evidence', icon: Package, to: '/evidence' },
  { label: 'AI Search', icon: Search, to: '/search' },
  { label: 'Chain of Custody', icon: Link2, to: '/chain-of-custody' },
  { label: 'Integrity', icon: ShieldCheck, to: '/integrity' },
  { label: 'Security Center', icon: Shield, to: '/security' },
  { label: 'Audit Trail', icon: ClipboardList, to: '/audit' },
  { label: 'Certificates', icon: Award, to: '/certificates' },
  { label: 'Access Control', icon: Users, to: '/access-control' },
  { label: 'Analytics', icon: BarChart2, to: '/analytics' },
];

const ROLE_COLORS = {
  [ROLES.INVESTIGATING_OFFICER]: 'bg-blue-100 text-blue-800 border-blue-200',
  [ROLES.FORENSIC_STAFF]: 'bg-purple-100 text-purple-800 border-purple-200',
  [ROLES.SENIOR_OFFICER]: 'bg-amber-100 text-amber-800 border-amber-200',
  [ROLES.ADMINISTRATOR]: 'bg-rose-100 text-rose-800 border-rose-200',
};

export default function Layout({ children }) {
  const { state, markNotificationRead, markAllNotificationsRead } = useApp();
  const { logout } = useAuth();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const hoverTimeoutRef = useRef(null);
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const navigate = useNavigate();
  const location = useLocation();

  const unreadCount = state.notifications.filter(n => !n.read).length;

  const handleMouseEnter = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    hoverTimeoutRef.current = setTimeout(() => {
      setIsHovered(false);
    }, 180);
  };

  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    };
  }, []);

  const handleGlobalSearch = (val) => {
    setGlobalSearch(val);
    if (!val.trim()) { setSearchResults([]); return; }
    const lower = val.toLowerCase();
    const results = [];
    state.cases.filter(c => c.id.toLowerCase().includes(lower) || c.title.toLowerCase().includes(lower)).slice(0, 3).forEach(c => {
      results.push({ type: 'Case', label: c.id, sub: c.title, to: `/cases/${c.id}` });
    });
    state.documents.filter(d => (d.name && d.name.toLowerCase().includes(lower)) || (d.type && d.type.toLowerCase().includes(lower))).slice(0, 3).forEach(d => {
      results.push({ type: 'Document', label: d.name, sub: d.type, to: `/documents/${d.id}` });
    });
    state.evidence.filter(e => e.id.toLowerCase().includes(lower) || (e.description && e.description.toLowerCase().includes(lower))).slice(0, 2).forEach(e => {
      results.push({ type: 'Evidence', label: e.id, sub: (e.description || '').substring(0, 40) + '...', to: '/evidence' });
    });
    setSearchResults(results);
  };

  const handleNotifClick = (notif) => {
    markNotificationRead(notif.id);
    setNotifOpen(false);
    navigate(notif.navigateTo || '/dashboard');
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  if (!state.currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-slate-400">
        Loading NyayaVault...
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#F8FAFC] overflow-hidden font-sans text-slate-800">
      {/* Collapsible Sidebar with Hover Expansion */}
      <aside
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={`fixed inset-y-0 left-0 z-40 bg-[#0B1A2C] border-r border-slate-800/80 flex flex-col transition-all duration-300 ease-in-out shadow-xl ${
          mobileSidebarOpen ? 'translate-x-0 w-64' : '-translate-x-full'
        } lg:relative lg:translate-x-0 ${
          isHovered ? 'lg:w-64' : 'lg:w-20'
        }`}
      >
        {/* Logo Header */}
        <div className={`flex items-center px-4 py-4 border-b border-white/10 transition-all duration-300 ${isHovered ? 'justify-between' : 'justify-center'}`}>
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-600 via-blue-600 to-indigo-700 flex items-center justify-center text-white shadow-md shadow-cyan-900/30 shrink-0 ring-1 ring-white/20">
              <ShieldCheck size={20} className="text-white" />
            </div>
            {isHovered && (
              <div className="min-w-0 transition-opacity duration-200 whitespace-nowrap">
                <div className="flex items-center gap-1.5">
                  <span className="text-white font-bold text-base tracking-tight leading-none">NyayaVault</span>
                  <span className="text-[10px] font-semibold bg-cyan-500/20 text-cyan-300 px-1.5 py-0.5 rounded border border-cyan-500/30">
                    v2.5
                  </span>
                </div>
                <div className="text-slate-400 text-[11px] font-medium tracking-wide mt-1 truncate">
                  National Legal Vault · MHA
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-1">
          {[...NAV_ITEMS, ...(state.currentRole === ROLES.ADMINISTRATOR ? [{ label: 'Registration Requests', icon: Users, to: '/registration-requests' }] : [])].map(({ label, icon: Icon, to }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setMobileSidebarOpen(false)}
              className={({ isActive }) =>
                `group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isHovered ? '' : 'justify-center'
                } ${
                  isActive
                    ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/10 text-white font-semibold border-l-2 border-cyan-400 shadow-xs'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-white/5'
                }`
              }
            >
              <Icon
                size={18}
                className={`shrink-0 transition-colors ${
                  location.pathname === to ? 'text-cyan-400' : 'text-slate-400 group-hover:text-slate-200'
                }`}
              />

              {isHovered ? (
                <span className="truncate whitespace-nowrap transition-opacity duration-200">
                  {label}
                </span>
              ) : (
                /* Floating Tooltip in Retracted State */
                <div className="absolute left-full ml-3 px-2.5 py-1 bg-[#0F2747] text-white text-xs font-medium rounded-md shadow-xl opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap border border-slate-700">
                  {label}
                </div>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Bottom Section */}
        <div className="border-t border-white/10 p-2 space-y-1 bg-[#071322]/50">
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              `group relative flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all ${
                isHovered ? '' : 'justify-center'
              } ${
                isActive
                  ? 'bg-white/10 text-white font-medium'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`
            }
          >
            <Settings size={18} className="shrink-0 text-slate-400 group-hover:text-slate-200" />
            {isHovered ? (
              <span className="whitespace-nowrap transition-opacity duration-200">Settings</span>
            ) : (
              <div className="absolute left-full ml-3 px-2.5 py-1 bg-[#0F2747] text-white text-xs font-medium rounded-md shadow-xl opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap border border-slate-700">
                Settings
              </div>
            )}
          </NavLink>

          {/* User Profile Card */}
          <div className="pt-2 border-t border-white/10 mt-1">
            <div
              onClick={() => navigate('/profile')}
              className={`flex items-center gap-2.5 px-2 py-1.5 rounded-xl cursor-pointer hover:bg-white/5 transition-colors ${isHovered ? '' : 'justify-center'}`}
            >
              <div
                className="w-8 h-8 rounded-full bg-gradient-to-tr from-cyan-600 to-indigo-700 border border-white/20 flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-sm"
                title={state.currentUser.name}
              >
                {state.currentUser.avatar || 'NY'}
              </div>
              {isHovered && (
                <>
                  <div className="flex-1 min-w-0 whitespace-nowrap transition-opacity duration-200">
                    <div className="text-white text-xs font-semibold truncate leading-tight">
                      {state.currentUser.name.split(' ').slice(-2).join(' ')}
                    </div>
                    <div className="text-cyan-300/80 text-[10px] font-medium truncate mt-0.5">
                      {state.currentRole}
                    </div>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="text-slate-400 hover:text-rose-400 p-1 hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
                    title="Sign Out"
                  >
                    <LogOut size={15} />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Drawer Backdrop */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-slate-950/60 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#F8FAFC]">
        {/* Top Navbar */}
        <header className="bg-white/90 backdrop-blur-md border-b border-slate-200/90 px-4 sm:px-6 py-2.5 flex items-center justify-between gap-3 z-20 shrink-0 shadow-xs">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
              className="lg:hidden p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors"
              aria-label="Toggle navigation"
            >
              <Menu size={20} />
            </button>

            {/* Quick Status Pill */}
            <div className="hidden md:flex items-center gap-2 px-2.5 py-1 bg-slate-100 rounded-full border border-slate-200/80 text-xs font-medium text-slate-600">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Hyperledger Channel: <strong className="text-slate-800">nyayachannel</strong></span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Global Search */}
            <div className="relative hidden sm:block w-64 lg:w-72">
              <input
                type="search"
                value={globalSearch}
                onChange={e => handleGlobalSearch(e.target.value)}
                placeholder="Quick search cases, evidence, docs..."
                className="w-full pl-9 pr-3 py-1.5 text-xs text-slate-800 bg-slate-100/90 hover:bg-slate-100 focus:bg-white border border-slate-200/90 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-600/30 focus:border-cyan-600 transition-all placeholder:text-slate-400"
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              {searchResults.length > 0 && (
                <div className="absolute top-full mt-1.5 left-0 right-0 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden">
                  {searchResults.map((r, i) => (
                    <button
                      key={i}
                      onClick={() => { navigate(r.to); setGlobalSearch(''); setSearchResults([]); }}
                      className="flex items-start gap-2.5 w-full px-3 py-2.5 text-left hover:bg-slate-50 border-b border-slate-100 last:border-0 cursor-pointer transition-colors"
                    >
                      <Badge variant="info" className="mt-0.5 shrink-0 text-[10px]">{r.type}</Badge>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-semibold text-slate-800 truncate">{r.label}</div>
                        <div className="text-[11px] text-slate-500 truncate">{r.sub}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Notifications Dropdown */}
            <div className="relative">
              <button
                onClick={() => { setNotifOpen(!notifOpen); setRoleMenuOpen(false); }}
                className="relative p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                aria-label="Notifications"
              >
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 bg-rose-600 text-white text-[9px] font-bold rounded-full flex items-center justify-center ring-2 ring-white">
                    {unreadCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/70">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-800">Notifications</span>
                      {unreadCount > 0 && (
                        <span className="text-[10px] bg-cyan-100 text-cyan-800 font-semibold px-2 py-0.5 rounded-full">
                          {unreadCount} new
                        </span>
                      )}
                    </div>
                    <button
                      onClick={markAllNotificationsRead}
                      className="text-xs font-semibold text-cyan-700 hover:text-cyan-800 cursor-pointer hover:underline"
                    >
                      Mark all read
                    </button>
                  </div>
                  <div className="max-h-84 overflow-y-auto divide-y divide-slate-100">
                    {state.notifications.length === 0 ? (
                      <div className="py-8 text-center text-xs text-slate-500">No alerts or notifications</div>
                    ) : (
                      state.notifications.map(notif => (
                        <button
                          key={notif.id}
                          onClick={() => handleNotifClick(notif)}
                          className={`flex items-start gap-3 w-full px-4 py-3 text-left hover:bg-slate-50 transition-colors cursor-pointer ${
                            !notif.read ? 'bg-cyan-50/40' : ''
                          }`}
                        >
                          <span
                            className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${
                              !notif.read ? 'bg-cyan-600 ring-2 ring-cyan-200' : 'bg-slate-300'
                            }`}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-semibold text-slate-800 leading-tight">{notif.title}</div>
                            <div className="text-xs text-slate-600 mt-1 line-clamp-2">{notif.message}</div>
                            <div className="text-[10px] text-slate-400 mt-1">{formatDateTime(notif.timestamp)}</div>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Account Menu */}
            <div className="relative">
              <button
                onClick={() => { setRoleMenuOpen(!roleMenuOpen); setNotifOpen(false); }}
                className="flex items-center gap-2 px-2.5 py-1.5 bg-white hover:bg-slate-50 border border-slate-200/90 rounded-xl transition-all cursor-pointer shadow-2xs"
              >
                <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center text-slate-700 font-bold text-[10px]">
                  {state.currentUser.name[0]}
                </div>
                <div className="text-left hidden sm:block">
                  <div className="text-xs font-semibold text-slate-800 leading-tight">
                    {state.currentUser.name.split(' ').slice(0, 2).join(' ')}
                  </div>
                  <div className="text-[10px] text-slate-500 leading-tight">
                    {state.currentRole}
                  </div>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${ROLE_COLORS[state.currentRole]}`}>
                  {state.currentRole.split(' ').map(w => w[0]).join('')}
                </span>
                <ChevronDown size={13} className="text-slate-400" />
              </button>

              {roleMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden py-1">
                  <div className="px-4 py-2.5 border-b border-slate-100 bg-slate-50/70">
                    <div className="text-xs font-bold text-slate-800">{state.currentUser.name}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">{state.currentUser.email}</div>
                  </div>
                  <div className="p-1">
                    <button
                      onClick={() => { setRoleMenuOpen(false); navigate('/profile'); }}
                      className="flex items-center gap-2 w-full px-3 py-2 text-xs rounded-lg text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer"
                    >
                      <User size={14} /> View Profile
                    </button>
                    <button
                      onClick={() => { setRoleMenuOpen(false); logout(); navigate('/login'); }}
                      className="flex items-center gap-2 w-full px-3 py-2 text-xs rounded-lg text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                    >
                      <LogOut size={14} /> Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Container */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto space-y-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
