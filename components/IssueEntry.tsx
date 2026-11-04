import { authService } from '../services/authService';
import { ModuleWorkspace } from './common/ModuleWorkspace';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { dbService } from '../services/dbService';
import { isLocalMode, isSheetsSyncEnabled } from '../lib/supabase';
import { SettingItem } from '../types';
import { 
  CheckCircle, 
  AlertCircle, 
  Building2, 
  Sparkles,
  Clock, 
  User, 
  Tag, 
  Layers, 
  AlertTriangle, 
  Smile, 
  Calendar, 
  RotateCcw, 
  FileText, 
  Send,
  CheckCircle2,
  ExternalLink,
  MessageSquare
} from 'lucide-react';

const convert24hTo12h = (time24: string): string => {
  if (!time24) return '';
  const parts = time24.split(':');
  if (parts.length < 2) return time24;
  let hours = parseInt(parts[0], 10);
  const minutes = parts[1];
  if (isNaN(hours)) return time24;
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12; // supports 12 instead of 0
  const formattedHours = String(hours).padStart(2, '0');
  return `${formattedHours}:${minutes} ${ampm}`;
};

const convert12hTo24h = (time12: string): string => {
  if (!time12) return '';
  const match = time12.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!match) return '';
  let hours = parseInt(match[1], 10);
  const minutes = match[2];
  const ampm = match[3].toUpperCase();
  if (ampm === 'PM' && hours < 12) {
    hours += 12;
  } else if (ampm === 'AM' && hours === 12) {
    hours = 0;
  }
  return `${String(hours).padStart(2, '0')}:${minutes}`;
};

const isSystemBug = (type?: string): boolean => {
  if (!type) return false;
  return type.toLowerCase().includes('bug');
};

const IssueEntry: React.FC = () => {
  const [formData, setFormData] = useState({
    client_name: '',
    issue_type: '',
    category: '',
    segment: '',
    clickup_ticket_id: '',
    priority: '',
    status: 'Open',
    assigned_person: '',
    issue_details: '',
    issue_date: new Date().toISOString().split('T')[0],
    response_time: '',
    resolution_time: '',
    resolution_date: new Date().toISOString().split('T')[0],
    client_reporting_time: '',
    issue_resolved_confirmed: '',
    feedback_rating: '' as string | number,
    customer_satisfaction: '',
    feedback_date: '',
    called_by: '',
  });

  const getCurrentTime12h = () => {
    const now = new Date();
    let hours = now.getHours();
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // supports 12 instead of 0
    const formattedHours = String(hours).padStart(2, '0');
    return `${formattedHours}:${minutes} ${ampm}`;
  };

  const [options, setOptions] = useState<{
    issueTypes: SettingItem[];
    categories: SettingItem[];
    segments: SettingItem[];
    priorities: SettingItem[];
    statuses: SettingItem[];
    assignedPersons: SettingItem[];
  }>({
    issueTypes: [],
    categories: [],
    segments: [],
    priorities: [],
    statuses: [],
    assignedPersons: [],
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Client suggestions state
  const [knownClients, setKnownClients] = useState<{ name: string; count: number }[]>([]);
  const [showClientSuggestions, setShowClientSuggestions] = useState(false);
  const [highlightedClientIndex, setHighlightedClientIndex] = useState(-1);
  const clientContainerRef = useRef<HTMLDivElement>(null);
  const clientInputRef = useRef<HTMLInputElement>(null);

  const [useLiveTime, setUseLiveTime] = useState(true);
  const [manualDate, setManualDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [manualTime, setManualTime] = useState(() => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  });

  const formatDate12h = (dateTimeStr: string) => {
    if (!dateTimeStr) return '';
    const dateObj = new Date(dateTimeStr);
    if (isNaN(dateObj.getTime())) return dateTimeStr;

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const day = String(dateObj.getDate()).padStart(2, '0');
    const month = months[dateObj.getMonth()];
    const year = dateObj.getFullYear();
    
    let hours = dateObj.getHours();
    const minutes = String(dateObj.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const formattedHours = String(hours).padStart(2, '0');

    return `${day}-${month}-${year} ${formattedHours}:${minutes} ${ampm}`;
  };

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    const setSelectedDateAndTimeToFormData = (dateObj: Date) => {
      const year = dateObj.getFullYear();
      const month = String(dateObj.getMonth() + 1).padStart(2, '0');
      const day = String(dateObj.getDate()).padStart(2, '0');
      const hours = String(dateObj.getHours()).padStart(2, '0');
      const minutes = String(dateObj.getMinutes()).padStart(2, '0');
      const seconds = String(dateObj.getSeconds()).padStart(2, '0');
      
      const formattedDateTime = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
      setFormData(prev => ({
        ...prev,
        issue_date: formattedDateTime
      }));
    };

    const updateFormDataFromManual = (dateStr: string, timeStr: string) => {
      if (!dateStr || !timeStr) return;
      const formattedDateTime = `${dateStr}T${timeStr}:00`;
      setFormData(prev => ({
        ...prev,
        issue_date: formattedDateTime
      }));
    };

    if (useLiveTime) {
      setSelectedDateAndTimeToFormData(new Date());

      interval = setInterval(() => {
        setSelectedDateAndTimeToFormData(new Date());
      }, 1000);
    } else {
      updateFormDataFromManual(manualDate, manualTime);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [useLiveTime, manualDate, manualTime]);

  useEffect(() => {
    loadOptions();
  }, []);

  const loadOptions = async () => {
    const [it, pr, st, ap, cat, seg, clients] = await Promise.all([
      dbService.getSettingsByCategory('issue_type'),
      dbService.getSettingsByCategory('priority'),
      dbService.getSettingsByCategory('status'),
      dbService.getSettingsByCategory('assigned_person'),
      dbService.getSettingsByCategory('issue_category'),
      dbService.getSettingsByCategory('segment'),
      dbService.getClientNames(),
    ]);

    setOptions({
      issueTypes: it,
      categories: cat,
      segments: seg,
      priorities: pr,
      statuses: st,
      assignedPersons: ap,
    });
    setKnownClients(clients);

    // Set initial defaults
    setFormData(prev => ({
      ...prev,
      issue_type: '',
      category: cat[0]?.name || '',
      segment: seg[0]?.name || '',
      priority: pr[0]?.name || '',
      status: st[0]?.name || 'Open',
      assigned_person: ap[0]?.name || '',
    }));
  };

  // Filter client suggestions based on user input
  const filteredClientSuggestions = useMemo(() => {
    const query = formData.client_name.trim().toLowerCase();
    if (!query) return [];
    return knownClients
      .filter(c => c.name.toLowerCase().includes(query))
      .slice(0, 8); // Top 8 matching clients
  }, [knownClients, formData.client_name]);

  // Handle clicking outside to dismiss suggestion dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (clientContainerRef.current && !clientContainerRef.current.contains(e.target as Node)) {
        setShowClientSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSelectClient = (clientName: string) => {
    setFormData(prev => ({ ...prev, client_name: clientName }));
    setShowClientSuggestions(false);
    setHighlightedClientIndex(-1);
  };

  const handleClientKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showClientSuggestions || filteredClientSuggestions.length === 0) {
      if (e.key === 'ArrowDown' && filteredClientSuggestions.length > 0) {
        setShowClientSuggestions(true);
        setHighlightedClientIndex(0);
        e.preventDefault();
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedClientIndex(prev => 
        prev < filteredClientSuggestions.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedClientIndex(prev => 
        prev > 0 ? prev - 1 : filteredClientSuggestions.length - 1
      );
    } else if (e.key === 'Enter') {
      if (highlightedClientIndex >= 0 && highlightedClientIndex < filteredClientSuggestions.length) {
        e.preventDefault();
        handleSelectClient(filteredClientSuggestions[highlightedClientIndex].name);
      }
    } else if (e.key === 'Escape') {
      setShowClientSuggestions(false);
      setHighlightedClientIndex(-1);
    }
  };

  const handleRatingChange = (val: string) => {
    const num = val ? Number(val) : '';
    let autoSat = formData.customer_satisfaction;
    if (num === 5) {
      autoSat = 'Excellent';
    } else if (num === 4) {
      autoSat = 'Good';
    } else if (num === 3) {
      autoSat = 'Average';
    } else if (num === 2) {
      autoSat = 'Poor';
    } else if (num === 1) {
      autoSat = 'Very Poor';
    }
    setFormData(prev => ({
      ...prev,
      feedback_rating: num,
      customer_satisfaction: autoSat
    }));
  };

  const handleReset = () => {
    setFormData(prev => ({
      ...prev,
      client_name: '',
      issue_type: '',
      clickup_ticket_id: '',
      issue_details: '',
      response_time: '',
      resolution_time: '',
      resolution_date: new Date().toISOString().split('T')[0],
      client_reporting_time: '',
      issue_resolved_confirmed: '',
      feedback_rating: '',
      customer_satisfaction: '',
      feedback_date: '',
      called_by: '',
    }));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(false);

    // Simple validation
    if (!formData.client_name || !formData.issue_details || !formData.issue_type || !formData.category || !formData.priority || !formData.assigned_person || !formData.issue_date) {
      setError('Please fill in all required fields (marked with *).');
      setIsLoading(false);
      return;
    }

    if (isSystemBug(formData.issue_type) && !formData.clickup_ticket_id.trim()) {
      setError('ClickUp Ticket ID is mandatory when Issue Type is System Bugs.');
      setIsLoading(false);
      return;
    }

    try {
      // 1. Save to Supabase
      let supabaseSuccess = false;
      try {
        let finalCreatedAt = formData.issue_date;
        if (formData.issue_date) {
          const parsedDate = new Date(formData.issue_date);
          if (!isNaN(parsedDate.getTime())) {
            finalCreatedAt = parsedDate.toISOString();
          }
        }

        await dbService.saveIssue({
          ...formData,
          feedback_rating: formData.feedback_rating ? Number(formData.feedback_rating) : undefined,
          created_at: finalCreatedAt
        });
        supabaseSuccess = true;
      } catch (sbError: any) {
        console.error('Supabase Save Error:', sbError);
        setError(`Save error: ${sbError.message || 'Failed to save to database'}`);
        setIsLoading(false);
        return;
      }

      // Sync through the server so the upstream response can be checked.
      if (supabaseSuccess && isSheetsSyncEnabled) {
        try {
          const response = await fetch('/api/google-sheets/append', {
            method: 'POST',
            headers: {
              ...await authService.headers(),
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData),
          });
          
          const result = await response.json();
          if (!response.ok || result.success === false) throw new Error(result.error || 'Google Sheets sync failed.');
        } catch (gsError) {
          console.error('Google Sheets Sync Error:', gsError);
          setError(`Issue saved, but Google Sheets sync failed: ${gsError instanceof Error ? gsError.message : 'Please check the Sheets connection.'}`);
        }
      }

      // Update local knownClients immediately
      const clientTrimmed = formData.client_name.trim();
      if (clientTrimmed) {
        setKnownClients(prev => {
          const exists = prev.find(c => c.name.toLowerCase() === clientTrimmed.toLowerCase());
          if (exists) {
            return prev.map(c => 
              c.name.toLowerCase() === clientTrimmed.toLowerCase() 
                ? { ...c, count: c.count + 1 } 
                : c
            );
          }
          return [{ name: clientTrimmed, count: 1 }, ...prev];
        });
      }

      setSuccess(true);
      setShowClientSuggestions(false);
      setHighlightedClientIndex(-1);
      setFormData(prev => ({
        ...prev,
        client_name: '',
        clickup_ticket_id: '',
        issue_details: '',
        response_time: '',
        resolution_time: '',
        client_reporting_time: '',
        issue_resolved_confirmed: '',
        feedback_rating: '',
        customer_satisfaction: '',
        feedback_date: '',
        called_by: '',
      }));
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setTimeout(() => setSuccess(false), 4000);
    } catch (err: any) {
      setError(`Error: ${err.message || 'An unexpected error occurred'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const isCurrentBug = isSystemBug(formData.issue_type);

  return (
    <ModuleWorkspace data-ui="v2" id="IssueEntry" number="01" title="Create an issue" description="Turn a customer conversation into a clear, actionable ticket." category="Support operations" kind="editor" links={[{"label":"Issue ledger","path":"/issue-reports"}]}><div className="v2-page-content">
      <div className="overview-heading"><div><div className="eyebrow"><span className="status-dot" />ISSUE MANAGEMENT</div><h1 className="v2-heading">Create an issue<span style={{ color: 'var(--muted)' }}>.</span></h1><p>Capture the details, assign ownership and keep every resolution on track.</p></div></div>
      {/* Status Alerts */}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 rounded-xl shadow-xs text-xs font-medium animate-in slide-in-from-top-2">
          <AlertCircle size={18} className="shrink-0 text-rose-500" />
          <div className="flex-1">{error}</div>
          <button 
            type="button" 
            onClick={() => setError(null)} 
            className="v2-button text-rose-500 hover:text-rose-700 text-xs font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-3 p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-300 rounded-xl shadow-xs text-xs font-medium animate-in slide-in-from-top-2">
          <CheckCircle2 size={18} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
          <div className="flex-1">
            <strong>Success!</strong> {isLocalMode ? 'Issue ticket saved on this browser and ready in your reports.' : 'Issue ticket saved to the database and ready in your reports.'}
          </div>
          
        </div>
      )}

      {/* Main Full-Page Form */}
      <form onSubmit={handleSubmit} className="v2-form space-y-6">
        <div className="v2-grid grid grid-cols-1 gap-4"><div className="issue-entry-sections space-y-4">
<div className="v2-surface bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs p-6 space-y-5">
              <div className="editor-section-intro"><div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                    <Building2 size={18} />
                  </div>
                  <div>
                    <h2 className="v2-heading text-sm font-bold text-slate-900 dark:text-white">
                      Client & Classification
                    </h2>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500">
                      Identify customer and categorize the nature of the issue
                    </p>
                  </div>
                </div>
                {knownClients.length > 0 && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                    <Sparkles size={12} className="text-indigo-500" />
                    {knownClients.length} Existing Clients
                  </span>
                )}
              </div></div><div className="editor-section-fields">

              {/* Client Name Input with Autocomplete */}
              <div ref={clientContainerRef} className="space-y-1.5 relative">
                <div className="flex items-center justify-between">
                  <label className="v2-label text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1">
                    Client Name <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[11px] text-slate-400 dark:text-slate-500">
                    Type to search previous clients
                  </span>
                </div>
                <div className="relative">
                  <input 
                    ref={clientInputRef}
                    type="text"
                    value={formData.client_name}
                    onChange={(e) => {
                      setFormData({ ...formData, client_name: e.target.value });
                      setShowClientSuggestions(true);
                      setHighlightedClientIndex(-1);
                    }}
                    onFocus={() => {
                      if (formData.client_name.trim().length > 0) {
                        setShowClientSuggestions(true);
                      }
                    }}
                    onKeyDown={handleClientKeyDown}
                    placeholder="e.g. Acme Corporation / Rahim Steel / Star Logistics"
                    autoComplete="off"
                    className="v2-control w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-900 outline-none transition-all text-slate-900 dark:text-white text-sm"
                  />

                  {/* Suggestions Dropdown */}
                  {showClientSuggestions && filteredClientSuggestions.length > 0 && (
                    <div className="v2-surface absolute top-full left-0 right-0 mt-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in-50 zoom-in-95 duration-150">
                      <div className="px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                        <span className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 font-bold">
                          <Sparkles size={13} />
                          Matching Clients ({filteredClientSuggestions.length})
                        </span>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500">↑↓ to navigate, ↵ to pick</span>
                      </div>
                      <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
                        {filteredClientSuggestions.map((item, index) => {
                          const isHighlighted = highlightedClientIndex === index;
                          const query = formData.client_name.trim().toLowerCase();
                          const idx = item.name.toLowerCase().indexOf(query);

                          return (
                            <button
                              key={item.name}
                              type="button"
                              onClick={() => handleSelectClient(item.name)}
                              onMouseEnter={() => setHighlightedClientIndex(index)}
                              className={"v2-button " + (`w-full px-4 py-2.5 text-left flex items-center justify-between transition-colors ${
                                isHighlighted
                                  ? 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-950 dark:text-indigo-100'
                                  : 'hover:bg-slate-50 dark:hover:bg-slate-800/70 text-slate-800 dark:text-slate-200'
                              }`)}
                            >
                              <div className="flex items-center gap-2.5 min-w-0 pr-2">
                                <div className={`p-1.5 rounded-lg shrink-0 ${isHighlighted ? 'bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-300' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`}>
                                  <Building2 size={14} />
                                </div>
                                <span className="text-sm truncate font-medium">
                                  {idx >= 0 ? (
                                    <>
                                      {item.name.substring(0, idx)}
                                      <span className="font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/80 px-1 rounded">
                                        {item.name.substring(idx, idx + query.length)}
                                      </span>
                                      {item.name.substring(idx + query.length)}
                                    </>
                                  ) : (
                                    item.name
                                  )}
                                </span>
                              </div>
                              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 shrink-0 font-semibold">
                                {item.count} {item.count === 1 ? 'issue' : 'issues'}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Classification Grid */}
              <div className="v2-grid grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Issue Type */}
                <div className="space-y-1.5">
                  <label className="v2-label text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1">
                    Issue Type <span className="text-rose-500">*</span>
                  </label>
                  <select 
                    value={formData.issue_type}
                    onChange={(e) => setFormData({...formData, issue_type: e.target.value})}
                    className="v2-control w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-900 outline-none transition-all text-slate-900 dark:text-white text-sm"
                  >
                    <option value="" className="bg-white dark:bg-slate-900">Select Issue Type</option>
                    <option value="System Bugs" className="bg-white dark:bg-slate-900">System Bugs</option>
                    <option value="Device Issues" className="bg-white dark:bg-slate-900">Device Issues</option>
                    <option value="Awareness" className="bg-white dark:bg-slate-900">Awareness</option>
                    <option value="Help Requests" className="bg-white dark:bg-slate-900">Help Requests</option>
                  </select>
                </div>

                {/* Category */}
                <div className="space-y-1.5">
                  <label className="v2-label text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1">
                    Category <span className="text-rose-500">*</span>
                  </label>
                  <select 
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                    className="v2-control w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-900 outline-none transition-all text-slate-900 dark:text-white text-sm"
                  >
                    <option value="" className="bg-white dark:bg-slate-900">Select Category</option>
                    {options.categories.map(c => (
                      <option key={c.id} value={c.name} className="bg-white dark:bg-slate-900">
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Segment */}
                <div className="space-y-1.5">
                  <label className="v2-label text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Segment
                  </label>
                  <select 
                    value={formData.segment}
                    onChange={(e) => setFormData({...formData, segment: e.target.value})}
                    className="v2-control w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-900 outline-none transition-all text-slate-900 dark:text-white text-sm"
                  >
                    <option value="" className="bg-white dark:bg-slate-900">Select Segment</option>
                    {options.segments.map(s => (
                      <option key={s.id} value={s.name} className="bg-white dark:bg-slate-900">
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* ClickUp Ticket ID */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="v2-label text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1">
                      ClickUp Ticket ID {isCurrentBug && <span className="text-rose-500">*</span>}
                    </label>
                    {isCurrentBug ? (
                      <span className="text-[10px] font-bold text-rose-600 bg-rose-50 dark:bg-rose-950/60 dark:text-rose-400 px-2 py-0.5 rounded-md border border-rose-200 dark:border-rose-900/60">
                        Mandatory for Bugs
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400">Optional</span>
                    )}
                  </div>
                  <input 
                    type="text"
                    value={formData.clickup_ticket_id}
                    onChange={(e) => setFormData({...formData, clickup_ticket_id: e.target.value})}
                    placeholder={isCurrentBug ? "e.g. #8678xyz (Required for System Bugs)" : "e.g. #8678xyz"}
                    className={"v2-control " + (`w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/70 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-900 outline-none transition-all text-slate-900 dark:text-white text-sm ${
                      isCurrentBug && !formData.clickup_ticket_id.trim()
                        ? 'border-amber-400 dark:border-amber-600 bg-amber-50/30 dark:bg-amber-950/20'
                        : 'border-slate-200 dark:border-slate-700'
                    }`)}
                  />
                </div>
              </div>
            </div></div>

<div className="v2-surface bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs p-6 space-y-5">
              <div className="editor-section-intro"><div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                  <User size={18} />
                </div>
                <div>
                  <h2 className="v2-heading text-sm font-bold text-slate-900 dark:text-white">
                    Ownership & Status
                  </h2>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500">
                    Assign responsible agent and define urgency
                  </p>
                </div>
              </div></div><div className="editor-section-fields">

              <div className="space-y-4">
                {/* Priority */}
                <div className="space-y-1.5">
                  <label className="v2-label text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1">
                    Priority <span className="text-rose-500">*</span>
                  </label>
                  <select 
                    value={formData.priority}
                    onChange={(e) => setFormData({...formData, priority: e.target.value})}
                    className="v2-control w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-900 outline-none transition-all text-slate-900 dark:text-white text-sm"
                  >
                    {options.priorities.map(p => (
                      <option key={p.id} value={p.name} className="bg-white dark:bg-slate-900">
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Assigned Person */}
                <div className="space-y-1.5">
                  <label className="v2-label text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1">
                    Assigned To <span className="text-rose-500">*</span>
                  </label>
                  <select 
                    value={formData.assigned_person}
                    onChange={(e) => setFormData({...formData, assigned_person: e.target.value})}
                    className="v2-control w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-900 outline-none transition-all text-slate-900 dark:text-white text-sm"
                  >
                    {options.assignedPersons.map(p => (
                      <option key={p.id} value={p.name} className="bg-white dark:bg-slate-900">
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Status */}
                <div className="space-y-1.5">
                  <label className="v2-label text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1">
                    Status <span className="text-rose-500">*</span>
                  </label>
                  <select 
                    value={formData.status}
                    onChange={(e) => setFormData({...formData, status: e.target.value})}
                    className="v2-control w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-900 outline-none transition-all text-slate-900 dark:text-white text-sm"
                  >
                    {options.statuses.map(s => (
                      <option key={s.id} value={s.name} className="bg-white dark:bg-slate-900">
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div></div>

<div className="v2-surface bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs p-6 space-y-5">
              <div className="editor-section-intro"><div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                  <Clock size={18} />
                </div>
                <div>
                  <h2 className="v2-heading text-sm font-bold text-slate-900 dark:text-white">
                    Timing & SLA Metrics
                  </h2>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500">
                    Record incident timestamps and service resolution milestones
                  </p>
                </div>
              </div></div><div className="editor-section-fields">

              {/* Ticket Creation Time Card */}
              <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200/70 dark:border-slate-700/60 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Ticket Create Time <span className="text-rose-500">*</span>
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                      {useLiveTime ? 'Live System Clock' : 'Manual Entry'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setUseLiveTime(!useLiveTime)}
                      className={"v2-button " + (`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${useLiveTime ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'}`)}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${useLiveTime ? 'translate-x-4' : 'translate-x-0'}`}
                      />
                    </button>
                  </div>
                </div>

                {useLiveTime ? (
                  <div className="v2-surface flex items-center justify-between bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 px-3 shadow-inner">
                    <div className="flex items-center gap-2.5">
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                      </span>
                      <span className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200">
                        {formatDate12h(formData.issue_date)}
                      </span>
                    </div>
                    <span className="text-[10px] font-bold uppercase py-0.5 px-2 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/40 rounded-md">
                      Live
                    </span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="v2-grid grid grid-cols-2 gap-2">
                      <input 
                        type="date"
                        value={manualDate}
                        onChange={(e) => setManualDate(e.target.value)}
                        className="v2-control w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all dark:text-white text-xs font-medium"
                      />
                      <input 
                        type="time"
                        value={manualTime}
                        onChange={(e) => setManualTime(e.target.value)}
                        className="v2-control w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all dark:text-white text-xs font-medium"
                      />
                    </div>
                    <div className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 p-2 rounded-lg border border-indigo-100/60 dark:border-indigo-900/40 font-mono">
                      Selected: {formatDate12h(formData.issue_date)}
                    </div>
                  </div>
                )}
              </div>

              {/* Three SLA Time Fields */}
              <div className="space-y-3 pt-1">
                {/* Client Reporting Time */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="v2-label text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      Client Reporting Time
                    </label>
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, client_reporting_time: getCurrentTime12h() }))}
                      className="v2-button text-xs text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 font-bold transition-colors cursor-pointer"
                    >
                      Set Now ({getCurrentTime12h()})
                    </button>
                  </div>
                  <input 
                    type="time"
                    value={convert12hTo24h(formData.client_reporting_time)}
                    onChange={(e) => setFormData({...formData, client_reporting_time: convert24hTo12h(e.target.value)})}
                    className="v2-control w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-900 outline-none transition-all text-slate-900 dark:text-white text-sm"
                  />
                </div>

                {/* Response Time */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="v2-label text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      Response Time
                    </label>
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, response_time: getCurrentTime12h() }))}
                      className="v2-button text-xs text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 font-bold transition-colors cursor-pointer"
                    >
                      Set Now ({getCurrentTime12h()})
                    </button>
                  </div>
                  <input 
                    type="time"
                    value={convert12hTo24h(formData.response_time)}
                    onChange={(e) => setFormData({...formData, response_time: convert24hTo12h(e.target.value)})}
                    className="v2-control w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-900 outline-none transition-all text-slate-900 dark:text-white text-sm"
                  />
                </div>

                {/* Resolution Date */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="v2-label text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      Resolution Date
                    </label>
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, resolution_date: new Date().toISOString().split('T')[0] }))}
                      className="v2-button text-xs text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 font-bold transition-colors cursor-pointer"
                    >
                      Set Today
                    </button>
                  </div>
                  <input 
                    type="date"
                    value={formData.resolution_date}
                    onChange={(e) => setFormData({...formData, resolution_date: e.target.value})}
                    className="v2-control w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-900 outline-none transition-all text-slate-900 dark:text-white text-sm"
                  />
                </div>

                {/* Resolution Time */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="v2-label text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      Resolution Time
                    </label>
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, resolution_time: getCurrentTime12h() }))}
                      className="v2-button text-xs text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 font-bold transition-colors cursor-pointer"
                    >
                      Set Now ({getCurrentTime12h()})
                    </button>
                  </div>
                  <input 
                    type="time"
                    value={convert12hTo24h(formData.resolution_time)}
                    onChange={(e) => setFormData({...formData, resolution_time: convert24hTo12h(e.target.value)})}
                    className="v2-control w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-900 outline-none transition-all text-slate-900 dark:text-white text-sm"
                  />
                </div>
              </div>
            </div></div>

<div className={"v2-surface " + (`bg-gradient-to-br ${isCurrentBug ? 'from-indigo-50/70 via-white to-purple-50/50 dark:from-slate-900 dark:via-slate-900 dark:to-indigo-950/30 border-2 border-indigo-200/80 dark:border-indigo-800/60' : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800'} rounded-2xl shadow-sm p-6 space-y-4 animate-in fade-in slide-in-from-top-3 duration-300`)}>
              <div className="editor-section-intro"><div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800/80">
                <h2 className="v2-heading text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-indigo-500 inline-block"></span>
                  Resolution Confirmation & Customer Feedback
                </h2>
                {isCurrentBug && (
                  <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-950/60 dark:text-indigo-400 px-2 py-0.5 rounded-md border border-indigo-200 dark:border-indigo-900/60">
                    System Bug Focus
                  </span>
                )}
              </div></div><div className="editor-section-fields">

              <div className="space-y-4">
                {/* Row 1: Resolved Confirmed, Feedback Rating, Customer Satisfaction */}
                <div className="v2-grid grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* 1. Issue Resolved Confirmed */}
                  <div className="space-y-1.5">
                    <label className="v2-label text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1">
                      Resolved Confirmed
                    </label>
                    <select 
                      value={formData.issue_resolved_confirmed}
                      onChange={(e) => setFormData({...formData, issue_resolved_confirmed: e.target.value})}
                      className="v2-control w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-slate-900 dark:text-white text-sm"
                    >
                      <option value="" className="bg-white dark:bg-slate-900">Select Response</option>
                      <option value="Yes" className="bg-white dark:bg-slate-900">Yes</option>
                      <option value="No" className="bg-white dark:bg-slate-900">No</option>
                      <option value="No Response" className="bg-white dark:bg-slate-900">No Response</option>
                    </select>
                  </div>

                  {/* 2. Feedback Rating (1 to 5) */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="v2-label text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1">
                        Feedback Rating
                      </label>
                      <span className="text-[10px] text-slate-400">1 - 5 Scale</span>
                    </div>
                    <select 
                      value={formData.feedback_rating}
                      onChange={(e) => handleRatingChange(e.target.value)}
                      className="v2-control w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-slate-900 dark:text-white text-sm font-medium"
                    >
                      <option value="" className="bg-white dark:bg-slate-900">Select Rating</option>
                      <option value="5" className="bg-white dark:bg-slate-900 font-semibold">5</option>
                      <option value="4" className="bg-white dark:bg-slate-900 font-semibold">4</option>
                      <option value="3" className="bg-white dark:bg-slate-900 font-semibold">3</option>
                      <option value="2" className="bg-white dark:bg-slate-900 font-semibold">2</option>
                      <option value="1" className="bg-white dark:bg-slate-900 font-semibold">1</option>
                    </select>
                  </div>

                  {/* 3. Customer Satisfaction (Auto-synced with Rating) */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="v2-label text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1">
                        Satisfaction
                      </label>
                      {formData.feedback_rating ? (
                        <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold">Auto-synced</span>
                      ) : null}
                    </div>
                    <select 
                      value={formData.customer_satisfaction}
                      onChange={(e) => setFormData({...formData, customer_satisfaction: e.target.value})}
                      className="v2-control w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-slate-900 dark:text-white text-sm font-semibold"
                    >
                      <option value="" className="bg-white dark:bg-slate-900">Select Satisfaction</option>
                      <option value="Excellent" className="bg-white dark:bg-slate-900 text-emerald-600 font-semibold">Excellent (অসাধারণ)</option>
                      <option value="Good" className="bg-white dark:bg-slate-900 text-teal-600 font-semibold">Good (ভালো)</option>
                      <option value="Average" className="bg-white dark:bg-slate-900 text-amber-600 font-semibold">Average (মোটামুটি)</option>
                      <option value="Poor" className="bg-white dark:bg-slate-900 text-orange-600 font-semibold">Poor (খারাপ)</option>
                      <option value="Very Poor" className="bg-white dark:bg-slate-900 text-rose-600 font-semibold">Very Poor (খুব খারাপ)</option>
                    </select>
                  </div>
                </div>

                {/* Row 2: Feedback Date and Called By */}
                <div className="v2-grid grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  {/* 4. Feedback Date */}
                  <div className="space-y-1.5">
                    <label className="v2-label text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1">
                      Feedback Date
                    </label>
                    <input 
                      type="date"
                      value={formData.feedback_date}
                      onChange={(e) => setFormData({...formData, feedback_date: e.target.value})}
                      className="v2-control w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-slate-900 dark:text-white text-sm"
                    />
                  </div>

                  {/* 5. Called By (Assigned Persons in System) */}
                  <div className="space-y-1.5">
                    <label className="v2-label text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1">
                      Called By
                    </label>
                    <select 
                      value={formData.called_by}
                      onChange={(e) => setFormData({...formData, called_by: e.target.value})}
                      className="v2-control w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-slate-900 dark:text-white text-sm"
                    >
                      <option value="" className="bg-white dark:bg-slate-900">Select Caller (Assigned Team)</option>
                      {options.assignedPersons.map(ap => (
                        <option key={ap.id} value={ap.name} className="bg-white dark:bg-slate-900">
                          {ap.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div></div>

<div className="v2-surface bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs p-6 space-y-4">
              <div className="editor-section-intro"><div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                    <FileText size={18} />
                  </div>
                  <div>
                    <h2 className="v2-heading text-sm font-bold text-slate-900 dark:text-white">
                      Issue Description & Findings
                    </h2>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500">
                      Detailed diagnostic notes, customer conversation summary, or bug behavior
                    </p>
                  </div>
                </div>
              </div></div><div className="editor-section-fields">

              <div className="space-y-1.5">
                <label className="v2-label text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1">
                  Issue Details <span className="text-rose-500">*</span>
                </label>
                <textarea 
                  rows={5}
                  value={formData.issue_details}
                  onChange={(e) => setFormData({...formData, issue_details: e.target.value})}
                  placeholder="Provide a clear and thorough description of the issue, error codes, steps to reproduce, or instructions given to the customer..."
                  className="v2-control w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-900 outline-none transition-all text-slate-900 dark:text-white text-sm leading-relaxed"
                />
              </div>
            </div></div>
</div></div>

        {/* Full-Width Form Submit Bar */}
        <div className="v2-surface bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={handleReset}
            disabled={isLoading}
            className="v2-button px-5 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
          >
            Reset
          </button>
          <button 
            type="submit"
            disabled={isLoading}
            className="v2-button v2-primary inline-flex items-center justify-center gap-2 px-8 py-3 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/25 active:scale-[0.99] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Submitting Ticket...</span>
              </>
            ) : (
              <>
                <Send size={15} />
                <span>Submit Issue Report</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div></ModuleWorkspace>
  );
};

export default IssueEntry;


