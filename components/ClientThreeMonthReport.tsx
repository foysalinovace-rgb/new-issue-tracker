import { downloadStyledReport } from '../lib/excelReport';
import { DataLedger, FilterDesk } from './common/DataLedger';
import { ModuleWorkspace } from './common/ModuleWorkspace';
import React, { useState, useMemo, useEffect } from 'react';
import { Issue } from '../types';
import { PRIORITY_COLORS, STATUS_COLORS } from '../constants';
import { dbService } from '../services/dbService';
import * as XLSX from 'xlsx';
import {
  Building2,
  Calendar,
  Search,
  Download,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  Layers,
  ArrowUpDown,
  Tag,
  RefreshCw
} from 'lucide-react';

interface ClientThreeMonthReportProps {
  issues?: Issue[];
  selectedYear?: string;
}

interface ClientGroup {
  clientName: string;
  totalIssues: number;
  resolvedIssues: number;
  openIssues: number;
  highPriorityIssues: number;
  topCategory: string;
  topIssueType: string;
  latestIssueDate: string;
  assignedPersons: string[];
  issues: Issue[];
}

export const ClientThreeMonthReport: React.FC<ClientThreeMonthReportProps> = ({ 
  issues: propIssues, 
  selectedYear 
}) => {
  // If issues prop is not provided, fetch from dbService
  const [internalIssues, setInternalIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!propIssues || propIssues.length === 0) {
      loadIssuesFromDb();
    }
  }, [propIssues]);

  const loadIssuesFromDb = async () => {
    setLoading(true);
    try {
      const data = await dbService.getIssues();
      setInternalIssues(data || []);
    } catch (err) {
      console.error('Failed to load issues for client report:', err);
    } finally {
      setLoading(false);
    }
  };

  const allIssues = propIssues && propIssues.length > 0 ? propIssues : internalIssues;

  // Helper to format Date to YYYY-MM-DD
  const formatYMD = (d: Date): string => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Compute default 3 months (90 days back to today)
  const getInitialDates = () => {
    const end = new Date();
    const start = new Date(end.getTime() - 90 * 24 * 60 * 60 * 1000);
    return {
      startStr: formatYMD(start),
      endStr: formatYMD(end),
    };
  };

  const initialDates = useMemo(() => getInitialDates(), []);

  // Date picker state - Default: 3 months (90 days)
  const [startDateInput, setStartDateInput] = useState<string>(initialDates.startStr);
  const [endDateInput, setEndDateInput] = useState<string>(initialDates.endStr);
  const [rangePreset, setRangePreset] = useState<'90days' | 'calendar3m' | '60days' | 'thisMonth' | 'allTime' | 'custom'>('90days');

  // Search & Sorting
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'mostIssues' | 'leastIssues' | 'alphabetical' | 'mostPending'>('mostIssues');
  const [expandedClients, setExpandedClients] = useState<Record<string, boolean>>({});

  // Pagination - Default 20 rows per page, with options: 20, 50, 100, 500, 1000
  const [itemsPerPage, setItemsPerPage] = useState<number>(20);
  const [currentPage, setCurrentPage] = useState(1);

  // Set Preset Dates
  const applyPreset = (preset: '90days' | 'calendar3m' | '60days' | 'thisMonth' | 'allTime') => {
    setRangePreset(preset);
    const end = new Date();
    let start = new Date();

    if (preset === '90days') {
      start = new Date(end.getTime() - 90 * 24 * 60 * 60 * 1000);
    } else if (preset === 'calendar3m') {
      start = new Date(end.getFullYear(), end.getMonth() - 2, 1);
    } else if (preset === '60days') {
      start = new Date(end.getTime() - 60 * 24 * 60 * 60 * 1000);
    } else if (preset === 'thisMonth') {
      start = new Date(end.getFullYear(), end.getMonth(), 1);
    } else if (preset === 'allTime') {
      start = new Date(2020, 0, 1);
    }

    setStartDateInput(formatYMD(start));
    setEndDateInput(formatYMD(end));
    setCurrentPage(1);
  };

  // Convert inputs to Date objects with start/end of day
  const { startDate, endDate, rangeLabel } = useMemo(() => {
    let start = new Date(startDateInput ? `${startDateInput}T00:00:00` : `${initialDates.startStr}T00:00:00`);
    let end = new Date(endDateInput ? `${endDateInput}T23:59:59.999` : `${initialDates.endStr}T23:59:59.999`);

    if (isNaN(start.getTime())) start = new Date(initialDates.startStr);
    if (isNaN(end.getTime())) end = new Date();

    let label = 'Custom Range';
    if (rangePreset === '90days') label = 'Default: Last 3 Months (90 Days)';
    else if (rangePreset === 'calendar3m') label = 'Past 3 Calendar Months';
    else if (rangePreset === '60days') label = 'Last 60 Days';
    else if (rangePreset === 'thisMonth') label = 'This Month';
    else if (rangePreset === 'allTime') label = 'All Recorded History';

    return { startDate: start, endDate: end, rangeLabel: label };
  }, [startDateInput, endDateInput, rangePreset, initialDates]);

  // Robust date parser for issues
  const parseIssueDate = (issue: Issue): Date | null => {
    const dateStr = issue.issue_date || issue.created_at;
    if (!dateStr) return null;

    let d = new Date(dateStr);
    if (!isNaN(d.getTime())) return d;

    // Handle DD-MM-YYYY or DD/MM/YYYY
    const parts = dateStr.split(/[-/]/);
    if (parts.length === 3 && parts[0].length <= 2 && parts[2].length === 4) {
      d = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
      if (!isNaN(d.getTime())) return d;
    }

    return null;
  };

  const formatDateDisplay = (d: Date) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${String(d.getDate()).padStart(2, '0')} ${months[d.getMonth()]} ${d.getFullYear()}`;
  };

  const formatIssueDateTime = (dateStr?: string, createdAtStr?: string) => {
    const targetStr = createdAtStr || dateStr;
    if (!targetStr) return '-';
    const dateObj = new Date(targetStr);
    if (isNaN(dateObj.getTime())) return targetStr;

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

    const isOnlyDate = targetStr && !targetStr.includes('T') && !targetStr.includes(':') && targetStr.length <= 10;
    const isMidnight = dateObj.getHours() === 0 && dateObj.getMinutes() === 0 && dateObj.getSeconds() === 0;

    if (isOnlyDate || isMidnight) {
      return `${day} ${month} ${year}`;
    }
    return `${day} ${month} ${year} ${formattedHours}:${minutes} ${ampm}`;
  };

  // Filter issues within the date window
  const periodIssues = useMemo(() => {
    const startTime = startDate.getTime();
    const endTime = endDate.getTime();

    return allIssues.filter(issue => {
      const issueDate = parseIssueDate(issue);
      if (!issueDate) return false;
      const t = issueDate.getTime();
      return t >= startTime && t <= endTime;
    });
  }, [allIssues, startDate, endDate]);

  // Group and summarize by Client
  const clientGroups: ClientGroup[] = useMemo(() => {
    const map: Record<string, Issue[]> = {};

    periodIssues.forEach(issue => {
      const client = (issue.client_name || 'Unknown Client').trim();
      if (!map[client]) {
        map[client] = [];
      }
      map[client].push(issue);
    });

    return Object.entries(map).map(([clientName, clientIssues]) => {
      // Sort issues newest first
      const sortedIssues = [...clientIssues].sort((a, b) => {
        const dateA = parseIssueDate(a)?.getTime() || 0;
        const dateB = parseIssueDate(b)?.getTime() || 0;
        return dateB - dateA;
      });

      const resolvedIssues = sortedIssues.filter(i => {
        const s = (i.status || '').toLowerCase();
        return s === 'done' || s === 'close';
      }).length;

      const openIssues = sortedIssues.filter(i => {
        const s = (i.status || '').toLowerCase();
        return s === 'open' || s === 'pending' || s === 'in progress';
      }).length;

      const highPriorityIssues = sortedIssues.filter(i => {
        return (i.priority || '').toLowerCase() === 'high';
      }).length;

      const catCounts: Record<string, number> = {};
      const typeCounts: Record<string, number> = {};
      const handlers = new Set<string>();

      sortedIssues.forEach(i => {
        if (i.category) catCounts[i.category] = (catCounts[i.category] || 0) + 1;
        if (i.issue_type) typeCounts[i.issue_type] = (typeCounts[i.issue_type] || 0) + 1;
        if (i.assigned_person) handlers.add(i.assigned_person.trim());
      });

      const topCategory = Object.entries(catCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'General';
      const topIssueType = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'System Bugs';
      const latestIssueDate = sortedIssues[0]?.issue_date || sortedIssues[0]?.created_at || '';

      return {
        clientName,
        totalIssues: sortedIssues.length,
        resolvedIssues,
        openIssues,
        highPriorityIssues,
        topCategory,
        topIssueType,
        latestIssueDate,
        assignedPersons: Array.from(handlers),
        issues: sortedIssues
      };
    });
  }, [periodIssues]);

  // Search & Filter
  const filteredClients = useMemo(() => {
    let list = clientGroups;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(c => {
        const matchClient = c.clientName.toLowerCase().includes(q);
        const matchCategory = c.topCategory.toLowerCase().includes(q);
        const matchType = c.topIssueType.toLowerCase().includes(q);
        const matchDetails = c.issues.some(i => 
          (i.issue_details && i.issue_details.toLowerCase().includes(q)) ||
          (i.clickup_ticket_id && i.clickup_ticket_id.toLowerCase().includes(q)) ||
          (i.assigned_person && i.assigned_person.toLowerCase().includes(q)) ||
          (i.segment && i.segment.toLowerCase().includes(q))
        );
        return matchClient || matchCategory || matchType || matchDetails;
      });
    }

    // Sort
    return [...list].sort((a, b) => {
      if (sortBy === 'mostIssues') return b.totalIssues - a.totalIssues;
      if (sortBy === 'leastIssues') return a.totalIssues - b.totalIssues;
      if (sortBy === 'alphabetical') return a.clientName.localeCompare(b.clientName);
      if (sortBy === 'mostPending') return b.openIssues - a.openIssues || b.totalIssues - a.totalIssues;
      return 0;
    });
  }, [clientGroups, searchQuery, sortBy]);

  // Metrics Summary
  const summaryMetrics = useMemo(() => {
    const totalClients = clientGroups.length;
    const totalIssues = periodIssues.length;
    const totalResolved = clientGroups.reduce((sum, c) => sum + c.resolvedIssues, 0);
    const totalOpen = clientGroups.reduce((sum, c) => sum + c.openIssues, 0);
    const resolutionRate = totalIssues > 0 ? Math.round((totalResolved / totalIssues) * 100) : 0;

    return { totalClients, totalIssues, totalResolved, totalOpen, resolutionRate };
  }, [clientGroups, periodIssues]);

  // Pagination based on itemsPerPage (default 20, options: 20, 50, 100, 500, 1000)
  const totalPages = Math.ceil(filteredClients.length / itemsPerPage) || 1;
  const displayedClients = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredClients.slice(start, start + itemsPerPage);
  }, [filteredClients, currentPage, itemsPerPage]);

  const toggleClientExpand = (clientName: string) => {
    setExpandedClients(prev => ({
      ...prev,
      [clientName]: !prev[clientName]
    }));
  };

  const expandAllClients = () => {
    const next: Record<string, boolean> = {};
    displayedClients.forEach(c => {
      next[c.clientName] = true;
    });
    setExpandedClients(prev => ({ ...prev, ...next }));
  };

  const collapseAllClients = () => {
    setExpandedClients({});
  };

  // EXCEL DOWNLOAD FOR ALL CLIENTS (Primary Sheet: All Issues Detailed with Issue Details, Sheet 2: Summary)
  const downloadAllClientsExcel = () => {
    if (periodIssues.length === 0) {
      alert('No client issues found in the selected date range to export.');
      return;
    }

    // Sheet 1: All Client Issues with FULL Details (Primary Sheet when opened in Excel)
    const detailedHeaders = [
      'SL',
      'Client Name',
      'Issue Details',
      'Issue Type',
      'Segment',
      'Category',
      'ClickUp Ticket ID',
      'Priority',
      'Status',
      'Assigned Handler',
      'Issue Date & Time',
      'Client Reporting Time',
      'Response Time',
      'Resolution Time',
      'Ticket ID'
    ];

    const detailedRows: (string | number)[][] = [];
    let sl = 1;
    clientGroups.forEach(c => {
      c.issues.forEach(i => {
        detailedRows.push([
          sl++,
          c.clientName,
          i.issue_details || i.category || '-',
          i.issue_type || '',
          i.segment || '-',
          i.category || '',
          i.clickup_ticket_id || '-',
          i.priority || '',
          i.status || '',
          i.assigned_person || 'Unassigned',
          formatIssueDateTime(i.issue_date, i.created_at),
          i.client_reporting_time || '-',
          i.response_time || '-',
          i.resolution_time || '-',
          i.id || ''
        ]);
      });
    });

    const wsDetails = XLSX.utils.aoa_to_sheet([detailedHeaders, ...detailedRows]);
    wsDetails['!cols'] = [
      { wch: 6 },  // SL
      { wch: 28 }, // Client Name
      { wch: 65 }, // Issue Details (Very prominent and wide for easy reading)
      { wch: 18 }, // Issue Type
      { wch: 16 }, // Segment
      { wch: 16 }, // Category
      { wch: 18 }, // ClickUp Ticket ID
      { wch: 12 }, // Priority
      { wch: 14 }, // Status
      { wch: 20 }, // Assigned Handler
      { wch: 22 }, // Issue Date & Time
      { wch: 20 }, // Client Reporting Time
      { wch: 16 }, // Response Time
      { wch: 16 }, // Resolution Time
      { wch: 16 }  // Ticket ID
    ];
    if (detailedRows.length > 0) {
      wsDetails['!autofilter'] = { ref: `A1:O${detailedRows.length + 1}` };
    }

    // Sheet 2: Clients Summary Overview (with bullet list of all issue details per client)
    const summaryHeaders = [
      'SL',
      'Client Name',
      'Total Issues',
      'Resolved / Closed',
      'Open / Pending',
      'High Priority Issues',
      'Top Category',
      'Top Issue Type',
      'All Issues Details Summary',
      'Latest Issue Date',
      'Assigned Handlers'
    ];

    const summaryRows = clientGroups.map((c, index) => {
      const issuesSummaryText = c.issues
        .map((i, idx) => `${idx + 1}. [${i.issue_type}] ${i.issue_details || i.category || 'No details'}`)
        .join('\n');

      return [
        index + 1,
        c.clientName,
        c.totalIssues,
        c.resolvedIssues,
        c.openIssues,
        c.highPriorityIssues,
        c.topCategory,
        c.topIssueType,
        issuesSummaryText || '-',
        c.latestIssueDate ? formatIssueDateTime(c.latestIssueDate) : '-',
        c.assignedPersons.join(', ') || 'Unassigned'
      ];
    });

    const wsSummary = XLSX.utils.aoa_to_sheet([summaryHeaders, ...summaryRows]);
    wsSummary['!cols'] = [
      { wch: 6 },  // SL
      { wch: 28 }, // Client Name
      { wch: 14 }, // Total Issues
      { wch: 16 }, // Resolved
      { wch: 16 }, // Open
      { wch: 18 }, // High Priority
      { wch: 20 }, // Top Category
      { wch: 20 }, // Top Issue Type
      { wch: 60 }, // All Issues Details Summary
      { wch: 22 }, // Latest Issue Date
      { wch: 30 }  // Handlers
    ];
    if (summaryRows.length > 0) {
      wsSummary['!autofilter'] = { ref: `A1:K${summaryRows.length + 1}` };
    }

    const wb = XLSX.utils.book_new();
    // Append Detailed sheet FIRST so user immediately sees which client had which issue details!
    XLSX.utils.book_append_sheet(wb, wsDetails, 'All Client Issues & Details');
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Clients Summary');

    const startStr = formatDateDisplay(startDate).replace(/\s+/g, '_');
    const endStr = formatDateDisplay(endDate).replace(/\s+/g, '_');
    const filename = `Client_Wise_Issue_Report_${startStr}_to_${endStr}.xlsx`;

    downloadStyledReport(wb, filename);
  };

  // EXCEL DOWNLOAD FOR A SINGLE CLIENT
  const downloadSingleClientExcel = (client: ClientGroup) => {
    const headers = [
      'SL',
      'Client Name',
      'Issue Details',
      'Issue Type',
      'Segment',
      'Category',
      'ClickUp Ticket ID',
      'Priority',
      'Status',
      'Assigned Handler',
      'Issue Date & Time',
      'Client Reporting Time',
      'Response Time',
      'Resolution Time',
      'Ticket ID'
    ];

    const rows = client.issues.map((i, index) => [
      index + 1,
      client.clientName,
      i.issue_details || i.category || '-',
      i.issue_type || '',
      i.segment || '-',
      i.category || '',
      i.clickup_ticket_id || '-',
      i.priority || '',
      i.status || '',
      i.assigned_person || 'Unassigned',
      formatIssueDateTime(i.issue_date, i.created_at),
      i.client_reporting_time || '-',
      i.response_time || '-',
      i.resolution_time || '-',
      i.id || ''
    ]);

    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    ws['!cols'] = [
      { wch: 6 },  // SL
      { wch: 26 }, // Client Name
      { wch: 65 }, // Issue Details (prominent & wide)
      { wch: 18 }, // Issue Type
      { wch: 16 }, // Segment
      { wch: 16 }, // Category
      { wch: 18 }, // ClickUp Ticket ID
      { wch: 12 }, // Priority
      { wch: 14 }, // Status
      { wch: 20 }, // Assigned Handler
      { wch: 22 }, // Issue Date & Time
      { wch: 20 }, // Client Reporting Time
      { wch: 16 }, // Response Time
      { wch: 16 }, // Resolution Time
      { wch: 16 }  // Ticket ID
    ];
    if (rows.length > 0) {
      ws['!autofilter'] = { ref: `A1:O${rows.length + 1}` };
    }

    const wb = XLSX.utils.book_new();
    const safeClientSheetName = client.clientName.replace(/[\\/*?[\]:]/g, '').substring(0, 30);
    XLSX.utils.book_append_sheet(wb, ws, safeClientSheetName || 'Client Issues');

    const cleanClientName = client.clientName.replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `${cleanClientName}_Issues_${formatDateDisplay(startDate).replace(/\s+/g, '_')}_to_${formatDateDisplay(endDate).replace(/\s+/g, '_')}.xlsx`;

    downloadStyledReport(wb, filename);
  };

  return (
    <ModuleWorkspace data-ui="v2" id="ClientThreeMonthReport" number="07" title="Client history" description="Compare customer issues across three months." category="Reporting desk" kind="ledger" links={[]}><div className="v2-page-content">
      {/* Section Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b border-slate-100 dark:border-slate-800 pb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center shrink-0">
              <Building2 size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="v2-heading font-bold text-slate-900 dark:text-white text-xl">
                  Client-Wise Issue Report
                </h3>
                <span className="bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 text-xs font-bold px-2.5 py-0.5 rounded-full">
                  Client Report
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                Client-wise detailed issue breakdown with custom date selection, click-to-expand ticket logs, and Excel export.
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls & Excel Download */}
        <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto shrink-0 justify-end">
          {/* Refresh Data */}
          <button
            onClick={loadIssuesFromDb}
            disabled={loading}
            className="v2-button p-2 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Reload Issues"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>

          {/* Download ALL Clients in Excel */}
          <button
            onClick={downloadAllClientsExcel}
            title="Download full report for all clients to Excel (Summary + Detailed tabs)"
            className="v2-button v2-primary flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white font-bold px-4 py-2 rounded-xl text-xs sm:text-sm transition-all shadow-sm active:scale-[0.98] cursor-pointer"
          >
            <FileSpreadsheet size={16} />
            <span className="whitespace-nowrap">Download All Clients (Excel)</span>
          </button>
        </div>
      </div>

      {/* Date Picker & Preset Toolbar */}
      <FilterDesk title="Reporting period"><div className="bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 p-4 rounded-2xl space-y-3" data-filter-layout="">
        <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4" data-filter-group="">
          {/* Custom Date Pickers */}
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 text-xs" data-filter-group="">
            <div className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-300">
              <Calendar size={16} className="text-indigo-600 dark:text-indigo-400" />
              <span>Date Range:</span>
            </div>

            {/* From Date Input */}
            <div className="v2-surface flex items-center gap-1.5 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs" data-filter-field="field">
              <span className="text-[11px] font-semibold text-slate-400 uppercase">From:</span>
              <input
                type="date"
                value={startDateInput}
                onChange={(e) => {
                  setStartDateInput(e.target.value);
                  setRangePreset('custom');
                  setCurrentPage(1);
                }}
                className="v2-control bg-transparent font-medium text-slate-800 dark:text-slate-200 text-xs outline-none cursor-pointer"
              />
            </div>

            {/* To Date Input */}
            <div className="v2-surface flex items-center gap-1.5 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs" data-filter-field="field">
              <span className="text-[11px] font-semibold text-slate-400 uppercase">To:</span>
              <input
                type="date"
                value={endDateInput}
                onChange={(e) => {
                  setEndDateInput(e.target.value);
                  setRangePreset('custom');
                  setCurrentPage(1);
                }}
                className="v2-control bg-transparent font-medium text-slate-800 dark:text-slate-200 text-xs outline-none cursor-pointer"
              />
            </div>

            <span className="text-xs text-slate-500 font-medium hidden md:inline">
              ({formatDateDisplay(startDate)} — {formatDateDisplay(endDate)})
            </span>
          </div>

          {/* Preset Buttons */}
          <div className="v2-surface flex flex-wrap items-center gap-1.5 bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold">
            <button
              onClick={() => applyPreset('90days')}
              className={"v2-button " + (`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                rangePreset === '90days'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`)}
              title="Default: Past 90 days from today"
            >
              Default: Last 3 Months (90d)
            </button>
            <button
              onClick={() => applyPreset('calendar3m')}
              className={"v2-button " + (`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                rangePreset === 'calendar3m'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`)}
              title="Past 3 full calendar months"
            >
              3 Calendar Mos
            </button>
            <button
              onClick={() => applyPreset('60days')}
              className={"v2-button " + (`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                rangePreset === '60days'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`)}
              title="Last 60 days"
            >
              60 Days
            </button>
            <button
              onClick={() => applyPreset('thisMonth')}
              className={"v2-button " + (`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                rangePreset === 'thisMonth'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`)}
              title="This month"
            >
              This Month
            </button>
            <button
              onClick={() => applyPreset('allTime')}
              className={"v2-button " + (`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                rangePreset === 'allTime'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`)}
              title="All recorded history"
            >
              All Time
            </button>
          </div>
        </div>
      </div></FilterDesk>

      {/* Metrics Summary Strip */}
      <div className="v2-grid grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 p-4 rounded-2xl">
          <div className="flex items-center gap-2 text-slate-400 mb-1">
            <Building2 size={16} className="text-indigo-500" />
            <span className="text-xs font-bold uppercase tracking-wider">Active Clients</span>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            {summaryMetrics.totalClients}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">Had issues in selected date range</p>
        </div>

        <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 p-4 rounded-2xl">
          <div className="flex items-center gap-2 text-slate-400 mb-1">
            <Layers size={16} className="text-indigo-500" />
            <span className="text-xs font-bold uppercase tracking-wider">Total Issues</span>
          </div>
          <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
            {summaryMetrics.totalIssues}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">Logged across all clients</p>
        </div>

        <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 p-4 rounded-2xl">
          <div className="flex items-center gap-2 text-slate-400 mb-1">
            <CheckCircle2 size={16} className="text-emerald-500" />
            <span className="text-xs font-bold uppercase tracking-wider">Resolved</span>
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 flex items-baseline gap-1.5">
            <span>{summaryMetrics.totalResolved}</span>
            <span className="text-xs font-bold text-emerald-600/80">({summaryMetrics.resolutionRate}%)</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">Closed or Done tickets</p>
        </div>

        <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 p-4 rounded-2xl">
          <div className="flex items-center gap-2 text-slate-400 mb-1">
            <Clock size={16} className="text-amber-500" />
            <span className="text-xs font-bold uppercase tracking-wider">Pending / Open</span>
          </div>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400">
            {summaryMetrics.totalOpen}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">Open or In Progress</p>
        </div>
      </div>

      {/* Search, Sorting, Rows Per Page, and Expand/Collapse Controls */}
      <FilterDesk><div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 pt-1" data-filter-layout="">
        {/* Search Bar */}
        <div data-filter-field="search"><span className="filter-field-label">Search</span><div className="relative w-full lg:w-80" data-filter-input-wrap="">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Search client, ticket ID, segment, details..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            className="v2-control w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
          />
        </div></div>

        <div className="flex flex-wrap items-center gap-2.5 justify-between lg:justify-end" data-filter-group="">
          {/* Rows Per Page Selector (Default 20, options: 20, 50, 100, 500, 1000) */}
          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs" data-filter-field="field">
            <span className="text-[11px] text-slate-400 font-semibold uppercase">Rows:</span>
            <select
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="v2-control bg-transparent font-bold text-slate-700 dark:text-slate-200 outline-none cursor-pointer text-xs"
            >
              <option value={20} className="dark:bg-slate-900">20 / page (Default)</option>
              <option value={50} className="dark:bg-slate-900">50 / page</option>
              <option value={100} className="dark:bg-slate-900">100 / page</option>
              <option value={500} className="dark:bg-slate-900">500 / page</option>
              <option value={1000} className="dark:bg-slate-900">1000 / page</option>
            </select>
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs" data-filter-field="field">
            <ArrowUpDown size={14} className="text-slate-400" />
            <span className="text-[11px] text-slate-400 font-semibold uppercase">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="v2-control bg-transparent font-bold text-slate-700 dark:text-slate-200 outline-none cursor-pointer text-xs"
            >
              <option value="mostIssues" className="dark:bg-slate-900">Most Issues</option>
              <option value="mostPending" className="dark:bg-slate-900">Most Pending</option>
              <option value="leastIssues" className="dark:bg-slate-900">Least Issues</option>
              <option value="alphabetical" className="dark:bg-slate-900">Client Name (A-Z)</option>
            </select>
          </div>

          {/* Expand/Collapse All */}
          <div className="flex items-center gap-1">
            <button
              onClick={expandAllClients}
              className="v2-button px-2.5 py-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg transition-colors cursor-pointer"
            >
              Expand All
            </button>
            <button
              onClick={collapseAllClients}
              className="v2-button px-2.5 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              Collapse All
            </button>
          </div>
        </div>
      </div></FilterDesk>

      {/* Clients Accordion List */}
      <div className="space-y-3">
        {displayedClients.length > 0 ? (
          displayedClients.map((client) => {
            const isExpanded = !!expandedClients[client.clientName];
            return (
              <div
                key={client.clientName}
                className={`border rounded-2xl transition-all duration-200 overflow-hidden ${
                  isExpanded
                    ? 'border-indigo-200 dark:border-indigo-900/70 bg-white dark:bg-slate-900 shadow-sm'
                    : 'border-slate-200 dark:border-slate-800/80 bg-slate-50/40 dark:bg-slate-900/30 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                {/* Client Main Summary Row (Clickable) */}
                <div
                  onClick={() => toggleClientExpand(client.clientName)}
                  className="p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 cursor-pointer select-none"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                      <Building2 size={20} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="v2-heading font-bold text-slate-900 dark:text-white text-base truncate">
                          {client.clientName}
                        </h4>
                        <span className="bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold px-2.5 py-0.5 rounded-full shrink-0">
                          {client.totalIssues} {client.totalIssues === 1 ? 'Issue' : 'Issues'}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400 mt-1">
                        <span className="flex items-center gap-1">
                          <Tag size={12} className="text-slate-400" />
                          Category: <strong className="text-slate-700 dark:text-slate-300">{client.topCategory}</strong>
                        </span>
                        <span>•</span>
                        <span>
                          Type: <strong className="text-slate-700 dark:text-slate-300">{client.topIssueType}</strong>
                        </span>
                        {client.latestIssueDate && (
                          <>
                            <span>•</span>
                            <span>Latest: {formatIssueDateTime(client.latestIssueDate)}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Status Pills and Action Buttons */}
                  <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <span className="bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 text-xs font-bold px-2.5 py-1 rounded-lg border border-emerald-100 dark:border-emerald-900/20 whitespace-nowrap">
                        {client.resolvedIssues} Resolved
                      </span>
                      {client.openIssues > 0 && (
                        <span className="bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 text-xs font-bold px-2.5 py-1 rounded-lg border border-amber-100 dark:border-amber-900/20 whitespace-nowrap">
                          {client.openIssues} Pending
                        </span>
                      )}
                      {client.highPriorityIssues > 0 && (
                        <span className="bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 text-xs font-bold px-2.5 py-1 rounded-lg border border-rose-100 dark:border-rose-900/20 whitespace-nowrap">
                          {client.highPriorityIssues} High
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Individual Client Excel Export */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          downloadSingleClientExcel(client);
                        }}
                        title={`Download Excel report for ${client.clientName}`}
                        className="v2-button flex items-center gap-1 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 dark:bg-slate-800 dark:hover:bg-emerald-950/40 dark:hover:text-emerald-400 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
                      >
                        <Download size={13} />
                        <span className="hidden sm:inline whitespace-nowrap">Export</span>
                      </button>

                      <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500">
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Expanded Detailed Issue Table for this Client */}
                {isExpanded && (
                  <div className="border-t border-slate-150 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 p-4 sm:p-5">
                    <div className="v2-surface bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
                      <div className="p-3.5 bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <h5 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                            Issues Logged in Period ({client.issues.length})
                          </h5>
                          <span className="text-[11px] text-slate-400">
                            {formatDateDisplay(startDate)} — {formatDateDisplay(endDate)}
                          </span>
                        </div>
                        <button
                          onClick={() => downloadSingleClientExcel(client)}
                          className="v2-button text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <Download size={13} />
                          Download Excel for {client.clientName}
                        </button>
                      </div>

                      <div className="v2-ledger-scroll overflow-x-auto">
                        <DataLedger><table className="v2-ledger w-full text-left text-xs">
                          <thead>
                            <tr className="bg-slate-50 dark:bg-slate-800/30 border-b border-slate-200 dark:border-slate-800 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                              <th className="px-4 py-3 whitespace-nowrap">ClickUp ID / Ticket</th>
                              <th className="px-4 py-3 whitespace-nowrap">Date & Time</th>
                              <th className="px-4 py-3 whitespace-nowrap">Type & Segment</th>
                              <th className="px-4 py-3 whitespace-nowrap">Category</th>
                              <th className="px-4 py-3 whitespace-nowrap">Priority</th>
                              <th className="px-4 py-3 whitespace-nowrap">Status</th>
                              <th className="px-4 py-3 whitespace-nowrap">Assigned Handler</th>
                              <th className="px-4 py-3 whitespace-nowrap">Client Reporting Time</th>
                              <th className="px-4 py-3 whitespace-nowrap">Response Time</th>
                              <th className="px-4 py-3 whitespace-nowrap">Resolution Time</th>
                              <th className="px-4 py-3 min-w-[220px]">Issue Details</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {client.issues.map((issue) => (
                              <tr
                                key={issue.id}
                                className="hover:bg-slate-50/60 dark:hover:bg-slate-800/20 transition-colors"
                              >
                                <td className="px-4 py-3 whitespace-nowrap font-mono">
                                  {issue.clickup_ticket_id ? (
                                    <span className="bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded font-bold">
                                      {issue.clickup_ticket_id}
                                    </span>
                                  ) : (
                                    <span className="text-slate-400 text-[11px] font-mono">
                                      {issue.id ? `#${issue.id.substring(0, 7)}` : '-'}
                                    </span>
                                  )}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-slate-600 dark:text-slate-300 font-medium">
                                  {formatIssueDateTime(issue.issue_date, issue.created_at)}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <div className="font-semibold text-slate-800 dark:text-slate-200">
                                    {issue.issue_type}
                                  </div>
                                  {issue.segment && (
                                    <span className="text-[10px] text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.2 rounded mt-0.5 inline-block">
                                      {issue.segment}
                                    </span>
                                  )}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-slate-600 dark:text-slate-300">
                                  {issue.category || '-'}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <span
                                    className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase border inline-block whitespace-nowrap ${
                                      (PRIORITY_COLORS as any)[issue.priority] || 'bg-slate-100 text-slate-700'
                                    }`}
                                  >
                                    {issue.priority}
                                  </span>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <span
                                    className={`text-[10px] px-2 py-0.5 rounded-md font-semibold inline-block whitespace-nowrap ${
                                      (STATUS_COLORS as any)[issue.status] || 'bg-slate-100 text-slate-700'
                                    }`}
                                  >
                                    {issue.status}
                                  </span>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap font-medium text-slate-700 dark:text-slate-300">
                                  {issue.assigned_person || 'Unassigned'}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-slate-600 dark:text-slate-400 font-mono">
                                  {issue.client_reporting_time || '-'}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-slate-600 dark:text-slate-400 font-mono">
                                  {issue.response_time || '-'}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-slate-600 dark:text-slate-400 font-mono">
                                  {issue.resolution_time || '-'}
                                </td>
                                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                                  <p className="line-clamp-2" title={issue.issue_details}>
                                    {issue.issue_details || '-'}
                                  </p>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table></DataLedger>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="py-12 text-center text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
            No client issues found matching your search in the selected period ({rangeLabel}).
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
          <p className="text-xs font-semibold text-slate-500">
            Showing{' '}
            <span className="text-slate-900 dark:text-white font-bold">
              {Math.min((currentPage - 1) * itemsPerPage + 1, filteredClients.length)}
            </span>{' '}
            to{' '}
            <span className="text-slate-900 dark:text-white font-bold">
              {Math.min(currentPage * itemsPerPage, filteredClients.length)}
            </span>{' '}
            of{' '}
            <span className="text-slate-900 dark:text-white font-bold">
              {filteredClients.length}
            </span>{' '}
            clients ({itemsPerPage} per page)
          </p>

          <div className="flex items-center gap-1.5">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              className="v2-button p-2 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-400 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors bg-white dark:bg-slate-900"
              aria-label="Previous Page"
            >
              <ChevronLeft size={16} />
            </button>

            <div className="flex items-center gap-1 px-1">
              {Array.from({ length: Math.min(totalPages, 7) }).map((_, i) => {
                let pageNum = i + 1;
                if (totalPages > 7) {
                  if (currentPage > 4) {
                    pageNum = currentPage - 3 + i;
                  }
                  if (pageNum > totalPages) return null;
                }

                const isActive = currentPage === pageNum;
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={"v2-button " + (`w-8 h-8 rounded-xl text-xs font-bold transition-all ${
                      isActive
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800'
                    }`)}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>

            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              className="v2-button p-2 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-400 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors bg-white dark:bg-slate-900"
              aria-label="Next Page"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div></ModuleWorkspace>
  );
};
