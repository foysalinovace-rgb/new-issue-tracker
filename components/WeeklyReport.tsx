import { downloadStyledReport } from '../lib/excelReport';
import { MetricIcon } from './common/MetricIcon';
import { DataLedger, FilterDesk } from './common/DataLedger';
import { ModuleWorkspace } from './common/ModuleWorkspace';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { dbService } from '../services/dbService';
import { Issue, SystemDowntime } from '../types';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  AlertCircle, 
  Bug, 
  Smartphone, 
  Lightbulb, 
  HelpCircle, 
  Activity,
  CheckCircle2,
  CircleDot,
  Filter,
  Download,
  FileDown,
  Clock
} from 'lucide-react';
import { PRIORITY_COLORS } from '../constants';

const WeeklyReport: React.FC = () => {
  const reportRef = useRef<HTMLDivElement>(null);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [downtime, setDowntime] = useState<SystemDowntime[]>([]);
  const [fromDate, setFromDate] = useState<string>(() => {
    const d = new Date();
    const day = d.getDay(); // 0 is Sunday
    const diff = d.getDate() - day;
    const sunday = new Date(d.setDate(diff));
    return sunday.toISOString().split('T')[0];
  });
  const [toDate, setToDate] = useState<string>(() => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + 4; // Thursday is 4 days after Sunday
    const thursday = new Date(d.setDate(diff));
    return thursday.toISOString().split('T')[0];
  });
  
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);

  const formatTo12h = (time24: string) => {
    if (!time24) return '';
    const [hours, minutes] = time24.split(':');
    let h = parseInt(hours);
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12;
    h = h ? h : 12; // the hour '0' should be '12'
    return `${h}:${minutes} ${ampm}`;
  };

  useEffect(() => {
    const fetchData = async () => {
      const [i, d] = await Promise.all([
        dbService.getIssues(),
        dbService.getDowntime(),
      ]);
      setIssues(i);
      setDowntime(d);
    };
    fetchData();
  }, []);

  const setWorkingWeek = () => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day;
    const sunday = new Date(new Date().setDate(diff));
    const thursday = new Date(new Date().setDate(diff + 4));
    
    setFromDate(sunday.toISOString().split('T')[0]);
    setToDate(thursday.toISOString().split('T')[0]);
    setCurrentPage(1);
  };

  const filteredIssues = issues.filter(issue => {
    const issueDate = issue.issue_date || issue.created_at.split('T')[0];
    return issueDate >= fromDate && issueDate <= toDate;
  });

  const filteredDowntime = downtime.filter(d => {
    return d.date >= fromDate && d.date <= toDate;
  });

  const totalDowntimeMinutes = filteredDowntime.reduce((acc, d) => acc + d.duration_minutes, 0);

  const timeToMinutes = (timeStr: string): number | null => {
    if (!timeStr) return null;
    const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    if (!match) return null;
    let hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const ampm = match[3].toUpperCase();
    if (ampm === 'PM' && hours < 12) {
      hours += 12;
    } else if (ampm === 'AM' && hours === 12) {
      hours = 0;
    }
    return hours * 60 + minutes;
  };

  const formatDuration = (minutes: number | null): string => {
    if (minutes === null || minutes < 0) return '-';
    if (minutes < 60) return `${minutes} mins`;
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
  };

  const timePerformance = useMemo(() => {
    let responseLagSum = 0;
    let responseLagCount = 0;

    let resolutionLagSum = 0;
    let resolutionLagCount = 0;

    let totalLagSum = 0;
    let totalLagCount = 0;

    filteredIssues.forEach(issue => {
      const clientRepMin = timeToMinutes(issue.client_reporting_time || '');
      const respMin = timeToMinutes(issue.response_time || '');
      const resolMin = timeToMinutes(issue.resolution_time || '');

      let responseLag: number | null = null;
      let resolutionLag: number | null = null;
      let totalLag: number | null = null;

      if (clientRepMin !== null && respMin !== null) {
        responseLag = respMin - clientRepMin;
        if (responseLag < 0) responseLag += 24 * 60;
        responseLagSum += responseLag;
        responseLagCount++;
      }
      if (respMin !== null && resolMin !== null) {
        resolutionLag = resolMin - respMin;
        if (resolutionLag < 0) resolutionLag += 24 * 60;
        resolutionLagSum += resolutionLag;
        resolutionLagCount++;
      }
      if (clientRepMin !== null && resolMin !== null) {
        totalLag = resolMin - clientRepMin;
        if (totalLag < 0) totalLag += 24 * 60;
        totalLagSum += totalLag;
        totalLagCount++;
      }
    });

    return {
      avgResponseSpeed: responseLagCount > 0 ? Math.round(responseLagSum / responseLagCount) : null,
      avgResolutionSpeed: resolutionLagCount > 0 ? Math.round(resolutionLagSum / resolutionLagCount) : null,
      avgTotalSupportTime: totalLagCount > 0 ? Math.round(totalLagSum / totalLagCount) : null,
      totalSupportTime: totalLagSum,
      totalWithTimes: totalLagCount,
    };
  }, [filteredIssues]);

  const stats = [
    { label: 'Total Issues', value: filteredIssues.length, icon: AlertCircle, color: 'text-indigo-600', bg: 'bg-indigo-100 dark:bg-indigo-900/20' },
    { label: 'System Bugs', value: filteredIssues.filter(i => i.issue_type === 'System Bugs').length, icon: Bug, color: 'text-rose-600', bg: 'bg-rose-100 dark:bg-rose-900/20' },
    { label: 'Device Issues', value: filteredIssues.filter(i => i.issue_type === 'Device Issues').length, icon: Smartphone, color: 'text-amber-600', bg: 'bg-amber-100 dark:bg-amber-900/20' },
    { label: 'Awareness', value: filteredIssues.filter(i => i.issue_type === 'Awareness').length, icon: Lightbulb, color: 'text-emerald-600', bg: 'bg-emerald-100 dark:bg-emerald-900/20' },
    { label: 'Help Requests', value: filteredIssues.filter(i => i.issue_type === 'Help Requests').length, icon: HelpCircle, color: 'text-sky-600', bg: 'bg-sky-100 dark:bg-sky-900/20' },
    { label: 'System Downtime', value: `${totalDowntimeMinutes} min`, icon: Activity, color: 'text-fuchsia-600', bg: 'bg-fuchsia-100 dark:bg-fuchsia-900/20' },
  ];

  const statusStats = [
    { label: 'Open Issues', value: filteredIssues.filter(i => i.status === 'Open').length, icon: CircleDot, color: 'text-orange-600', bg: 'bg-orange-100 dark:bg-orange-900/20' },
    { label: 'Closed Issues', value: filteredIssues.filter(i => i.status === 'Close' || i.status === 'Done').length, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-100 dark:bg-emerald-900/20' },
  ];

  const totalPages = Math.ceil(filteredIssues.length / itemsPerPage);
  const currentIssues = filteredIssues.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const exportExcel = () => {
    const headers = [
      'Issue Date',
      'Client Name',
      'Issue Type',
      'Category',
      'Priority',
      'Status',
      'Assigned Handler',
      'Issue Details',
      'Resolution Date',
      'Resolution Time',
      'Customer Satisfaction',
      'Resolved Confirmed'
    ];

    const rows = filteredIssues.map(i => [
      i.issue_date || (i.created_at ? i.created_at.split('T')[0] : ''),
      i.client_name || '',
      i.issue_type || '',
      i.category || '',
      i.priority || '',
      i.status || '',
      i.assigned_person || '',
      i.issue_details || '',
      i.resolution_date || '',
      i.resolution_time || '',
      i.customer_satisfaction || '',
      i.issue_resolved_confirmed || ''
    ]);

    const wsIssues = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    wsIssues['!cols'] = [
      { wch: 14 }, // Issue Date
      { wch: 28 }, // Client Name
      { wch: 18 }, // Issue Type
      { wch: 18 }, // Category
      { wch: 14 }, // Priority
      { wch: 14 }, // Status
      { wch: 22 }, // Assigned Handler
      { wch: 55 }, // Issue Details
      { wch: 16 }, // Resolution Date
      { wch: 16 }, // Resolution Time
      { wch: 22 }, // Customer Satisfaction
      { wch: 22 }  // Resolved Confirmed
    ];

    if (rows.length > 0) {
      wsIssues['!autofilter'] = { ref: `A1:L${rows.length + 1}` };
    }

    // Weekly Summary Sheet
    const closedCount = filteredIssues.filter(i => (i.status || '').toLowerCase() === 'closed' || (i.status || '').toLowerCase() === 'close').length;
    const summaryRows = [
      ['WEEKLY PERFORMANCE REPORT SUMMARY', ''],
      ['Generated On:', new Date().toLocaleString()],
      ['Date Range:', `${fromDate} to ${toDate}`],
      ['', ''],
      ['METRICS OVERVIEW', 'VALUE'],
      ['Total Issues Logged', filteredIssues.length],
      ['Solved / Closed Issues', closedCount],
      ['Pending / Open Issues', filteredIssues.length - closedCount],
      ['Resolution Rate', filteredIssues.length > 0 ? `${Math.round((closedCount / filteredIssues.length) * 100)}%` : '0%'],
      ['High / Urgent Priority Issues', filteredIssues.filter(i => (i.priority || '').toLowerCase() === 'high' || (i.priority || '').toLowerCase() === 'urgent').length],
      ['Total Downtime Incidents', filteredDowntime.length],
      ['Total Downtime (Minutes)', filteredDowntime.reduce((acc, curr) => acc + (curr.duration_minutes || 0), 0)]
    ];
    const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
    wsSummary['!cols'] = [{ wch: 35 }, { wch: 25 }];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');
    XLSX.utils.book_append_sheet(wb, wsIssues, 'Issues List');

    downloadStyledReport(wb, `Weekly_Report_${fromDate}_to_${toDate}.xlsx`);
  };

  const exportPDF = async () => {
    if (!reportRef.current) return;
    
    setIsExporting(true);
    try {
      // Wait for the DOM to update (show the PDF header)
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: document.documentElement.classList.contains('dark') ? '#020617' : '#f8fafc'
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: [canvas.width, canvas.height]
      });
      
      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
      pdf.save(`weekly_report_${fromDate}_to_${toDate}.pdf`);
    } catch (error) {
      console.error('PDF Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <ModuleWorkspace data-ui="v2" id="WeeklyReport" number="05" title="Weekly briefing" description="A focused review of this week’s support activity and outcomes." category="Reporting desk" kind="insights" links={[{"label":"Issue ledger","path":"/issue-reports"}]}><div ref={reportRef} className="v2-page-content">
      {/* Header & Controls */}
      <FilterDesk actions={<><button 
              onClick={exportExcel}
              className="v2-button p-2.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-xl hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-all flex items-center gap-1.5 text-xs font-bold"
              title="Export Excel (.xlsx)"
            >
              <Download size={18} />
              <span className="hidden sm:inline">Excel (.xlsx)</span>
            </button><button 
              onClick={exportPDF}
              disabled={isExporting}
              className="v2-button p-2.5 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 rounded-xl hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-all disabled:opacity-50"
              title="Export PDF"
            >
              <FileDown size={20} />
            </button></>}><div className="v2-surface flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm" data-html2canvas-ignore="true" data-filter-layout="">
        <div>
          <h1 className="v2-heading text-2xl font-bold text-slate-900 dark:text-white">Weekly Report</h1>
          <p className="text-slate-500 dark:text-slate-400">Analyze performance within a specific date range</p>
        </div>

        <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto" data-filter-group="">
          <button 
            onClick={setWorkingWeek}
            className="v2-button px-4 py-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-xl text-sm font-bold hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-all flex items-center gap-2"
          >
            <Calendar size={16} />
            Sun - Thu
          </button>

          <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700" data-filter-field="range">
            <input 
              type="date"
              value={fromDate}
              onChange={(e) => { setFromDate(e.target.value); setCurrentPage(1); }}
              className="v2-control bg-transparent px-3 py-1.5 text-sm font-semibold outline-none text-slate-700 dark:text-slate-200"
            />
            <span className="text-slate-400 font-bold">→</span>
            <input 
              type="date"
              value={toDate}
              onChange={(e) => { setToDate(e.target.value); setCurrentPage(1); }}
              className="v2-control bg-transparent px-3 py-1.5 text-sm font-semibold outline-none text-slate-700 dark:text-slate-200"
            />
          </div>

          <div className="flex items-center gap-2">
            
            
          </div>
        </div>
      </div></FilterDesk>

      {/* PDF Header (Only visible during export) */}
      <div className={`${isExporting ? 'block' : 'hidden'} bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm mb-8`}>
        <div className="flex justify-between items-center">
          <div>
            <h1 className="v2-heading text-3xl font-black text-slate-900 dark:text-white">Weekly Performance Report</h1>
            <p className="text-slate-500 font-bold mt-1">Range: {fromDate} to {toDate}</p>
          </div>
          <div className="text-right">
            <div className="text-indigo-600 font-black text-xl">Inovace Technologies Ltd.</div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Issue Tracking System</div>
          </div>
        </div>
      </div>

      {/* Primary Stats */}
      <div className="v2-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {stats.map((stat, i) => (
          <div key={i} className="v2-surface bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all group">
            <MetricIcon icon={stat.icon} color={stat.color} background={stat.bg} className="mb-4" />
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{stat.label}</p>
            <h3 className="v2-heading text-2xl font-black text-slate-900 dark:text-white mt-1">{stat.value}</h3>
          </div>
        ))}
      </div>

      {/* Status Stats */}
      <div className="v2-grid grid grid-cols-1 md:grid-cols-2 gap-6">
        {statusStats.map((stat, i) => (
          <div key={i} className="v2-surface bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-6 group">
            <div className={`w-16 h-16 ${stat.bg} rounded-2xl flex items-center justify-center group-hover:rotate-6 transition-transform`}>
              <stat.icon size={32} className={stat.color} />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">{stat.label}</p>
              <h3 className="v2-heading text-4xl font-black text-slate-900 dark:text-white mt-1">{stat.value}</h3>
            </div>
          </div>
        ))}
      </div>

      {/* Weekly Time Performance Analytics */}
      <div className="v2-surface bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-8 space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 dark:border-slate-800 pb-6">
          <div>
            <h3 className="v2-heading font-bold text-slate-900 dark:text-white text-xl flex items-center gap-2">
              <Clock size={20} className="text-indigo-600" />
              Weekly Time Performance Analytics
            </h3>
          </div>
        </div>

        <div className="v2-grid grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
          {/* Card 1: Total Support Count */}
          <div className="bg-slate-50/50 dark:bg-slate-800/25 p-5 rounded-2xl border border-slate-100 dark:border-slate-800/60 relative overflow-hidden group">
            <div className="absolute -right-2 -top-2 w-16 h-16 bg-amber-50 dark:bg-amber-900/10 rounded-full transition-transform group-hover:scale-110" />
            <div className="relative">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Total Support Count</span>
              <h4 className="v2-heading text-2xl font-black text-slate-900 dark:text-white font-black">
                {timePerformance.totalWithTimes}
              </h4>
              <p className="text-[11px] text-slate-500 mt-2">Count of support tickets with valid durations</p>
            </div>
          </div>

          {/* Card 2: Avg Response Speed */}
          <div className="bg-slate-50/50 dark:bg-slate-800/25 p-5 rounded-2xl border border-slate-100 dark:border-slate-800/60 relative overflow-hidden group">
            <div className="absolute -right-2 -top-2 w-16 h-16 bg-blue-50 dark:bg-blue-900/10 rounded-full transition-transform group-hover:scale-110" />
            <div className="relative">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Avg Response Speed</span>
              <h4 className="v2-heading text-2xl font-black text-slate-900 dark:text-white">
                {formatDuration(timePerformance.avgResponseSpeed)}
              </h4>
              <p className="text-[11px] text-slate-500 mt-2">Average time from report to first action</p>
            </div>
          </div>

          {/* Card 3: Avg Resolution Speed */}
          <div className="bg-slate-50/50 dark:bg-slate-800/25 p-5 rounded-2xl border border-slate-100 dark:border-slate-800/60 relative overflow-hidden group">
            <div className="absolute -right-2 -top-2 w-16 h-16 bg-emerald-50 dark:bg-emerald-900/10 rounded-full transition-transform group-hover:scale-110" />
            <div className="relative">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Avg Resolution Speed</span>
              <h4 className="v2-heading text-2xl font-black text-slate-900 dark:text-white">
                {formatDuration(timePerformance.avgResolutionSpeed)}
              </h4>
              <p className="text-[11px] text-slate-500 mt-2">Average time from response to closure</p>
            </div>
          </div>

          {/* Card 4: Avg Total Support Time */}
          <div className="bg-slate-50/50 dark:bg-slate-800/25 p-5 rounded-2xl border border-slate-100 dark:border-slate-800/60 relative overflow-hidden group">
            <div className="absolute -right-2 -top-2 w-16 h-16 bg-indigo-50 dark:bg-indigo-900/10 rounded-full transition-transform group-hover:scale-110" />
            <div className="relative">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Avg Total Support Time</span>
              <h4 className="v2-heading text-2xl font-black text-slate-900 dark:text-white">
                {formatDuration(timePerformance.avgTotalSupportTime)}
              </h4>
              <p className="text-[11px] text-slate-500 mt-2">Average full lifecycle of support tickets</p>
            </div>
          </div>

          {/* Card 5: Total Support Time */}
          <div className="bg-slate-50/50 dark:bg-slate-800/25 p-5 rounded-2xl border border-slate-100 dark:border-slate-800/60 relative overflow-hidden group">
            <div className="absolute -right-2 -top-2 w-16 h-16 bg-violet-50 dark:bg-violet-900/10 rounded-full transition-transform group-hover:scale-110" />
            <div className="relative">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Total Support Time</span>
              <h4 className="v2-heading text-2xl font-black text-slate-900 dark:text-white">
                {formatDuration(timePerformance.totalSupportTime)}
              </h4>
              <p className="text-[11px] text-slate-500 mt-2">Sum of all active support durations combined</p>
            </div>
          </div>
        </div>
      </div>

      {/* Downtime Table */}
      <div className="v2-surface bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h3 className="v2-heading font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Activity size={18} className="text-fuchsia-500" />
            System Downtime Report in Range
          </h3>
          <span className="text-xs font-bold px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-full">
            {filteredDowntime.length} Results
          </span>
        </div>
        
        <div className="v2-ledger-scroll overflow-x-auto">
          <DataLedger><table className="v2-ledger w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">System Name</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Start Time</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">End Time</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Duration</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredDowntime.length > 0 ? filteredDowntime.map(d => (
                <tr key={d.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="px-6 py-4 text-sm font-bold text-slate-600 dark:text-slate-400 whitespace-nowrap">
                    {d.date}
                  </td>
                  <td className="px-6 py-4 text-sm font-bold text-slate-900 dark:text-white">
                    {d.system_name}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                    {formatTo12h(d.start_time)}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                    {formatTo12h(d.end_time)}
                  </td>
                  <td className="px-6 py-4 text-sm font-bold text-fuchsia-600">
                    {d.duration_minutes} min
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-slate-400 italic">
                    No downtime entries found in this date range.
                  </td>
                </tr>
              )}
            </tbody>
          </table></DataLedger>
        </div>
      </div>

      {/* Issues Table */}
      <div className="v2-surface bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h3 className="v2-heading font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Filter size={18} className="text-indigo-500" />
            Issues in Range
          </h3>
          <span className="text-xs font-bold px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-full">
            {filteredIssues.length} Results
          </span>
        </div>
        
        <div className="v2-ledger-scroll overflow-x-auto">
          <DataLedger><table className="v2-ledger w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Client</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Type</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Category</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Priority</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Assigned</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {currentIssues.length > 0 ? currentIssues.map(issue => (
                <tr key={issue.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="px-6 py-4 text-sm font-bold text-slate-600 dark:text-slate-400 whitespace-nowrap">
                    {issue.issue_date}
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-bold text-slate-900 dark:text-white text-sm">{issue.client_name}</div>
                    <div className="text-xs text-slate-400 truncate max-w-[250px]">{issue.issue_details}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-[10px] px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-md font-bold uppercase">
                      {issue.issue_type}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm font-bold text-slate-600 dark:text-slate-400">
                    {issue.category}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-[10px] px-2 py-1 rounded-full font-black uppercase border ${(PRIORITY_COLORS as any)[issue.priority] || 'bg-slate-100'}`}>
                      {issue.priority}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-xs font-bold ${
                      issue.status === 'Open' ? 'text-orange-600' : 
                      issue.status === 'Close' || issue.status === 'Done' ? 'text-emerald-600' : 
                      'text-slate-500'
                    }`}>
                      {issue.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm font-bold text-slate-600 dark:text-slate-400">{issue.assigned_person}</td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center text-slate-400 italic">
                    No issues found in this date range.
                  </td>
                </tr>
              )}
            </tbody>
          </table></DataLedger>
        </div>

        {/* Pagination */}
        <div className="px-6 py-4 bg-slate-50/50 dark:bg-slate-800/30 border-t border-slate-100 dark:divide-slate-800 flex flex-col sm:row items-center justify-between gap-4" data-html2canvas-ignore="true">
          <div className="flex items-center gap-6">
            <span className="text-xs font-bold text-slate-400 uppercase">
              Showing {Math.min(filteredIssues.length, (currentPage-1)*itemsPerPage+1)} - {Math.min(currentPage*itemsPerPage, filteredIssues.length)} of {filteredIssues.length}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-slate-400 uppercase">Rows:</span>
              <select 
                value={itemsPerPage}
                onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                className="v2-control bg-transparent text-sm font-black text-indigo-600 outline-none cursor-pointer"
              >
                {[10, 20, 50, 100, 500].map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
          </div>
          
          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="v2-button v2-primary p-2 border border-slate-200 dark:border-slate-700 rounded-xl disabled:opacity-30 text-slate-600 dark:text-white hover:bg-white dark:hover:bg-slate-800 transition-all"
              >
                <ChevronLeft size={18} />
              </button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum = i + 1;
                  if (totalPages > 5 && currentPage > 3) {
                    pageNum = currentPage - 3 + i + 1;
                    if (pageNum > totalPages) pageNum = totalPages - (4 - i);
                  }
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={"v2-button " + (`w-8 h-8 rounded-lg text-xs font-black transition-all ${
                        currentPage === pageNum 
                          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 dark:shadow-none' 
                          : 'text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
                      }`)}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              <button 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="v2-button v2-primary p-2 border border-slate-200 dark:border-slate-700 rounded-xl disabled:opacity-30 text-slate-600 dark:text-white hover:bg-white dark:hover:bg-slate-800 transition-all"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div></ModuleWorkspace>
  );
};

export default WeeklyReport;
