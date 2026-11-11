import { useAuth } from './auth/AuthProvider';
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Activity, ArrowUpRight, BadgeDollarSign, BarChart3, CalendarDays, ChevronDown, ChevronRight, ChevronsLeft, CircleHelp, Clock3, Database, FileBarChart2, FileText, HeartHandshake, LayoutDashboard, LogOut, Megaphone, Menu, Moon, Plus, Search, Settings, ShieldCheck, Smile, Star, Sun, Users, X, Lock, Sliders, Eye, EyeOff } from 'lucide-react';
import { DrawerPortal } from './common/DrawerPortal';
import { dbService, applyFaviconAndTitle } from '../services/dbService';
import { adminAuthService, ModuleConfig } from '../services/adminAuthService';

type Item = { label: string; path: string; icon: typeof Activity; module: keyof ModuleConfig };
const groups: { label: string; items: Item[] }[] = [
  { label: 'WORKSPACE', items: [
    { label: 'Overview', path: '/dashboard', icon: LayoutDashboard, module: 'Dashboard' },
    { label: 'Issue entry', path: '/issue-entry', icon: Plus, module: 'IssueEntry' },
    { label: 'Issue reports', path: '/issue-reports', icon: FileText, module: 'IssueReports' },
    { label: 'Analytics', path: '/analytics', icon: BarChart3, module: 'Analytics' },
    { label: 'CSAT Report', path: '/csat-report', icon: Smile, module: 'CSATReport' },
    { label: 'Weekly report', path: '/weekly-report', icon: FileBarChart2, module: 'WeeklyReport' },
    { label: 'Review tracker', path: '/review-tracker', icon: Star, module: 'ReviewTracker' },
  ]},
  { label: 'BUSINESS', items: [
    { label: 'Sales dashboard', path: '/sales/dashboard', icon: BadgeDollarSign, module: 'Sales' },
    { label: 'Add sales', path: '/sales/add', icon: Plus, module: 'Sales' },
    { label: 'Sales report', path: '/sales/report', icon: FileBarChart2, module: 'Sales' },
    { label: 'Retention dashboard', path: '/retention/dashboard', icon: HeartHandshake, module: 'Retention' },
    { label: 'Customers', path: '/retention/customers', icon: Users, module: 'Retention' },
    { label: 'Customer assignment', path: '/retention/assignment', icon: Users, module: 'Retention' },
    { label: 'Team members', path: '/retention/team', icon: Users, module: 'Retention' },
    { label: 'Monthly follow-up', path: '/retention/followup', icon: CalendarDays, module: 'Retention' },
    { label: 'Customer feedback', path: '/retention/feedback', icon: Smile, module: 'Retention' },
    { label: 'Retention reports', path: '/retention/reports', icon: FileBarChart2, module: 'Retention' },
  ]},
  { label: 'OPERATIONS', items: [
    { label: 'Monthly entry', path: '/monthly-entry', icon: CalendarDays, module: 'MonthlyEntry' },
    { label: 'Monthly reports', path: '/monthly-reports', icon: FileBarChart2, module: 'MonthlyReports' },
    { label: 'Downtime entry', path: '/downtime-entry', icon: Clock3, module: 'DowntimeEntry' },
    { label: 'Downtime reports', path: '/downtime-reports', icon: Activity, module: 'DowntimeReports' },
  ]},
  { label: 'TOOLS & SETTINGS', items: [
    { label: 'Notice generator', path: '/notice-generator', icon: Megaphone, module: 'NoticeGenerator' },
    { label: 'SIM finder', path: '/sim-finder', icon: Search, module: 'SimFinder' },
    { label: 'Settings', path: '/settings', icon: Settings, module: 'Settings' },
  ]},
];
const allItems = groups.flatMap(g => g.items);
const WORKSPACE_CONTROL_PASSWORD = 'Iamfapolok@1';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth >= 1024);
  const [dark, setDark] = useState(true);
  const [branding, setBranding] = useState(() => dbService.getCachedBranding());
  const [config, setConfig] = useState(() => adminAuthService.getModuleConfig());
  const [businessOpen, setBusinessOpen] = useState(location.pathname.startsWith('/sales') || location.pathname.startsWith('/retention'));
  const [adminDropdownOpen, setAdminDropdownOpen] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isWorkspaceUnlocked, setIsWorkspaceUnlocked] = useState(() => {
    try {
      return sessionStorage.getItem('workspace_control_unlocked') === 'true';
    } catch {
      return false;
    }
  });
  const adminDropdownRef = useRef<HTMLDivElement>(null);
  const active = allItems.find(i => i.path === location.pathname);
  const section = groups.find(g => g.items.some(i => i.path === location.pathname));
  const visibleItems = allItems.filter(i => config[i.module] !== false && (i.module !== 'Settings' || user?.role === 'super_admin'));

  useEffect(() => {
    dbService.getBranding().then(setBranding);
    const updateBrand = (e: Event) => setBranding((e as CustomEvent).detail || dbService.getCachedBranding());
    const updateConfig = () => setConfig(adminAuthService.getModuleConfig());
    window.addEventListener('branding-changed', updateBrand);
    window.addEventListener('module-config-changed', updateConfig);
    adminAuthService.fetchModuleConfig().then(setConfig);
    return () => {
      window.removeEventListener('branding-changed', updateBrand);
      window.removeEventListener('module-config-changed', updateConfig);
    };
  }, []);
  useEffect(() => { applyFaviconAndTitle(branding); }, [branding]);
  useLayoutEffect(() => {
    const feedbackPage = /^\/(feedback|client-feedback)\//.test(location.pathname);
    document.documentElement.classList.toggle('dark', feedbackPage ? false : dark);
    if (!feedbackPage) localStorage.setItem('theme', dark ? 'dark' : 'light');
  }, [dark, location.pathname]);
  useEffect(() => {
    if (window.innerWidth < 1024) setSidebarOpen(false);
    if (/^\/(sales|retention)/.test(location.pathname)) setBusinessOpen(true);
    window.scrollTo({ top: 0 });
  }, [location.pathname]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && window.innerWidth < 1024) setSidebarOpen(false);
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, []);

  useEffect(() => {
    const handleUnlockEvent = () => {
      try {
        setIsWorkspaceUnlocked(sessionStorage.getItem('workspace_control_unlocked') === 'true');
      } catch {}
    };
    window.addEventListener('workspace-control-unlocked', handleUnlockEvent);
    return () => window.removeEventListener('workspace-control-unlocked', handleUnlockEvent);
  }, []);

  const handleWorkspaceControlClick = () => {
    let unlocked = false;
    try {
      unlocked = sessionStorage.getItem('workspace_control_unlocked') === 'true';
    } catch {}

    if (unlocked) {
      navigate('/admin');
    } else {
      setPasswordInput('');
      setPasswordError('');
      setShowPasswordModal(true);
    }
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput.trim() === WORKSPACE_CONTROL_PASSWORD) {
      try {
        sessionStorage.setItem('workspace_control_unlocked', 'true');
      } catch {}
      setIsWorkspaceUnlocked(true);
      setShowPasswordModal(false);
      setPasswordInput('');
      setPasswordError('');
      window.dispatchEvent(new CustomEvent('workspace-control-unlocked'));
      navigate('/admin');
    } else {
      setPasswordError('Incorrect password! Please try again.');
    }
  };

  const navItem = (item: Item) => (
    <NavLink 
      key={item.path} 
      to={item.path} 
      className={({ isActive }) => `nav-item ${isActive ? 'is-active' : ''}`}
    >
      <item.icon size={17} strokeWidth={1.7} />
      <span>{item.label}</span>
    </NavLink>
  );

  if (/^\/(feedback|client-feedback)\//.test(location.pathname)) return <>{children}</>;
  return <div className={`app-shell ${sidebarOpen ? 'sidebar-expanded' : ''}`}>
    {sidebarOpen && <button className="sidebar-overlay" aria-label="Close navigation" onClick={() => setSidebarOpen(false)} />}
    <aside className="app-sidebar" aria-label="Main navigation" inert={!sidebarOpen}>
      <div className="brand-lockup"><Link to="/dashboard" className="flex items-center gap-2.5 min-w-0">
        {branding.logo_url ? <img src={branding.logo_url} alt="" className="brand-mark" /> : <span className="brand-mark"><Activity size={23} /></span>}
        <span><strong>{branding.brand_name}</strong><small>{branding.subtitle || 'Operations workspace'}</small></span>
        </Link><button type="button" className="mobile-close" aria-label="Close sidebar" onClick={() => setSidebarOpen(false)}><X size={18} /></button>
      </div>
      
      <nav className="sidebar-navigation">
        {groups.map(group => {
          const items = group.items.filter(i => config[i.module] !== false && (i.module !== 'Settings' || user?.role === 'super_admin'));
          if (!items.length) return null;
          return <div className="nav-section" key={group.label}>
            {group.label === 'BUSINESS' ? <button className="nav-section-label group-toggle" onClick={() => setBusinessOpen(v => !v)} aria-expanded={businessOpen}>{group.label}<ChevronDown size={13} style={{ transform: businessOpen ? undefined : 'rotate(-90deg)' }} /></button> : <div className="nav-section-label">{group.label}</div>}
            {(group.label !== 'BUSINESS' || businessOpen) && items.map(navItem)}
          </div>;
        })}
        {!visibleItems.length && <p className="p-4 text-xs text-slate-500">Modules are disabled. Use the admin panel to enable them.</p>}
      </nav>
    </aside>
    <div className="app-main">
      <header className="app-topbar">
        <div className="topbar-location"><button className="icon-button" aria-label="Toggle sidebar" onClick={() => setSidebarOpen(v => !v)}>{sidebarOpen ? <ChevronsLeft size={19} /> : <Menu size={19} />}</button><span className="breadcrumb-section">{section?.label === 'WORKSPACE' ? 'Workspace' : section?.label === 'BUSINESS' ? 'Business' : 'Operations'}</span><ChevronRight size={13} className="breadcrumb-divider" /><strong>{active?.label || (location.pathname.startsWith('/admin') ? 'Admin portal' : 'Workspace')}</strong></div>
        <div className="topbar-actions">
          
          
          <button className="icon-button" onClick={() => setDark(v => !v)} aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}>{dark ? <Sun size={18} /> : <Moon size={18} />}</button>
          {user?.role === 'super_admin' && (
            <div className="admin-button" title="Super Admin">
              <ShieldCheck size={16} />
              <span>Admin</span>
            </div>
          )}
          {user && <button className="icon-button" aria-label="Log out" onClick={async () => { try { await signOut(); navigate('/login', { replace: true }); } catch { window.alert('Could not sign out. Please try again.'); } }}><LogOut size={17} /></button>}
        </div>
      </header>
      <main className="page-content" id="main-content" key={location.pathname}>{children}</main>
      <footer className="app-footer"><span>Inovace Technologies Ltd.</span></footer>
    </div>

    {/* Workspace Control Password Modal */}
    {showPasswordModal && (
      <DrawerPortal>
        <div className="v2-overlay fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="v2-surface bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/40">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-200 dark:border-amber-900/50">
                  <Lock size={18} />
                </div>
                <div>
                  <h3 className="v2-heading text-sm font-bold text-slate-900 dark:text-white">
                    Workspace Control Password
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Administrator verification required
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowPasswordModal(false)}
                className="v2-button p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={handlePasswordSubmit}>
              <div className="p-6 space-y-4">
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  Enter administrator password to access <strong>Workspace Control</strong>:
                </p>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={passwordInput}
                      onChange={(e) => {
                        setPasswordInput(e.target.value);
                        setPasswordError('');
                      }}
                      placeholder="Enter password..."
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 pr-10"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {passwordError && (
                    <p className="text-xs text-rose-500 mt-1.5 font-medium">{passwordError}</p>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="v2-button px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="v2-button px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-colors shadow-md shadow-indigo-600/20 cursor-pointer"
                >
                  Unlock
                </button>
              </div>
            </form>
          </div>
        </div>
      </DrawerPortal>
    )}
  </div>;
};
export default Layout;
