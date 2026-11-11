import { authService } from './authService';
import { supabase } from '../lib/supabase';

export interface ModuleConfig {
  Dashboard: boolean;
  Sales: boolean;
  Retention: boolean;
  IssueEntry: boolean;
  IssueReports: boolean;
  CSATReport: boolean;
  Analytics: boolean;
  WeeklyReport: boolean;
  MonthlyEntry: boolean;
  MonthlyReports: boolean;
  DowntimeEntry: boolean;
  DowntimeReports: boolean;
  NoticeGenerator: boolean;
  SimFinder: boolean;
  Settings: boolean;
}

export const DEFAULT_MODULE_CONFIG: ModuleConfig = {
  Dashboard: true,
  Sales: true,
  Retention: true,
  IssueEntry: true,
  IssueReports: true,
  CSATReport: true,
  Analytics: true,
  WeeklyReport: true,
  MonthlyEntry: true,
  MonthlyReports: true,
  DowntimeEntry: true,
  DowntimeReports: true,
  NoticeGenerator: true,
  SimFinder: true,
  Settings: true,
};

export interface ModuleItemMeta {
  id: keyof ModuleConfig;
  label: string;
  description: string;
  category: 'Main' | 'Retention' | 'Issues' | 'Monthly' | 'Infrastructure' | 'Config';
  path: string;
}

export const MODULE_META_LIST: ModuleItemMeta[] = [
  { id: 'Dashboard', label: 'Dashboard', description: 'Overview and system metrics', category: 'Main', path: '/dashboard' },
  { id: 'Sales', label: 'Sales (Parent Module)', description: 'Sales entry, multi-product line items, orders & revenue reports', category: 'Main', path: '/sales/dashboard' },
  { id: 'Retention', label: 'Retention (Parent Module)', description: 'Customer relationship and churn management (7 sections)', category: 'Retention', path: '/retention/dashboard' },
  { id: 'IssueEntry', label: 'Issue Entry', description: 'Log client issue tickets', category: 'Issues', path: '/issue-entry' },
  { id: 'IssueReports', label: 'Issue Reports', description: 'Issue breakdown & client reports', category: 'Issues', path: '/issue-reports' },
  { id: 'CSATReport', label: 'CSAT Report', description: 'Customer satisfaction & executive performance analytics', category: 'Issues', path: '/csat-report' },
  { id: 'Analytics', label: 'Analytics', description: 'Charts and analytics trends', category: 'Issues', path: '/analytics' },
  { id: 'WeeklyReport', label: 'Weekly Report', description: 'Weekly operational performance summary', category: 'Issues', path: '/weekly-report' },
  { id: 'MonthlyEntry', label: 'Monthly Entry', description: 'Monthly issue categorization', category: 'Monthly', path: '/monthly-entry' },
  { id: 'MonthlyReports', label: 'Monthly Reports', description: 'Monthly aggregated issue reports', category: 'Monthly', path: '/monthly-reports' },
  { id: 'DowntimeEntry', label: 'Downtime Entry', description: 'System downtime & outage logger', category: 'Infrastructure', path: '/downtime-entry' },
  { id: 'DowntimeReports', label: 'Downtime Reports', description: 'Infrastructure downtime analysis', category: 'Infrastructure', path: '/downtime-reports' },
  { id: 'NoticeGenerator', label: 'Notice Generator', description: 'Automated client notice broadcaster', category: 'Config', path: '/notice-generator' },
  { id: 'SimFinder', label: 'SIM Finder', description: 'SIM & device inventory tracking', category: 'Config', path: '/sim-finder' },
  { id: 'Settings', label: 'Settings', description: 'System branding & configurations', category: 'Config', path: '/settings' },
];

const STORAGE_KEYS = {
  MODULE_CONFIG: 'app_sidebar_modules_config_v1',
};

export const adminAuthService = {
  isAdminLoggedIn(): boolean {
    const user = authService.getCurrentUser();
    return user?.role === 'super_admin' && user.is_active === true;
  },
  async login(email: string, password: string) {
    try { await authService.signIn(email, password); return { success: true }; }
    catch (error) { return { success: false, error: error instanceof Error ? error.message : 'Sign in failed.' }; }
  },
  async logout(): Promise<void> { await authService.signOut(); },

  getModuleConfig(): ModuleConfig {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.MODULE_CONFIG);
      if (data) {
        return { ...DEFAULT_MODULE_CONFIG, ...JSON.parse(data) };
      }
    } catch {}
    return { ...DEFAULT_MODULE_CONFIG };
  },

  isModuleEnabled(moduleId: keyof ModuleConfig): boolean {
    const config = this.getModuleConfig();
    return config[moduleId] !== false;
  },

  async fetchModuleConfig(): Promise<ModuleConfig> {
    let remoteConfig: Partial<ModuleConfig> | null = null;

    // 1. Try server API endpoint first (works across all browsers and devices)
    try {
      const res = await fetch('/api/admin/module-config', {
        headers: { 'Cache-Control': 'no-cache' }
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.config) {
          remoteConfig = json.config;
        }
      }
    } catch {
      // Server API might be unavailable in direct client test or offline
    }

    // 2. If server API returned nothing, fetch from Supabase settings table
    if (!remoteConfig) {
      try {
        const { data, error } = await supabase
          .from('settings')
          .select('name')
          .eq('category', 'module_config')
          .limit(1);

        if (!error && data && data.length > 0 && data[0].name) {
          remoteConfig = JSON.parse(data[0].name);
        }
      } catch (err) {
        console.warn('Failed to fetch module config from Supabase:', err);
      }
    }

    if (remoteConfig) {
      const merged: ModuleConfig = { ...DEFAULT_MODULE_CONFIG, ...remoteConfig };
      const currentStored = localStorage.getItem(STORAGE_KEYS.MODULE_CONFIG);
      const newStored = JSON.stringify(merged);

      if (currentStored !== newStored) {
        localStorage.setItem(STORAGE_KEYS.MODULE_CONFIG, newStored);
        window.dispatchEvent(new CustomEvent('module-config-changed', { detail: merged }));
      }
      return merged;
    }

    return this.getModuleConfig();
  },

  saveModuleConfig(config: ModuleConfig): void {
    const serialized = JSON.stringify(config);
    localStorage.setItem(STORAGE_KEYS.MODULE_CONFIG, serialized);
    window.dispatchEvent(new CustomEvent('module-config-changed', { detail: config }));

    // 1. Persist to server API
    authService.headers().then(headers => fetch('/api/admin/module-config', {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ config }),
    })).then(response => { if (!response.ok) throw new Error('Module configuration update was denied.'); }).catch(err => {
      console.warn('Could not save module config to server API:', err);
    });

    // 2. Persist to Supabase settings table for cloud/multi-browser persistence
    (async () => {
      try {
        const { data: existing } = await supabase
          .from('settings')
          .select('id')
          .eq('category', 'module_config')
          .limit(1);

        if (existing && existing.length > 0) {
          await supabase
            .from('settings')
            .update({ name: serialized })
            .eq('id', existing[0].id);
        } else {
          await supabase
            .from('settings')
            .insert([{ category: 'module_config', name: serialized }]);
        }
      } catch (err) {
        console.warn('Could not persist module config to Supabase:', err);
      }
    })();
  },

  toggleModule(moduleId: keyof ModuleConfig): ModuleConfig {
    const current = this.getModuleConfig();
    const updated = {
      ...current,
      [moduleId]: !current[moduleId],
    };
    this.saveModuleConfig(updated);
    return updated;
  },

  setAllModules(state: boolean): ModuleConfig {
    const updated: ModuleConfig = {
      Dashboard: state,
      Sales: state,
      Retention: state,
      IssueEntry: state,
      IssueReports: state,
      CSATReport: state,
      Analytics: state,
      WeeklyReport: state,
      MonthlyEntry: state,
      MonthlyReports: state,
      DowntimeEntry: state,
      DowntimeReports: state,
      NoticeGenerator: state,
      SimFinder: state,
      Settings: state,
    };
    this.saveModuleConfig(updated);
    return updated;
  }
};

// Initialize multi-browser background synchronization
if (typeof window !== 'undefined') {
  // Sync on initial app load
  adminAuthService.fetchModuleConfig();

  // Listen to cross-tab storage changes
  window.addEventListener('storage', (e) => {
    if (e.key === 'app_sidebar_modules_config_v1') {
      try {
        const parsed = e.newValue ? JSON.parse(e.newValue) : DEFAULT_MODULE_CONFIG;
        window.dispatchEvent(new CustomEvent('module-config-changed', { detail: parsed }));
      } catch {}
    }
  });

  // Background sync interval (every 4 seconds) to detect changes from other browsers
  setInterval(() => {
    adminAuthService.fetchModuleConfig();
  }, 4000);
}

