import { useAuth } from './auth/AuthProvider';
import React, { useEffect, useLayoutEffect, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Activity, ArrowUpRight, BadgeDollarSign, BarChart3, CalendarDays, ChevronDown, ChevronRight, ChevronsLeft, CircleHelp, Clock3, Database, FileBarChart2, FileText, HeartHandshake, LayoutDashboard, LogOut, Megaphone, Menu, Moon, Plus, Search, Settings, ShieldCheck, Smile, Sun, Users, X } from 'lucide-react';
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

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth >= 1024);
  const [dark, setDark] = useState(true);
  const [branding, setBranding] = useState(() => dbService.getCachedBranding());
  const [config, setConfig] = useState(() => adminAuthService.getModuleConfig());
  const [businessOpen, setBusinessOpen] = useState(location.pathname.startsWith('/sales') || location.pathname.startsWith('/retention'));
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
  const navItem = (item: Item) => <NavLink key={item.path} to={item.path} className={({ isActive }) => `nav-item ${isActive ? 'is-active' : ''}`}><item.icon size={17} strokeWidth={1.7} /><span>{item.label}</span>{item.path === '/issue-entry' && <kbd>+</kbd>}</NavLink>;

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
          {user?.role === 'super_admin' && <Link className="admin-button" to="/admin"><ShieldCheck size={16} /><span>Admin</span></Link>}
          {user && <button className="icon-button" aria-label="Log out" onClick={async () => { try { await signOut(); navigate('/login', { replace: true }); } catch { window.alert('Could not sign out. Please try again.'); } }}><LogOut size={17} /></button>}
        </div>
      </header>
      <main className="page-content" id="main-content" key={location.pathname}>{children}</main>
      <footer className="app-footer"><span>Inovace Technologies Ltd.</span></footer>
    </div>
    
  </div>;
};
export default Layout;
