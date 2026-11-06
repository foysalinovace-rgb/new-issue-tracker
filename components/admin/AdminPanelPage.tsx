import { useAuth } from '../auth/AuthProvider';
import { FilterDesk } from '../common/DataLedger';
import { ModuleWorkspace } from '../common/ModuleWorkspace';
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ShieldCheck, 
  Sliders, 
  LogOut, 
  ArrowLeft, 
  Search, 
  Check, 
  X, 
  LayoutDashboard, 
  HeartHandshake, 
  PlusCircle, 
  FileText, 
  BarChart3, 
  Calendar, 
  Clock, 
  History, 
  Megaphone, 
  Settings, 
  Eye, 
  EyeOff, 
  RefreshCw,
  ExternalLink,
  Layers,
  BadgeDollarSign,
  Lock
} from 'lucide-react';
import { 
  adminAuthService, 
  ModuleConfig, 
  MODULE_META_LIST,
  DEFAULT_MODULE_CONFIG
} from '../../services/adminAuthService';

export const AdminPanelPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [config, setConfig] = useState<ModuleConfig>(() => adminAuthService.getModuleConfig());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [isUnlocked, setIsUnlocked] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem('workspace_control_unlocked') === 'true';
    } catch {
      return false;
    }
  });
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    // Auth Guard: if not logged in, redirect to login page
    if (!adminAuthService.isAdminLoggedIn()) {
      navigate('/admin/login', { replace: true });
    }
  }, [navigate]);

  useEffect(() => {
    const handleConfigChange = (e: any) => {
      if (e.detail) setConfig(e.detail);
    };
    const handleUnlockEvent = () => {
      try {
        setIsUnlocked(sessionStorage.getItem('workspace_control_unlocked') === 'true');
      } catch {}
    };
    window.addEventListener('module-config-changed', handleConfigChange);
    window.addEventListener('workspace-control-unlocked', handleUnlockEvent);
    return () => {
      window.removeEventListener('module-config-changed', handleConfigChange);
      window.removeEventListener('workspace-control-unlocked', handleUnlockEvent);
    };
  }, []);

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput.trim() === 'Iamfapolok@1') {
      try {
        sessionStorage.setItem('workspace_control_unlocked', 'true');
      } catch {}
      setIsUnlocked(true);
      setPasswordError('');
      setPasswordInput('');
      window.dispatchEvent(new CustomEvent('workspace-control-unlocked'));
      showToast('Workspace control unlocked.');
    } else {
      setPasswordError('Incorrect password! Please try again.');
    }
  };

  const handleLock = () => {
    try {
      sessionStorage.removeItem('workspace_control_unlocked');
    } catch {}
    setIsUnlocked(false);
    setPasswordInput('');
    setPasswordError('');
    window.dispatchEvent(new CustomEvent('workspace-control-unlocked'));
    showToast('Workspace control locked.');
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const handleToggle = (id: keyof ModuleConfig, label: string) => {
    const updated = adminAuthService.toggleModule(id);
    setConfig(updated);
    showToast(`${label} is now ${updated[id] ? 'ON (Active)' : 'OFF (Hidden & URL Access Blocked)'} across all browsers.`);
  };

  const handleSetAll = (state: boolean) => {
    const updated = adminAuthService.setAllModules(state);
    setConfig(updated);
    showToast(state ? 'All modules turned ON globally.' : 'All modules turned OFF globally (URL access blocked).');
  };

  const handleReset = () => {
    adminAuthService.saveModuleConfig(DEFAULT_MODULE_CONFIG);
    setConfig(DEFAULT_MODULE_CONFIG);
    showToast('Reset all modules to default (Visible & Active).');
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/login', { replace: true });
  };

  const getModuleIcon = (id: keyof ModuleConfig) => {
    switch (id) {
      case 'Dashboard': return LayoutDashboard;
      case 'Sales': return BadgeDollarSign;
      case 'Retention': return HeartHandshake;
      case 'IssueEntry': return PlusCircle;
      case 'IssueReports': return FileText;
      case 'Analytics': return BarChart3;
      case 'WeeklyReport': return FileText;
      case 'MonthlyEntry': return Calendar;
      case 'MonthlyReports': return BarChart3;
      case 'DowntimeEntry': return Clock;
      case 'DowntimeReports': return History;
      case 'NoticeGenerator': return Megaphone;
      case 'SimFinder': return Search;
      case 'Settings': return Settings;
      default: return Sliders;
    }
  };

  const totalCount = MODULE_META_LIST.length;
  const visibleCount = Object.values(config).filter(Boolean).length;
  const hiddenCount = totalCount - visibleCount;

  // Filter modules
  const filteredModules = MODULE_META_LIST.filter(item => {
    if (selectedCategory !== 'all' && item.category !== selectedCategory) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return item.label.toLowerCase().includes(q) || item.description.toLowerCase().includes(q);
    }
    return true;
  });

  const categories = ['all', 'Main', 'Retention', 'Issues', 'Monthly', 'Infrastructure', 'Config'];

  if (!isUnlocked) {
    return (
      <ModuleWorkspace data-ui="v2" id="AdminPanelPage" number="24" title="Workspace control" description="Organize module availability and manage your operational workspace." category="Administration" kind="settings" links={[]}>
        <div className="v2-page-content">
          <div className="max-w-md mx-auto my-12 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl p-8 text-center">
            <div className="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto mb-4">
              <Lock size={28} />
            </div>
            <h2 className="v2-heading text-lg font-bold text-slate-900 dark:text-white mb-1.5">
              Workspace Control (Protected)
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
              Please enter the security password to access Workspace Control and module configurations.
            </p>

            <form onSubmit={handlePasswordSubmit} className="space-y-4 text-left">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Admin Password
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

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => navigate('/dashboard')}
                  className="v2-button flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl transition-colors text-center cursor-pointer"
                >
                  Back to Dashboard
                </button>
                <button
                  type="submit"
                  className="v2-button flex-1 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-colors shadow-md shadow-indigo-600/20 text-center cursor-pointer"
                >
                  Unlock
                </button>
              </div>
            </form>
          </div>
        </div>
      </ModuleWorkspace>
    );
  }

  return (
    <ModuleWorkspace data-ui="v2" id="AdminPanelPage" number="24" title="Workspace control" description="Organize module availability and manage your operational workspace." category="Administration" kind="settings" links={[]}><div className="v2-page-content">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-2xl border border-slate-700 text-xs font-semibold flex items-center gap-2 animate-bounce">
          <Check size={14} className="text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Admin Navigation Header */}
      <div className="v2-surface bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-600/20 shrink-0">
            <Sliders size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="v2-heading text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                Admin Control Panel
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1">
                <ShieldCheck size={13} /> Logged In
              </span>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                🌐 Synced Across All Browsers
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Toggle modules: When a module is turned off, it is immediately hidden from the sidebar across all sessions and direct URL access is blocked.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={handleLock}
            className="v2-button inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-900/60 hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-colors shadow-xs cursor-pointer"
            title="Lock Workspace Control"
          >
            <Lock size={14} />
            Lock
          </button>
          <button
            onClick={handleLogout}
            className="v2-button inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-900/60 hover:bg-rose-100 dark:hover:bg-rose-900/50 transition-colors shadow-xs cursor-pointer"
          >
            <LogOut size={14} />
            Logout
          </button>
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="v2-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="v2-surface bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total System Modules</span>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1.5">{totalCount}</p>
          <span className="text-[11px] text-slate-400">Configured in application</span>
        </div>

        <div className="v2-surface bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Currently Visible in Sidebar</span>
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1.5">{visibleCount}</p>
          <span className="text-[11px] text-slate-400">Active across devices</span>
        </div>

        <div className="v2-surface bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-xs font-semibold text-rose-600 dark:text-rose-400">Hidden from Sidebar</span>
          <p className="text-2xl font-bold text-rose-600 dark:text-rose-400 mt-1.5">{hiddenCount}</p>
          <span className="text-[11px] text-slate-400">Disabled by Admin</span>
        </div>

        <div className="v2-surface bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">Admin Account</span>
          <p className="text-sm font-bold text-slate-900 dark:text-white truncate mt-1">{user?.email}</p>
          <span className="text-[11px] text-slate-400">Full System Privileges</span>
        </div>
      </div>

      {/* Main Module Management Panel */}
      <div className="v2-surface bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        {/* Toolbar */}
        <FilterDesk actions={<><button
              onClick={() => handleSetAll(true)}
              className="v2-button px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 transition-colors shadow-xs"
            >
              Turn All ON
            </button><button
              onClick={() => handleSetAll(false)}
              className="v2-button px-3 py-1.5 text-xs font-semibold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 rounded-lg border border-rose-200 dark:border-rose-800 hover:bg-rose-100 transition-colors shadow-xs"
            >
              Turn All OFF
            </button><button
              onClick={handleReset}
              className="v2-button px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors shadow-xs flex items-center gap-1"
            >
              <RefreshCw size={12} />
              Reset Defaults
            </button></>}><div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4" data-filter-layout="">
          {/* Search */}
          <div data-filter-field="search"><span className="filter-field-label">Search</span><div className="relative w-full lg:w-80" data-filter-input-wrap="">
            <Search size={16} className="absolute left-3.5 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search module name..."
              className="v2-control w-full pl-10 pr-3.5 py-2 text-xs sm:text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden text-slate-900 dark:text-white"
            />
          </div></div>

          {/* Bulk Controls */}
          <div className="flex items-center gap-2 flex-wrap">
            
            
            
          </div>
        </div><div className="filter-presets"><div className="v2-ledger-scroll px-5 pt-3 pb-2 flex items-center gap-1.5 overflow-x-auto no-scrollbar border-b border-slate-100 dark:border-slate-800/80">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={"v2-button " + (`px-3 py-1 rounded-full text-xs font-semibold transition-all whitespace-nowrap ${
                selectedCategory === cat
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`)}
            >
              {cat === 'all' ? 'All Modules' : cat}
            </button>
          ))}
        </div></div></FilterDesk>

        {/* Category Pills */}
        

        {/* Modules Grid */}
        <div className="v2-grid p-5 grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {filteredModules.map((item) => {
            const isEnabled = config[item.id] !== false;
            const Icon = getModuleIcon(item.id);

            return (
              <div
                key={item.id}
                className={`p-4 rounded-xl border flex items-center justify-between transition-all ${
                  isEnabled
                    ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xs'
                    : 'bg-slate-50 dark:bg-slate-950/70 border-slate-200/80 dark:border-slate-800/80'
                }`}
              >
                <div className="flex items-center gap-3.5 min-w-0 pr-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                    isEnabled
                      ? 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500'
                  }`}>
                    <Icon size={20} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className={"v2-heading " + (`font-bold text-sm truncate ${isEnabled ? 'text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-300'}`)}>
                        {item.label}
                      </h3>
                      {isEnabled ? (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-sm bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                          ON
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-sm bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                          OFF
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">{item.description}</p>
                    <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 mt-0.5 block">{item.path}</span>
                  </div>
                </div>

                {/* Toggle Switch */}
                <div className="flex items-center gap-2.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleToggle(item.id, item.label)}
                    className={"v2-button " + (`relative inline-flex h-6 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                      isEnabled ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'
                    }`)}
                    role="switch"
                    aria-checked={isEnabled}
                  >
                    <span
                      aria-hidden="true"
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                        isEnabled ? 'translate-x-6' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div></ModuleWorkspace>
  );
};
