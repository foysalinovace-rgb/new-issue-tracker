import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ShieldAlert, 
  Lock, 
  ArrowLeft, 
  LayoutDashboard, 
  Sliders,
  CheckCircle2,
  AlertTriangle 
} from 'lucide-react';
import { adminAuthService, ModuleConfig, DEFAULT_MODULE_CONFIG } from '../../services/adminAuthService';

interface ModuleRouteGuardProps {
  moduleId: keyof ModuleConfig;
  moduleName?: string;
  children: React.ReactNode;
}

export const ModuleRouteGuard: React.FC<ModuleRouteGuardProps> = ({
  moduleId,
  moduleName,
  children,
}) => {
  const navigate = useNavigate();
  const [config, setConfig] = useState<ModuleConfig>(() => adminAuthService.getModuleConfig());
  const [isAdmin, setIsAdmin] = useState(() => adminAuthService.isAdminLoggedIn());

  useEffect(() => {
    const handleConfigChange = (e: any) => {
      if (e.detail) {
        setConfig(e.detail);
      } else {
        setConfig(adminAuthService.getModuleConfig());
      }
    };

    const handleAuthChange = () => {
      setIsAdmin(adminAuthService.isAdminLoggedIn());
    };

    window.addEventListener('module-config-changed', handleConfigChange);
    window.addEventListener('admin-auth-changed', handleAuthChange);

    // Also trigger a fresh remote check
    adminAuthService.fetchModuleConfig().then((fresh) => {
      setConfig(fresh);
    });

    return () => {
      window.removeEventListener('module-config-changed', handleConfigChange);
      window.removeEventListener('admin-auth-changed', handleAuthChange);
    };
  }, []);

  const isEnabled = config[moduleId] !== false;

  if (isEnabled) {
    return <>{children}</>;
  }

  // Module is disabled: Show polished Access Denied / Module Inactive screen
  const displayName = moduleName || moduleId;

  return (
    <div className="min-h-[75vh] flex items-center justify-center p-4">
      <div className="max-w-lg w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden text-center p-8 transition-all">
        {/* Warning Icon Badge */}
        <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/80 flex items-center justify-center text-rose-600 dark:text-rose-400 shadow-sm animate-pulse">
          <ShieldAlert size={34} />
        </div>

        {/* Status Pill */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 mb-3 border border-rose-200 dark:border-rose-800/60">
          <Lock size={12} />
          <span>মডিউলটি বন্ধ রয়েছে (Module Deactivated)</span>
        </div>

        {/* Header */}
        <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mb-2">
          {displayName} বন্ধ করা হয়েছে
        </h2>

        {/* Explanations */}
        <p className="text-sm font-medium text-slate-600 dark:text-slate-300 mb-3 leading-relaxed">
          অ্যাডমিন কন্ট্রোল প্যানেল থেকে এই মডিউলটি অফ (OFF) করে রাখা হয়েছে। সিস্টেমের যেকোনো স্থান বা সরাসরি ব্রাউজার URL ব্যবহার করেও এই মডিউলটি এখন দেখা যাবে না।
        </p>

        <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 font-mono">
          This module is disabled in the Admin Control Panel. Direct URL access and navigation to this section are currently restricted.
        </p>

        {/* Action Buttons */}
        

        {/* Help footer */}
        <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800/80 text-[11px] text-slate-400">
          প্রয়োজন হলে সিস্টেম অ্যাডমিনিস্ট্রেটরের সাথে যোগাযোগ করুন অথবা অ্যাডমিন প্যানেল থেকে মডিউলটি চালু (ON) করুন।
        </div>
      </div>
    </div>
  );
};
