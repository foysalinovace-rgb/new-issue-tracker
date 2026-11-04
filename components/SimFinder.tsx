import { downloadStyledReport } from '../lib/excelReport';
import { FilterDesk } from './common/DataLedger';
import { ModuleWorkspace } from './common/ModuleWorkspace';
import React, { useState, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { 
  Search, 
  RefreshCw, 
  Copy, 
  Check, 
  Phone, 
  Download, 
  ChevronDown, 
  ChevronUp, 
  Database, 
  AlertCircle, 
  Info, 
  X,
  Layers,
  FileSpreadsheet
} from 'lucide-react';

interface RowRecord {
  deviceId: string;
  simNumber: string;
  sourceTab: string;
  rowNumber: number;
  additionalInfo: { [key: string]: string };
}

interface TabStats {
  name: string;
  totalRows: number;
  status: 'empty' | 'loading' | 'success' | 'error';
  errorMessage?: string;
}

export default function SimFinder() {
  // --- Core Cache state ---
  const [records, setRecords] = useState<RowRecord[]>([]);
  const [lastSynced, setLastSynced] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncLogs, setSyncLogs] = useState<string[]>([]);
  
  // --- Tab counts and load states for visualization ---
  const [tabStats, setTabStats] = useState<{ [key: string]: TabStats }>({
    'TFT MQTT': { name: 'TFT MQTT', totalRows: 0, status: 'empty' },
    'TFT HTTP': { name: 'TFT HTTP', totalRows: 0, status: 'empty' },
    'Dorpon seris': { name: 'Dorpon seris', totalRows: 0, status: 'empty' },
    'D-505 (BEP-Portable)': { name: 'D-505 (BEP-Portable)', totalRows: 0, status: 'empty' }
  });

  // --- Search Panel State ---
  const [searchQuery, setSearchQuery] = useState('');
  const [matchType, setMatchType] = useState<'exact' | 'contains'>('contains');
  const [selectedTabs, setSelectedTabs] = useState<string[]>([
    'TFT MQTT', 'TFT HTTP', 'Dorpon seris', 'D-505 (BEP-Portable)'
  ]);

  // --- Search Results Action States ---
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);
  const [searchPerformanceMs, setSearchPerformanceMs] = useState<number | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  // --- Constants for Google Sheets ---
  const SHEET1_ID = '1-6Xq4TUjJbP1Mfdv8OJmCu8o2DNMRiVY6CqUi3A-_sc';
  const SHEET2_ID = '1aOQyMNwZnLPRinAWAyUv-wmAgX2LXS9TpB6DhJ5HxLU';

  const TAB_CONFIGS = [
    {
      sheetId: SHEET1_ID,
      tabName: 'TFT MQTT',
      deviceIdIndex: 1, // Column B
      simNumIndex: 9,   // Column J
    },
    {
      sheetId: SHEET1_ID,
      tabName: 'TFT HTTP',
      deviceIdIndex: 2, // Column C
      simNumIndex: 4,   // Column E
    },
    {
      sheetId: SHEET1_ID,
      tabName: 'Dorpon seris',
      deviceIdIndex: 7, // Column H
      simNumIndex: 9,   // Column J
    },
    {
      sheetId: SHEET2_ID,
      tabName: 'D-505 (BEP-Portable)',
      deviceIdIndex: 3, // Column D
      simNumIndex: 8,   // Column I
    },
  ];

  // Load from LocalStorage on mount
  useEffect(() => {
    try {
      const cachedData = localStorage.getItem('sim_finder_records');
      const cachedTime = localStorage.getItem('sim_finder_last_synced');
      const cachedStats = localStorage.getItem('sim_finder_tab_stats');

      if (cachedData) {
        const parsedRecords = JSON.parse(cachedData);
        setRecords(parsedRecords);
        
        if (cachedTime) setLastSynced(cachedTime);
        if (cachedStats) {
          setTabStats(JSON.parse(cachedStats));
        } else {
          // Rebuild stats from records
          rebuildStatsAndCache(parsedRecords, cachedTime);
        }
      } else {
        // Automatically sync on first load to prevent blank experience
        triggerSyncAll();
      }
    } catch (e) {
      console.error("Error loading cached SIM Finder data", e);
    }
  }, []);

  const rebuildStatsAndCache = (loadedRecords: RowRecord[], timeStr: string | null) => {
    const statsUpdate = { ...tabStats };
    // Reset counters
    Object.keys(statsUpdate).forEach(k => {
      statsUpdate[k].totalRows = 0;
      statsUpdate[k].status = 'success';
    });

    loadedRecords.forEach(rec => {
      if (statsUpdate[rec.sourceTab]) {
        statsUpdate[rec.sourceTab].totalRows += 1;
      }
    });

    setTabStats(statsUpdate);
    if (timeStr) {
      localStorage.setItem('sim_finder_tab_stats', JSON.stringify(statsUpdate));
    }
  };

  // --- Fetch Function ---
  const fetchTabRecords = async (config: typeof TAB_CONFIGS[0]): Promise<RowRecord[]> => {
    const url = `https://docs.google.com/spreadsheets/d/${config.sheetId}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(config.tabName)}`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch tab ${config.tabName}. HTTP Status: ${response.status}`);
    }

    const text = await response.text();
    const startIdx = text.indexOf('{');
    const endIdx = text.lastIndexOf('}');
    
    if (startIdx === -1 || endIdx === -1) {
      throw new Error(`Invalid data format returned from ${config.tabName}`);
    }

    const jsonStr = text.substring(startIdx, endIdx + 1);
    const parsed = JSON.parse(jsonStr);

    if (parsed.status !== 'ok') {
      throw new Error(parsed.errors?.[0]?.message || `Error reading ${config.tabName}`);
    }

    const table = parsed.table;
    const rows = table.rows || [];
    const cols = table.cols || [];

    // Map column headers to friendly names or excel column letters
    const headers = cols.map((col: any, index: number) => {
      return col.label?.trim() || `Col ${String.fromCharCode(65 + index)}`;
    });

    const parsedRows: RowRecord[] = [];

    rows.forEach((row: any, rIdx: number) => {
      if (!row || !row.c) return;

      const getCellString = (index: number) => {
        const cell = row.c[index];
        if (!cell || cell.v === null || cell.v === undefined) return '';
        return String(cell.v).trim();
      };

      const deviceId = getCellString(config.deviceIdIndex);
      const rawSim = getCellString(config.simNumIndex);
      const simNumber = rawSim.replace(/\s+/g, ''); // spaces removed

      // Skip empty records
      if (!deviceId && !simNumber) return;

      // Extract adjacent properties as string key-value dictionary
      const additionalInfo: { [key: string]: string } = {};
      row.c.forEach((cell: any, cIdx: number) => {
        if (cell && cell.v !== null && cell.v !== undefined) {
          const header = headers[cIdx] || `Col ${String.fromCharCode(65 + cIdx)}`;
          // Avoid duplicate headers or keep them
          additionalInfo[header] = String(cell.v).trim();
        }
      });

      parsedRows.push({
        deviceId,
        simNumber,
        sourceTab: config.tabName,
        rowNumber: rIdx + 1,
        additionalInfo
      });
    });

    return parsedRows;
  };

  // --- Manual/Auto Sync Trigger ---
  const triggerSyncAll = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    setSyncLogs([]);
    
    const logs: string[] = [];
    const addLog = (msg: string) => {
      const timestamp = new Date().toLocaleTimeString();
      logs.push(`[${timestamp}] ${msg}`);
      setSyncLogs([...logs]);
    };

    addLog("Initializing integration sheets downloader...");
    
    const statsUpdate = { ...tabStats };
    const allRecordsParsed: RowRecord[] = [];

    // Track state for UI updates
    Object.keys(statsUpdate).forEach(k => {
      statsUpdate[k].status = 'loading';
      statsUpdate[k].errorMessage = undefined;
    });
    setTabStats({ ...statsUpdate });

    // Request promises
    const promises = TAB_CONFIGS.map(async (config) => {
      try {
        addLog(`Fetching sheet tab: "${config.tabName}"...`);
        const result = await fetchTabRecords(config);
        
        statsUpdate[config.tabName] = {
          name: config.tabName,
          totalRows: result.length,
          status: 'success'
        };
        setTabStats({ ...statsUpdate });
        addLog(`Successfully parsed ${result.length} device listings from "${config.tabName}".`);
        return result;
      } catch (err: any) {
        console.error(`Sync error on ${config.tabName}:`, err);
        statsUpdate[config.tabName] = {
          name: config.tabName,
          totalRows: 0,
          status: 'error',
          errorMessage: err.message || 'Network fetch issue'
        };
        setTabStats({ ...statsUpdate });
        addLog(`⚠️ Failed tab "${config.tabName}": ${err.message || 'unknown error'}`);
        return [];
      }
    });

    const results = await Promise.allSettled(promises);
    
    results.forEach((res) => {
      if (res.status === 'fulfilled') {
        allRecordsParsed.push(...res.value);
      }
    });

    const nowStr = new Date().toLocaleString();
    
    if (allRecordsParsed.length > 0) {
      setRecords(allRecordsParsed);
      setLastSynced(nowStr);
      
      // Save in LocalStorage
      localStorage.setItem('sim_finder_records', JSON.stringify(allRecordsParsed));
      localStorage.setItem('sim_finder_last_synced', nowStr);
      localStorage.setItem('sim_finder_tab_stats', JSON.stringify(statsUpdate));
      
      addLog(`Sync completed successfully. Processed ${allRecordsParsed.length} records in total.`);
    } else {
      addLog("⚠️ Completed sync but found 0 total records. Keeping existing cache if matches exist.");
    }
    
    setIsSyncing(false);
  };

  // --- Reset Cache ---
  const resetCache = () => {
    if (window.confirm("Are you sure you want to clear the local SIM entries cache? You will need to click Sync again to restore data.")) {
      localStorage.removeItem('sim_finder_records');
      localStorage.removeItem('sim_finder_last_synced');
      localStorage.removeItem('sim_finder_tab_stats');
      setRecords([]);
      setLastSynced(null);
      setTabStats({
        'TFT MQTT': { name: 'TFT MQTT', totalRows: 0, status: 'empty' },
        'TFT HTTP': { name: 'TFT HTTP', totalRows: 0, status: 'empty' },
        'Dorpon seris': { name: 'Dorpon seris', totalRows: 0, status: 'empty' },
        'D-505 (BEP-Portable)': { name: 'D-505 (BEP-Portable)', totalRows: 0, status: 'empty' }
      });
      setHasSearched(false);
    }
  };

  // --- Parse multiple Search Tokens ---
  const searchTokens = useMemo(() => {
    if (!searchQuery) return [];
    // Split by comma, spaces, or newlines
    return searchQuery
      .split(/[\s,\n]+/)
      .map(token => token.trim())
      .filter(token => token.length > 0);
  }, [searchQuery]);

  // --- Master Filter / Search Engine ---
  const searchResults = useMemo(() => {
    const startTime = performance.now();
    if (searchTokens.length === 0) {
      setSearchPerformanceMs(null);
      return [];
    }

    const filtered = records.filter(rec => {
      // 1. Verify Active Tab Option Checked
      if (!selectedTabs.includes(rec.sourceTab)) return false;

      // 2. Perform Lookup Match (Contains or Exact) on Device ID
      const devId = rec.deviceId.toLowerCase();
      
      return searchTokens.some(token => {
        const queryToken = token.toLowerCase();
        if (matchType === 'exact') {
          return devId === queryToken;
        } else {
          return devId.includes(queryToken);
        }
      });
    });

    const endTime = performance.now();
    setSearchPerformanceMs(Math.round((endTime - startTime) * 100) / 100);
    return filtered;
  }, [records, searchTokens, matchType, selectedTabs]);

  // Handle Search Submition UI Indicator
  const handleSearchKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      setHasSearched(true);
    }
  };

  // Toggle Tab Filter Checklist
  const toggleTabFilter = (tabName: string) => {
    if (selectedTabs.includes(tabName)) {
      if (selectedTabs.length > 1) {
        setSelectedTabs(selectedTabs.filter(t => t !== tabName));
      }
    } else {
      setSelectedTabs([...selectedTabs, tabName]);
    }
  };

  // Copy to Clipboard Utility
  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Export Filtered Dataset to Excel (.xlsx) Download
  const handleExportCSV = () => {
    if (searchResults.length === 0) return;

    // Headings
    const baseHeaders = ['SL', 'Device ID', 'SIM Number', 'Sheet Source', 'Row Index'];
    
    // Find all distinct additional keys across results
    const additionalKeysSet = new Set<string>();
    searchResults.forEach(res => {
      Object.keys(res.additionalInfo).forEach(k => {
        additionalKeysSet.add(k);
      });
    });
    const extraHeaders = Array.from(additionalKeysSet);
    const finalHeaders = [...baseHeaders, ...extraHeaders];

    const rows: (string | number)[][] = searchResults.map((res, index) => {
      const rowData: (string | number)[] = [
        index + 1,
        res.deviceId || '',
        res.simNumber || '',
        res.sourceTab || '',
        res.rowNumber || ''
      ];

      extraHeaders.forEach(header => {
        rowData.push(res.additionalInfo[header] || '');
      });

      return rowData;
    });

    const ws = XLSX.utils.aoa_to_sheet([finalHeaders, ...rows]);
    
    // Set clean, readable column widths
    const baseCols = [
      { wch: 8 },  // SL
      { wch: 22 }, // Device ID
      { wch: 22 }, // SIM Number
      { wch: 24 }, // Sheet Source
      { wch: 14 }  // Row Index
    ];
    extraHeaders.forEach(() => {
      baseCols.push({ wch: 20 });
    });
    ws['!cols'] = baseCols;

    if (rows.length > 0) {
      ws['!autofilter'] = { ref: `A1:${XLSX.utils.encode_col(finalHeaders.length - 1)}${rows.length + 1}` };
    }

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'SIM Search Results');

    const today = new Date().toISOString().split('T')[0];
    downloadStyledReport(wb, `SIM_Finder_Export_${today}.xlsx`);
  };

  // Tab Accent Color Builders
  const getTabBadgeColor = (tabName: string) => {
    switch (tabName) {
      case 'TFT MQTT':
        return 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30';
      case 'TFT HTTP':
        return 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border border-blue-100 dark:border-blue-900/30';
      case 'Dorpon seris':
        return 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-100 dark:border-amber-900/30';
      case 'D-505 (BEP-Portable)':
        return 'bg-fuchsia-50 dark:bg-fuchsia-950/40 text-fuchsia-700 dark:text-fuchsia-400 border border-fuchsia-100 dark:border-fuchsia-900/30';
      default:
        return 'bg-slate-50 dark:bg-slate-900 text-slate-700 border border-slate-200';
    }
  };

  return (
    <ModuleWorkspace data-ui="v2" id="SimFinder" number="11" title="SIM lookup" description="A dedicated search desk for your device and SIM inventory." category="Workspace tools" kind="studio" links={[]}><div className="v2-page-content">
      {/* Dynamic Header & Last Synced Indicators */}
      <div className="v2-surface p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="v2-heading text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Database className="text-indigo-500 h-5 w-5" />
              SIM Finder Engine
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Bulk lookup active SIM numbers mapping across multiple live Google sheets asynchronously.
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            {lastSynced && (
              <div className="flex flex-col text-right">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Last Sync Completed</span>
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">{lastSynced}</span>
              </div>
            )}
            
            <button
              onClick={triggerSyncAll}
              disabled={isSyncing}
              className={"v2-button " + (`flex items-center gap-2 px-4 py-2 text-xs font-bold text-white rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition-all ${isSyncing ? 'animate-pulse' : ''}`)}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'Syncing active tabs...' : 'Sync All Tabs Now'}
            </button>

            {records.length > 0 && (
              <button
                onClick={resetCache}
                className="v2-button p-2 text-xs font-bold text-slate-500 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl border border-slate-200 dark:border-slate-800 transition-colors"
                title="Clear Cache"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Live sync progress layout when syncing */}
        {isSyncing && (
          <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200/60 dark:border-slate-800/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Sync Progress Operations Log</span>
              <span className="p-1 text-[11px] font-black text-indigo-600 animate-pulse uppercase">Fetching active APIs...</span>
            </div>
            <div className="v2-surface max-h-28 overflow-y-auto font-mono text-[10px] text-slate-500 space-y-1 bg-white dark:bg-slate-950/70 p-3 rounded-xl border border-slate-100 dark:border-slate-900/50">
              {syncLogs.length === 0 ? (
                <div className="text-slate-400 italic">Initializing Google Services...</div>
              ) : (
                syncLogs.map((log, lIdx) => (
                  <div key={lIdx} className="leading-relaxed">{log}</div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Cumulative Sheet Stats Widgets Grid */}
        <div className="v2-grid grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          {(Object.values(tabStats) as TabStats[]).map((stat) => {
            const hasError = stat.status === 'error';
            const isLoading = stat.status === 'loading';
            return (
              <div 
                key={stat.name}
                className={`p-4 rounded-2xl border transition-all ${
                  hasError 
                    ? 'border-rose-200 bg-rose-50/25 dark:bg-rose-950/5 dark:border-rose-900/30' 
                    : 'border-slate-200/70 bg-slate-50/50 dark:bg-slate-900/30 dark:border-slate-800/50'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className={`text-[10px] font-extrabold uppercase tracking-widest ${hasError ? 'text-rose-500' : 'text-slate-400 dark:text-slate-500'}`}>
                    {stat.name}
                  </span>
                  
                  {isLoading && (
                    <span className="h-2 w-2 rounded-full bg-indigo-500 animate-ping" />
                  )}
                  {hasError && (
                    <AlertCircle className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                  )}
                  {!isLoading && !hasError && stat.totalRows > 0 && (
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  )}
                </div>

                <div className="mt-2 flex items-baseline gap-1.5">
                  <span className="text-2xl font-black text-slate-800 dark:text-white leading-none">
                    {isLoading ? (
                      <span className="text-slate-300 dark:text-slate-700 animate-pulse">...</span>
                    ) : (
                      stat.totalRows.toLocaleString()
                    )}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">rows</span>
                </div>

                {hasError ? (
                  <p className="mt-1 text-[10px] font-bold text-rose-600 line-clamp-1">{stat.errorMessage}</p>
                ) : (
                  <p className="mt-1 text-[10px] font-medium text-slate-500/70">Google Spreadsheet tab</p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Split Layout: Filter controls vs Results Area */}
      <div className="sim-workspace-layout">
        
        {/* Left column: Lookup panel controls */}
        <div className="sim-query-desk">
          <div className="v2-surface p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
            <div className="space-y-1">
              <h3 className="v2-heading text-sm font-bold text-slate-900 dark:text-white">Lookup Filters Configuration</h3>
              <p className="text-[11px] text-slate-500">Configure parameters for matching active SIM coordinates.</p>
            </div>

            {/* Bulk Textarea entry */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="v2-label text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                  Bulk Device Query ID *
                </label>
                {searchTokens.length > 0 && (
                  <span className="text-[10px] px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-dark-400 rounded-full font-bold">
                    {searchTokens.length} ID{searchTokens.length > 1 ? 's' : ''} parsed
                  </span>
                )}
              </div>
              <div className="relative">
                <textarea
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setHasSearched(true);
                  }}
                  onKeyDown={handleSearchKeyPress}
                  placeholder="Paste Device ID tokens here... (Delimited by commas, spaces, or newlines)&#10;Example:&#10;50012, 50035&#10;50081"
                  className="v2-control w-full h-40 px-3.5 py-3 text-xs bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-200 font-mono resize-none placeholder:font-sans placeholder:italic leading-relaxed shadow-inner"
                />
                {searchQuery && (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setHasSearched(false);
                    }}
                    className="v2-button absolute bottom-3 right-3 p-1 rounded-lg bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 transition-colors"
                    title="Clear entries"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <p className="text-[10px] text-slate-400">
                Tip: Paste multiple IDs simultaneously. Matches will generate automatically as you type.
              </p>
            </div>

            {/* Exact vs Partial Matching */}
            <FilterDesk title="Lookup options"><div className="space-y-1.5">
              <label className="v2-label text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                Matching Criteria
              </label>
              <div className="v2-grid grid grid-cols-2 gap-2 bg-slate-50 dark:bg-slate-950 p-1 rounded-xl border border-slate-200/50 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setMatchType('contains')}
                  className={"v2-button " + (`py-1.5 text-center text-xs font-bold rounded-lg transition-all ${
                    matchType === 'contains'
                      ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                  }`)}
                >
                  Contains (Partial)
                </button>
                <button
                  type="button"
                  onClick={() => setMatchType('exact')}
                  className={"v2-button " + (`py-1.5 text-center text-xs font-bold rounded-lg transition-all ${
                    matchType === 'exact'
                      ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                  }`)}
                >
                  Exact Match
                </button>
              </div>
            </div>

            {/* Tab Sources Filters Checklist */}
            <div className="space-y-2">
              <label className="v2-label text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                Source Tab checklist
              </label>
              <div className="space-y-1.5">
                {Object.keys(tabStats).map((tabName) => {
                  const isChecked = selectedTabs.includes(tabName);
                  const totalRows = tabStats[tabName].totalRows;
                  return (
                    <button
                      key={tabName}
                      type="button"
                      onClick={() => toggleTabFilter(tabName)}
                      className={"v2-button " + (`w-full flex items-center justify-between p-2.5 rounded-xl border text-left transition-colors ${
                        isChecked
                          ? 'bg-indigo-50/20 dark:bg-indigo-950/15 border-indigo-200/60 dark:border-indigo-900/30'
                          : 'bg-transparent border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/30'
                      }`)}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={`w-4 h-4 rounded flex items-center justify-center border transition-all ${
                          isChecked 
                            ? 'bg-indigo-600 border-indigo-600 text-white' 
                            : 'border-slate-300 dark:border-slate-700'
                        }`}>
                          {isChecked && <Check className="h-3 w-3 stroke-[3]" />}
                        </div>
                        <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                          {tabName}
                        </span>
                      </div>
                      <span className="text-[10px] font-black text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-full">
                        {totalRows} rows
                      </span>
                    </button>
                  );
                })}
              </div>
            </div></FilterDesk>

            {/* Quick Links Information */}
            <div className="p-3.5 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200/60 dark:border-slate-800 space-y-1.5">
              <div className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400">
                <Info size={14} className="shrink-0" />
                <span className="text-[10px] font-black uppercase tracking-wider">Connected Google Assets</span>
              </div>
              <ul className="text-[10px] text-slate-500 font-medium space-y-1">
                <li className="flex items-center justify-between">
                  <span>Main Web TFT Sheets</span>
                  <a href={`https://docs.google.com/spreadsheets/d/${SHEET1_ID}`} target="_blank" rel="noopener noreferrer" className="text-indigo-500 hover:underline font-bold">Open Link</a>
                </li>
                <li className="flex items-center justify-between">
                  <span>Portable Series Sheets</span>
                  <a href={`https://docs.google.com/spreadsheets/d/${SHEET2_ID}`} target="_blank" rel="noopener noreferrer" className="text-indigo-500 hover:underline font-bold">Open Link</a>
                </li>
              </ul>
            </div>

          </div>
        </div>

        {/* Right column: Results Showcase */}
        <div className="sim-results-desk">
          <div className="v2-surface p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm min-h-[400px] flex flex-col">
            
            {/* Table / Cards Filter Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-4 mb-4 gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <Layers className="text-indigo-500 h-4 w-4" />
                <h2 className="v2-heading text-sm font-bold text-slate-900 dark:text-white">
                  {searchResults.length > 0 
                    ? `Matching Results (${searchResults.length})` 
                    : 'Device SIM Outputs'
                  }
                </h2>
              </div>
              
              <div className="flex items-center gap-3">
                {searchPerformanceMs !== null && (
                  <span className="text-[10px] font-mono text-slate-400">
                    Query resolved in {searchPerformanceMs}ms
                  </span>
                )}
                
                {searchResults.length > 0 && (
                  <button
                    onClick={handleExportCSV}
                    className="v2-button flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-indigo-200 dark:border-indigo-900 bg-indigo-50/40 dark:bg-indigo-990/10 text-indigo-600 dark:text-indigo-400 text-xs font-bold hover:bg-indigo-50 dark:hover:bg-indigo-950/20 transition-colors"
                    title="Export Results to Excel (.xlsx)"
                  >
                    <Download size={13} />
                    Export Excel (.xlsx)
                  </button>
                )}
              </div>
            </div>

            {/* Display State Decisions */}
            {records.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                <div className="p-4 bg-amber-50 dark:bg-amber-950/30 rounded-full border border-amber-100 dark:border-amber-900/30 text-amber-500 mb-3 animate-bounce">
                  <Database size={24} />
                </div>
                <h4 className="v2-heading text-sm font-bold text-slate-800 dark:text-slate-200">Local SIM database is empty</h4>
                <p className="text-xs text-slate-500 max-w-sm mt-1 mb-4">
                  Initialize Google Visualization Query sync to import records. We automatically fetch on first load.
                </p>
                <button
                  onClick={triggerSyncAll}
                  disabled={isSyncing}
                  className="v2-button v2-primary px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md flex items-center gap-2 transition-all"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Manual Sync Google Sheets
                </button>
              </div>
            ) : !hasSearched || searchTokens.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-slate-400 dark:text-slate-600">
                <Search size={32} className="mb-2 stroke-[1.5]" />
                <h4 className="v2-heading text-xs font-bold text-slate-700 dark:text-slate-300">Ready to Finder Lookup</h4>
                <p className="text-xs text-slate-500 max-w-xs mt-1">
                  Type one or more Device IDs in the left panel to display corresponding SIM mapping details.
                </p>
              </div>
            ) : searchResults.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-slate-400 dark:text-slate-600">
                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-full mb-2">
                  <X size={20} className="text-slate-400" />
                </div>
                <h4 className="v2-heading text-xs font-bold text-slate-700 dark:text-slate-300">No matching Devices found</h4>
                <p className="text-xs text-slate-500 max-w-xs mt-1">
                  None of the active parsed sheets matched current filters or lookup strings. Check spelling or selected tabs.
                </p>
              </div>
            ) : (
              /* Beautiful Scrollable List of Result Cards */
              <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1">
                {searchResults.map((rec, rIdx) => {
                  const cardKey = `${rec.sourceTab}_${rec.deviceId}_${rec.rowNumber}_${rIdx}`;
                  const isExpanded = expandedCardId === cardKey;
                  return (
                    <div 
                      key={cardKey}
                      className="p-5 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/30 hover:bg-slate-50/70 dark:bg-slate-900/10 dark:hover:bg-slate-900/30 transition-all shadow-inner space-y-3"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] font-bold text-slate-400 font-mono tracking-wider">
                              ROW #{rec.rowNumber}
                            </span>
                            <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${getTabBadgeColor(rec.sourceTab)}`}>
                              {rec.sourceTab}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[11px] font-semibold text-slate-400">Device ID:</span>
                            <span className="text-sm font-black font-mono text-slate-900 dark:text-white select-all">
                              {rec.deviceId || 'UNKNOWN'}
                            </span>
                          </div>
                        </div>

                        {/* Card CTA Actions: Copy Number and Trigger Call Dialer */}
                        <div className="flex items-center gap-2">
                          {rec.simNumber && (
                            <>
                              <button
                                onClick={() => copyToClipboard(rec.simNumber, cardKey)}
                                className={"v2-button " + (`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold border transition-all ${
                                  copiedId === cardKey
                                    ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border-emerald-200'
                                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                                }`)}
                              >
                                {copiedId === cardKey ? (
                                  <>
                                    <Check size={12} className="stroke-[3]" />
                                    Copied!
                                  </>
                                ) : (
                                  <>
                                    <Copy size={12} />
                                    Copy SIM
                                  </>
                                )}
                              </button>

                              <a
                                href={`tel:${rec.simNumber}`}
                                className="p-2 bg-white dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 border border-slate-200 dark:border-slate-700 hover:border-indigo-200 text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-xl transition-all"
                                title={`Dial ${rec.simNumber}`}
                              >
                                <Phone size={13} />
                              </a>
                            </>
                          )}
                          
                          {/* Details Toggle Accordion */}
                          <button
                            onClick={() => setExpandedCardId(isExpanded ? null : cardKey)}
                            className="v2-button p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 rounded-xl transition-colors"
                            title="Inspect adjacent properties"
                          >
                            {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                          </button>
                        </div>
                      </div>

                      {/* Display Primary SIM Value with Elegant Fonts */}
                      <div className="v2-surface p-3 bg-white dark:bg-slate-950 rounded-xl border border-slate-200/55 dark:border-slate-800 flex items-center justify-between gap-4">
                        <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">
                          SIM Phone Number
                        </span>
                        
                        <span className="text-sm font-black font-mono text-indigo-600 dark:text-indigo-400 tracking-wide select-all">
                          {rec.simNumber || 'EMPTY VALUE'}
                        </span>
                      </div>

                      {/* Accordion Expandable Adjacent spreadsheet details */}
                      {isExpanded && (
                        <div className="v2-surface pt-3 border-t border-slate-200/50 dark:border-slate-800/60 p-3 bg-white dark:bg-slate-950/50 rounded-xl space-y-2">
                          <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                            <FileSpreadsheet size={12} className="text-slate-400" />
                            Row Property Explorer (Adjacent attributes)
                          </h5>
                          
                          <div className="v2-grid grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                            {Object.entries(rec.additionalInfo).map(([header, cellVal]) => {
                              // Avoid duplicating device/sim if desired or keep all
                              return (
                                <div key={header} className="p-2 bg-slate-50/55 dark:bg-slate-900/60 rounded-lg border border-slate-100 dark:border-slate-900 flex flex-col">
                                  <span className="text-[9px] font-black text-slate-400 uppercase truncate" title={header}>
                                    {header}
                                  </span>
                                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-350 mt-0.5 select-all break-all leading-tight">
                                    {cellVal || <span className="italic text-[10px] text-slate-400/50 font-normal">blank</span>}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                    </div>
                  );
                })}
              </div>
            )}

          </div>
        </div>

      </div>
    </div></ModuleWorkspace>
  );
}

