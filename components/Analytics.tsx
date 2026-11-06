import { downloadStyledReport } from '../lib/excelReport';
import { DataLedger } from './common/DataLedger';
import { ModuleWorkspace } from './common/ModuleWorkspace';

import React, { useState, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { dbService } from '../services/dbService';
import { supabase } from '../lib/supabase';
import { Issue, SettingItem } from '../types';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line
} from 'recharts';
import { 
  Users, 
  Trophy, 
  Calendar, 
  TrendingUp, 
  UserCheck,
  ChevronRight,
  ChevronLeft,
  Award,
  Search,
  Building2,
  Repeat,
  ChevronDown,
  ChevronUp,
  User,
  Download,
  Clock
} from 'lucide-react';
import { CHART_COLORS } from '../constants';

const Analytics: React.FC = () => {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
  const [selectedMonth, setSelectedMonth] = useState<string>(String(new Date().getMonth() + 1).padStart(2, '0'));
  const [selectedDay, setSelectedDay] = useState<string>(String(new Date().getDate()).padStart(2, '0'));
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedPersons, setExpandedPersons] = useState<Record<string, boolean>>({});
  const [repeatPage, setRepeatPage] = useState(1);
  const [subRepeatPages, setSubRepeatPages] = useState<Record<string, number>>({});
  const [repeatSelectedMonth, setRepeatSelectedMonth] = useState<string>('all');
  const [timeReportMode, setTimeReportMode] = useState<'day' | 'month' | 'year'>('month');
  const [expandedTimePersons, setExpandedTimePersons] = useState<Record<string, boolean>>({});
  const itemsPerPage = 10;

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

  useEffect(() => {
    setRepeatPage(1);
    setSubRepeatPages({});
  }, [searchQuery, selectedYear, repeatSelectedMonth]);

  useEffect(() => {
    const loadData = async () => {
      const data = await dbService.getIssues();
      setIssues(data);
    };
    loadData();

    // Subscribe to real-time changes on issues table
    const channel = supabase
      .channel('analytics-issues-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'issues'
        },
        () => {
          console.log('Real-time database update detected for issues. Refreshing Analytics...');
          loadData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Process data for the selected year using robust date parsing
  const yearlyIssues = issues.filter(issue => {
    const dateStr = issue.issue_date || issue.created_at;
    if (!dateStr || typeof dateStr !== 'string') return false;
    
    // Fallback to startsWith only if it's a direct date string, otherwise try to extract year
    if (dateStr.includes('-')) {
      const parts = dateStr.split('-');
      // Check if YYYY-MM-DD or DD-MM-YYYY
      if (parts[0].length === 4) return parts[0] === selectedYear;
      if (parts[2] && parts[2].substring(0, 4) === selectedYear) return true;
    }
    
    return dateStr.startsWith(selectedYear);
  });

  // Process data for the selected month
  const monthlyIssues = yearlyIssues.filter(issue => {
    const dateStr = issue.issue_date || issue.created_at;
    const month = dateStr.split('-')[1];
    return month === selectedMonth;
  });

  const daysInMonth = useMemo(() => {
    const year = parseInt(selectedYear, 10);
    const month = parseInt(selectedMonth, 10);
    return new Date(year, month, 0).getDate();
  }, [selectedYear, selectedMonth]);

  // Process data for the selected day
  const dailyIssues = useMemo(() => {
    const targetDateStr = `${selectedYear}-${selectedMonth}-${selectedDay}`;
    return issues.filter(issue => {
      const dateStr = issue.issue_date || issue.created_at;
      if (!dateStr || typeof dateStr !== 'string') return false;
      return dateStr.startsWith(targetDateStr);
    });
  }, [issues, selectedYear, selectedMonth, selectedDay]);

  // Aggregate by assigned person for the selected month
  const monthlyStats = monthlyIssues.reduce((acc, issue) => {
    const person = (issue.assigned_person || 'Unassigned').trim();
    acc[person] = (acc[person] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const monthlyRanking = Object.entries(monthlyStats)
    .filter(([name]) => name !== 'Unassigned') // Exclude Unassigned from leaderboard
    .map(([name, count]) => ({ name, count: count as number }))
    .sort((a, b) => b.count - a.count);

  // Aggregate by assigned person for the selected year
  const yearlyStats = yearlyIssues.reduce((acc, issue) => {
    const person = (issue.assigned_person || 'Unassigned').trim();
    acc[person] = (acc[person] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const yearlyRanking = Object.entries(yearlyStats)
    .filter(([name]) => name !== 'Unassigned') // Exclude Unassigned from leaderboard
    .map(([name, count]) => ({ name, count: count as number }))
    .sort((a, b) => b.count - a.count);

  // Aggregate Yearly Distribution data (include Unassigned here but maybe separate it?)
  const yearlyDistributionData = Object.entries(yearlyStats)
    .map(([name, count]) => ({ name, count: count as number }))
    .sort((a, b) => b.count - a.count);

  // Monthly trend for the selected year
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthlyTrend = months.map((monthName, index) => {
    const monthNum = String(index + 1).padStart(2, '0');
    const count = yearlyIssues.filter(issue => {
      const dateStr = issue.issue_date || issue.created_at;
      return dateStr.split('-')[1] === monthNum;
    }).length;
    return { name: monthName, count };
  });

  const timePerformanceData = useMemo(() => {
    const targetIssues = 
      timeReportMode === 'day' 
        ? dailyIssues
        : timeReportMode === 'month' 
          ? monthlyIssues 
          : yearlyIssues;

    // Group issues by assigned person
    const groupings: Record<string, {
      person: string;
      issues: (Issue & {
        responseLag: number | null;
        resolutionLag: number | null;
        totalLag: number | null;
      })[];
      avgResponseLag: number | null;
      avgResolutionLag: number | null;
      avgTotalLag: number | null;
      totalWithTimes: number;
    }> = {};

    targetIssues.forEach(issue => {
      const person = (issue.assigned_person || 'Unassigned').trim();
      if (!groupings[person]) {
        groupings[person] = {
          person,
          issues: [],
          avgResponseLag: null,
          avgResolutionLag: null,
          avgTotalLag: null,
          totalWithTimes: 0,
        };
      }

      const clientRepMin = timeToMinutes(issue.client_reporting_time || '');
      const respMin = timeToMinutes(issue.response_time || '');
      const resolMin = timeToMinutes(issue.resolution_time || '');

      let responseLag: number | null = null;
      let resolutionLag: number | null = null;
      let totalLag: number | null = null;

      if (clientRepMin !== null && respMin !== null) {
        responseLag = respMin - clientRepMin;
        if (responseLag < 0) responseLag += 24 * 60; // crossover handler
      }
      if (respMin !== null && resolMin !== null) {
        resolutionLag = resolMin - respMin;
        if (resolutionLag < 0) resolutionLag += 24 * 60; // crossover handler
      }
      if (clientRepMin !== null && resolMin !== null) {
        totalLag = resolMin - clientRepMin;
        if (totalLag < 0) totalLag += 24 * 60; // crossover handler
      }

      groupings[person].issues.push({
        ...issue,
        responseLag,
        resolutionLag,
        totalLag,
      });
    });

    // Calculate averages for each person
    return Object.values(groupings).map(group => {
      let responseLagSum = 0;
      let responseLagCount = 0;

      let resolutionLagSum = 0;
      let resolutionLagCount = 0;

      let totalLagSum = 0;
      let totalLagCount = 0;

      group.issues.forEach(issue => {
        if (issue.responseLag !== null) {
          responseLagSum += issue.responseLag;
          responseLagCount++;
        }
        if (issue.resolutionLag !== null) {
          resolutionLagSum += issue.resolutionLag;
          resolutionLagCount++;
        }
        if (issue.totalLag !== null) {
          totalLagSum += issue.totalLag;
          totalLagCount++;
        }
      });

      return {
        ...group,
        avgResponseLag: responseLagCount > 0 ? Math.round(responseLagSum / responseLagCount) : null,
        avgResolutionLag: resolutionLagCount > 0 ? Math.round(resolutionLagSum / resolutionLagCount) : null,
        avgTotalLag: totalLagCount > 0 ? Math.round(totalLagSum / totalLagCount) : null,
        totalWithTimes: totalLagCount,
        totalSupportTime: totalLagSum,
      };
    }).sort((a, b) => b.issues.length - a.issues.length); // Sort by total issues handled in context
  }, [dailyIssues, monthlyIssues, yearlyIssues, timeReportMode]);

  // Calculate repeated client issues per assigned person
  const repeatAnalysis = useMemo(() => {
    const counts: Record<string, Record<string, Issue[]>> = {};
    
    // Filter issues by repeatSelectedMonth if not set to 'all'
    const targetIssues = repeatSelectedMonth === 'all'
      ? yearlyIssues
      : yearlyIssues.filter(issue => {
          const dateStr = issue.issue_date || issue.created_at;
          if (!dateStr || typeof dateStr !== 'string') return false;
          const month = dateStr.split('-')[1];
          return month === repeatSelectedMonth;
        });

    targetIssues.forEach(issue => {
      const person = (issue.assigned_person || 'Unassigned').trim();
      const client = (issue.client_name || 'Unknown Client').trim();
      
      if (!counts[person]) {
        counts[person] = {};
      }
      if (!counts[person][client]) {
        counts[person][client] = [];
      }
      counts[person][client].push(issue);
    });

    const result = Object.entries(counts).map(([person, clientsMap]) => {
      const allClients = Object.entries(clientsMap).map(([client_name, issueList]) => ({
        client_name,
        count: issueList.length,
        issues: issueList
      })).sort((a, b) => b.count - a.count);

      const repeatClients = allClients.filter(c => c.count > 1);
      const totalIssues = allClients.reduce((sum, c) => sum + c.count, 0);

      return {
        person,
        totalIssues,
        allClients,
        repeatClients,
        repeatCount: repeatClients.reduce((sum, c) => sum + c.count, 0),
        uniqueClientsCount: allClients.length
      };
    }).sort((a, b) => b.repeatCount - a.repeatCount || b.totalIssues - a.totalIssues);

    return result;
  }, [yearlyIssues, repeatSelectedMonth]);

  const repeatStats = useMemo(() => {
    let handlersWithRepeats = 0;
    let totalRepeatIssues = 0;
    let topPair = { person: 'N/A', client: 'N/A', count: 0 };

    repeatAnalysis.forEach(data => {
      if (data.repeatClients.length > 0) {
        handlersWithRepeats++;
        totalRepeatIssues += data.repeatCount;
      }
      data.allClients.forEach(c => {
        if (c.count > topPair.count) {
          topPair = { person: data.person, client: c.client_name, count: c.count };
        }
      });
    });

    return { handlersWithRepeats, totalRepeatIssues, topPair };
  }, [repeatAnalysis]);

  const filteredRepeatAnalysis = useMemo(() => {
    if (!searchQuery.trim()) return repeatAnalysis;
    const query = searchQuery.toLowerCase();
    return repeatAnalysis.filter(data => {
      const matchPerson = data.person.toLowerCase().includes(query);
      const matchClient = data.allClients.some(c => c.client_name.toLowerCase().includes(query));
      return matchPerson || matchClient;
    });
  }, [repeatAnalysis, searchQuery]);

  const totalRepeatPages = Math.ceil(filteredRepeatAnalysis.length / itemsPerPage) || 1;

  const displayedRepeatAnalysis = useMemo(() => {
    const startIndex = (repeatPage - 1) * itemsPerPage;
    return filteredRepeatAnalysis.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredRepeatAnalysis, repeatPage]);

  const downloadExcel = () => {
    // Header for the Excel sheet
    const headers = [
      'Assigned Handler',
      'Client Name',
      'Issues Count (Repetitions)',
      'Status Type',
      'Total Issues for Handler',
      'Work Percentage (%)',
      'Selected Month/Period'
    ];

    const rows: (string | number)[][] = [];

    // Filtered clients list data logic
    filteredRepeatAnalysis.forEach(data => {
      data.allClients.forEach(client => {
        const isRepeat = client.count > 1;
        const percent = Math.min(Math.round((client.count / data.totalIssues) * 100), 100);
        const monthLabel = repeatSelectedMonth === 'all' 
          ? 'Full Year' 
          : months[parseInt(repeatSelectedMonth) - 1];
        const timePeriod = `${monthLabel} ${selectedYear}`;

        rows.push([
          data.person,
          client.client_name,
          client.count,
          isRepeat ? 'Repeated (2+ Issues)' : 'Single Assignment',
          data.totalIssues,
          `${percent}%`,
          timePeriod
        ]);
      });
    });

    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    ws['!cols'] = [
      { wch: 25 }, // Assigned Handler
      { wch: 30 }, // Client Name
      { wch: 26 }, // Issues Count (Repetitions)
      { wch: 22 }, // Status Type
      { wch: 24 }, // Total Issues for Handler
      { wch: 20 }, // Work Percentage (%)
      { wch: 24 }  // Selected Month/Period
    ];

    if (rows.length > 0) {
      ws['!autofilter'] = { ref: `A1:G${rows.length + 1}` };
    }

    const monthSuffix = repeatSelectedMonth === 'all' ? 'FullYear' : months[parseInt(repeatSelectedMonth) - 1];

    // Executive Summary Sheet
    const summaryRows = [
      ['REPEATED CLIENTS & HANDLER WORKLOAD REPORT', ''],
      ['Generated On:', new Date().toLocaleString()],
      ['Selected Period:', `${repeatSelectedMonth === 'all' ? 'Full Year' : months[parseInt(repeatSelectedMonth) - 1]} ${selectedYear}`],
      ['', ''],
      ['KPI SUMMARY', 'VALUE'],
      ['Total Handlers Analyzed', repeatAnalysis.length],
      ['Handlers With Repeated Clients', repeatStats.handlersWithRepeats],
      ['Total Repeat Cases', repeatStats.totalRepeatIssues],
      ['Total Records Exported', rows.length]
    ];
    const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
    wsSummary['!cols'] = [{ wch: 35 }, { wch: 25 }];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');
    XLSX.utils.book_append_sheet(wb, ws, 'Repetitions Analysis');

    const filename = `Repeated_Clients_Report_${monthSuffix}_${selectedYear}.xlsx`;
    downloadStyledReport(wb, filename);
  };

  const togglePersonExpand = (personName: string) => {
    setExpandedPersons(prev => ({
      ...prev,
      [personName]: !prev[personName]
    }));
  };

  // Monthly Trend Chart
  return (
    <ModuleWorkspace data-ui="v2" id="Analytics" number="04" title="" description="" category="Support intelligence" kind="insights" links={[{"label":"Weekly brief","path":"/weekly-report"}]}><div className="v2-page-content">
      {/* Header & Filters */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="v2-heading text-2xl font-bold text-slate-900 dark:text-white">Assignment Analytics</h1>
          <p className="text-slate-500 dark:text-slate-400">Detailed breakdown of task assignments and performance</p>
        </div>
        
        <div className="v2-surface flex items-center gap-4 bg-white dark:bg-slate-900 p-2 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-2 border-r border-slate-200 dark:border-slate-800 pr-4">
            <Calendar size={16} className="text-slate-400" />
            <select 
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="v2-control bg-transparent text-sm font-bold outline-none cursor-pointer text-indigo-600 dark:text-indigo-400"
            >
              {Array.from({ length: 5 }, (_, i) => {
                const year = new Date().getFullYear() - i;
                return <option key={year} value={year} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">{year}</option>;
              })}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <select 
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="v2-control bg-transparent text-sm font-bold outline-none pr-2 cursor-pointer text-indigo-600 dark:text-indigo-400"
            >
              {months.map((m, i) => (
                <option key={m} value={String(i + 1).padStart(2, '0')} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">{m}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Top Stats */}
      <div className="v2-grid grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="v2-surface bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-indigo-50 dark:bg-indigo-900/10 rounded-full transition-transform group-hover:scale-110" />
          <div className="relative">
            <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 rounded-2xl flex items-center justify-center mb-4">
              <Users size={24} />
            </div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total Yearly Issues</p>
            <h3 className="v2-heading text-3xl font-bold text-slate-900 dark:text-white mt-1">{yearlyIssues.length}</h3>
            <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
              <Calendar size={14} className="text-indigo-500" />
              In {selectedYear}
            </p>
          </div>
        </div>

        <div className="v2-surface bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-rose-50 dark:bg-rose-900/10 rounded-full transition-transform group-hover:scale-110" />
          <div className="relative">
            <div className="w-12 h-12 bg-rose-100 dark:bg-rose-900/30 text-rose-600 rounded-2xl flex items-center justify-center mb-4">
              <Trophy size={24} />
            </div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Top Performer</p>
            <h3 className="v2-heading text-2xl font-bold text-slate-900 dark:text-white mt-1 truncate">
              {monthlyRanking[0]?.name || 'N/A'}
            </h3>
            <p className="text-xs text-slate-500 mt-2">
              {monthlyRanking[0]?.count || 0} Assignments this month
            </p>
          </div>
        </div>

        <div className="v2-surface bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-emerald-50 dark:bg-emerald-900/10 rounded-full transition-transform group-hover:scale-110" />
          <div className="relative">
            <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-2xl flex items-center justify-center mb-4">
              <UserCheck size={24} />
            </div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Yearly Leader</p>
            <h3 className="v2-heading text-2xl font-bold text-slate-900 dark:text-white mt-1 truncate">
              {yearlyRanking[0]?.name || 'N/A'}
            </h3>
            <p className="text-xs text-slate-500 mt-2">
              {yearlyRanking[0]?.count || 0} Total in {selectedYear}
            </p>
          </div>
        </div>
      </div>

      <div className="v2-grid grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Monthly Ranking Table */}
        <div className="v2-surface bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <h3 className="v2-heading font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Award size={18} className="text-amber-500" />
              Monthly Ranking ({months[parseInt(selectedMonth) - 1]})
            </h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {monthlyRanking.length > 0 ? monthlyRanking.map((person, i) => (
                <div key={person.name} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 group hover:border-indigo-200 dark:hover:border-indigo-900 transition-all">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${
                      i === 0 ? 'bg-amber-100 text-amber-600' : 
                      i === 1 ? 'bg-slate-200 text-slate-600' : 
                      i === 2 ? 'bg-orange-100 text-orange-600' : 
                      'bg-white dark:bg-slate-900 text-slate-400'
                    }`}>
                      {i + 1}
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white">{person.name}</p>
                      <p className="text-xs text-slate-500">Assigned Tasks</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-black text-indigo-600 dark:text-indigo-400">{person.count}</p>
                    <div className="w-24 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mt-1 overflow-hidden">
                      <div 
                        className="h-full bg-indigo-500 rounded-full" 
                        style={{ width: `${monthlyRanking[0] ? (person.count / monthlyRanking[0].count) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                </div>
              )) : (
                <div className="py-12 text-center text-slate-400 italic">No assignments found for this month.</div>
              )}
            </div>
          </div>
        </div>

        {/* Yearly Distribution Chart */}
        <div className="v2-surface bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-lg p-8 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-indigo-500/10 transition-all duration-700" />
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="v2-heading font-bold text-slate-900 dark:text-white text-xl">Yearly Performance</h3>
              <p className="text-sm text-slate-500">Distribution across {selectedYear}</p>
            </div>
            <div className="bg-indigo-50 dark:bg-indigo-900/20 px-3 py-1 rounded-full text-indigo-600 dark:text-indigo-400 text-xs font-bold uppercase tracking-wider">
              Cumulative Data
            </div>
          </div>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={yearlyDistributionData} layout="vertical" margin={{ left: 60, right: 40, bottom: 20 }}>
                <defs>
                  {CHART_COLORS.map((color, i) => (
                    <linearGradient key={`gradient-${i}`} id={`barGradient-${i}`} x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor={color} stopOpacity={0.8} />
                      <stop offset="100%" stopColor={color} stopOpacity={1} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e2e8f0" strokeOpacity={0.5} />
                <XAxis type="number" hide />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 13, fontWeight: 600, fill: '#475569' }}
                />
                <Tooltip 
                  cursor={{ fill: 'rgba(99, 102, 241, 0.05)', radius: 8 }}
                  contentStyle={{ 
                    backgroundColor: '#1e293b', 
                    border: 'none', 
                    borderRadius: '16px', 
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                    padding: '12px 16px'
                  }}
                  itemStyle={{ color: '#fff', fontWeight: 700 }}
                  labelStyle={{ color: '#94a3b8', marginBottom: '4px', fontSize: '12px' }}
                />
                <Bar 
                  dataKey="count" 
                  radius={[0, 10, 10, 0]} 
                  barSize={28}
                  animationDuration={1500}
                >
                  {yearlyDistributionData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={`url(#barGradient-${index % CHART_COLORS.length})`}
                      className="transition-all duration-300 hover:opacity-80"
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Time Performance Analytics Section */}
      <div className="v2-surface bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-8 space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 dark:border-slate-800 pb-6">
          <div>
            <h3 className="v2-heading font-bold text-slate-900 dark:text-white text-xl flex items-center gap-2">
              <Clock size={20} className="text-indigo-600" />
              Assigned Person Time Performance Analytics
            </h3>
            <p className="text-sm text-slate-500">
              Analyze speed metrics (Response and Resolution times) by handler for{' '}
              {timeReportMode === 'day' 
                ? `${selectedDay} ${months[parseInt(selectedMonth) - 1]} ${selectedYear}` 
                : timeReportMode === 'month' 
                  ? `${months[parseInt(selectedMonth) - 1]} ${selectedYear}` 
                  : selectedYear}
            </p>
          </div>

          {/* Mode Switcher */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            {timeReportMode === 'day' && (
              <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
                <span className="text-xs font-semibold text-slate-400 uppercase">Day:</span>
                <select
                  value={selectedDay}
                  onChange={(e) => setSelectedDay(e.target.value)}
                  className="v2-control bg-transparent text-xs font-bold outline-none cursor-pointer text-indigo-600 dark:text-indigo-400"
                >
                  {Array.from({ length: daysInMonth }, (_, i) => {
                    const d = String(i + 1).padStart(2, '0');
                    return <option key={d} value={d}>{d}</option>;
                  })}
                </select>
              </div>
            )}
            <div className="flex bg-slate-50 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setTimeReportMode('day')}
                className={"v2-button " + (`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  timeReportMode === 'day'
                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`)}
              >
                Daily
              </button>
              <button
                onClick={() => setTimeReportMode('month')}
                className={"v2-button " + (`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  timeReportMode === 'month'
                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`)}
              >
                This Month
              </button>
              <button
                onClick={() => setTimeReportMode('year')}
                className={"v2-button " + (`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  timeReportMode === 'year'
                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`)}
              >
                Full Year
              </button>
            </div>
          </div>
        </div>

        {/* Grid/Table content */}
        <div className="v2-ledger-scroll overflow-x-auto">
          <DataLedger><table className="v2-ledger w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/10">
                <th className="px-5 py-3.5 text-xs font-bold text-slate-500 dark:text-slate-400 whitespace-nowrap">Assigned Person</th>
                <th className="px-5 py-3.5 text-xs font-bold text-slate-500 dark:text-slate-400 whitespace-nowrap text-center">Total Tickets</th>
                <th className="px-5 py-3.5 text-xs font-bold text-slate-500 dark:text-slate-400 whitespace-nowrap text-center">Avg Response Speed</th>
                <th className="px-5 py-3.5 text-xs font-bold text-slate-500 dark:text-slate-400 whitespace-nowrap text-center">Avg Resolution Speed</th>
                <th className="px-5 py-3.5 text-xs font-bold text-slate-500 dark:text-slate-400 whitespace-nowrap text-center">Avg Total Support Time</th>
                <th className="px-5 py-3.5 text-xs font-bold text-slate-500 dark:text-slate-400 whitespace-nowrap text-center">Total Support Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-150 dark:divide-slate-800">
              {timePerformanceData.length > 0 ? (
                timePerformanceData.map((data) => {
                  const isExpanded = !!expandedTimePersons[data.person];
                  
                  return (
                    <React.Fragment key={data.person}>
                      <tr 
                        onClick={() => setExpandedTimePersons(prev => ({ ...prev, [data.person]: !prev[data.person] }))}
                        className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors cursor-pointer select-none"
                        title="Click to view/hide detailed ticket breakdown"
                      >
                        <td className="px-5 py-4 font-bold text-slate-900 dark:text-white whitespace-nowrap">
                          {data.person}
                        </td>
                        <td className="px-5 py-4 font-bold text-indigo-600 dark:text-indigo-400 text-center whitespace-nowrap">
                          {data.issues.length}
                        </td>
                        <td className="px-5 py-4 text-center whitespace-nowrap">
                          <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${
                            data.avgResponseLag !== null 
                              ? 'bg-amber-50 dark:bg-amber-900/10 text-amber-600 dark:text-amber-400'
                              : 'text-slate-400'
                          }`}>
                            {formatDuration(data.avgResponseLag)}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-center whitespace-nowrap">
                          <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${
                            data.avgResolutionLag !== null 
                              ? 'bg-emerald-50 dark:bg-emerald-900/10 text-emerald-600 dark:text-emerald-400'
                              : 'text-slate-400'
                          }`}>
                            {formatDuration(data.avgResolutionLag)}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-center whitespace-nowrap">
                          <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                            data.avgTotalLag !== null 
                              ? 'bg-indigo-50 dark:bg-indigo-900/15 text-indigo-600 dark:text-indigo-400'
                              : 'text-slate-400'
                          }`}>
                            {formatDuration(data.avgTotalLag)}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-center whitespace-nowrap">
                          <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                            data.totalSupportTime > 0
                              ? 'bg-violet-50 dark:bg-violet-900/15 text-violet-600 dark:text-violet-400'
                              : 'text-slate-400'
                          }`}>
                            {formatDuration(data.totalSupportTime)}
                          </span>
                        </td>
                      </tr>

                      {/* Expandable detailed ticket stats */}
                      {isExpanded && (
                        <tr>
                          <td colSpan={6} className="px-6 py-4 bg-slate-50/60 dark:bg-slate-900/40">
                            <div className="v2-surface border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-950 shadow-inner" onClick={(e) => e.stopPropagation()}>
                              <div className="p-4 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                                <h4 className="v2-heading text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                                  Ticket Timeline Log for {data.person}
                                </h4>
                                <span className="text-[11px] text-slate-400 font-semibold">
                                  Showing {data.issues.length} entries
                                </span>
                              </div>
                              <div className="v2-ledger-scroll overflow-x-auto">
                                <DataLedger><table className="v2-ledger w-full text-left text-xs">
                                  <thead>
                                    <tr className="bg-slate-50/50 dark:bg-slate-800/20 border-b border-slate-200 dark:border-slate-800">
                                      <th className="px-4 py-2.5 font-bold text-slate-800 dark:text-slate-200 whitespace-nowrap">Client</th>
                                      <th className="px-4 py-2.5 font-bold text-slate-800 dark:text-slate-200 whitespace-nowrap text-center">Issue Date and time</th>
                                      <th className="px-4 py-2.5 font-bold text-slate-800 dark:text-slate-200 whitespace-nowrap text-center">Client Reporting Time</th>
                                      <th className="px-4 py-2.5 font-bold text-slate-800 dark:text-slate-200 whitespace-nowrap text-center">Response Time</th>
                                      <th className="px-4 py-2.5 font-bold text-slate-800 dark:text-slate-200 whitespace-nowrap text-center">Resolution Time</th>
                                      <th className="px-4 py-2.5 font-bold text-slate-800 dark:text-slate-200 whitespace-nowrap text-center">Response Speed</th>
                                      <th className="px-4 py-2.5 font-bold text-slate-800 dark:text-slate-200 whitespace-nowrap text-center">Resolution Speed</th>
                                      <th className="px-4 py-2.5 font-bold text-slate-800 dark:text-slate-200 whitespace-nowrap text-center">Total Time</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {data.issues.map((issue) => (
                                      <tr key={issue.id} className="hover:bg-slate-50/40 dark:hover:bg-slate-800/10 transition-colors">
                                        <td className="px-4 py-3 font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                                          {issue.client_name}
                                        </td>
                                        <td className="px-4 py-3 text-slate-900 dark:text-slate-100 text-center whitespace-nowrap font-semibold">
                                          {issue.issue_date || '-'}
                                        </td>
                                        <td className="px-4 py-3 text-slate-900 dark:text-slate-100 text-center whitespace-nowrap font-semibold">
                                          {issue.client_reporting_time || '-'}
                                        </td>
                                        <td className="px-4 py-3 text-slate-900 dark:text-slate-100 text-center whitespace-nowrap font-semibold">
                                          {issue.response_time || '-'}
                                        </td>
                                        <td className="px-4 py-3 text-slate-900 dark:text-slate-100 text-center whitespace-nowrap font-semibold">
                                          {issue.resolution_time || '-'}
                                        </td>
                                        <td className="px-4 py-3 text-center whitespace-nowrap">
                                          {issue.responseLag !== null ? (
                                            <span className="text-amber-600 dark:text-amber-400 font-bold">
                                              {formatDuration(issue.responseLag)}
                                            </span>
                                          ) : (
                                            <span className="text-slate-300 dark:text-slate-700">-</span>
                                          )}
                                        </td>
                                        <td className="px-4 py-3 text-center whitespace-nowrap">
                                          {issue.resolutionLag !== null ? (
                                            <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                                              {formatDuration(issue.resolutionLag)}
                                            </span>
                                          ) : (
                                            <span className="text-slate-300 dark:text-slate-700">-</span>
                                          )}
                                        </td>
                                        <td className="px-4 py-3 text-center whitespace-nowrap font-bold text-indigo-600 dark:text-indigo-400">
                                          {issue.totalLag !== null ? formatDuration(issue.totalLag) : '-'}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table></DataLedger>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-slate-400 italic">
                    No time metrics recorded for this selected period.
                  </td>
                </tr>
              )}
            </tbody>
          </table></DataLedger>
        </div>
      </div>

      {/* Handler & Repeated Clients Analytics Section */}
      <div className="v2-surface bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-8 space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 dark:border-slate-800 pb-6">
          <div>
            <h3 className="v2-heading font-bold text-slate-900 dark:text-white text-xl flex items-center gap-2">
              <Repeat size={20} className="text-indigo-600" />
              Assigned Person & Client Repetitions
            </h3>
            <p className="text-sm text-slate-500">
              Tracks how many times same-company issues are assigned to a specific handler in{' '}
              {repeatSelectedMonth === 'all' ? selectedYear : `${months[parseInt(repeatSelectedMonth) - 1]} ${selectedYear}`}
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto shrink-0">
            {/* Month selector for repetitions */}
            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 px-3 py-2 rounded-xl text-sm w-full sm:w-auto">
              <span className="text-xs font-semibold text-slate-400 uppercase shrink-0">Month:</span>
              <select
                value={repeatSelectedMonth}
                onChange={(e) => setRepeatSelectedMonth(e.target.value)}
                className="v2-control bg-transparent text-sm font-bold outline-none cursor-pointer text-indigo-600 dark:text-indigo-400 w-full sm:w-auto font-sans"
              >
                <option value="all" className="dark:bg-slate-900 text-slate-800 dark:text-slate-100">Full Year</option>
                {months.map((m, i) => (
                  <option 
                    key={m} 
                    value={String(i + 1).padStart(2, '0')}
                    className="dark:bg-slate-900 text-slate-800 dark:text-slate-100"
                  >
                    {m}
                  </option>
                ))}
              </select>
            </div>

            {/* Search box */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="text"
                placeholder="Search person or company..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="v2-control w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
              />
            </div>

            {/* Excel Download button */}
            
          <button
              onClick={downloadExcel}
              title="Download repetitions report to Excel (.xlsx)"
              className="v2-button v2-primary flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white font-bold px-4.5 py-2 rounded-xl text-sm transition-all duration-200 shadow-sm sm:w-auto w-full group active:scale-[0.98] cursor-pointer"
            >
              <Download size={16} className="group-hover:translate-y-0.5 transition-transform duration-200" />
              <span>Download Excel (.xlsx)</span>
            </button></div>
        </div>

        {/* Highlight Cards */}
        <div className="v2-grid grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-indigo-50/50 dark:bg-indigo-950/10 border border-indigo-100/60 dark:border-indigo-900/40 p-4 rounded-2xl flex items-center gap-4">
            <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center shrink-0">
              <UserCheck size={20} />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Handlers with Repeats</p>
              <h4 className="v2-heading text-lg font-bold text-slate-900 dark:text-white">{repeatStats.handlersWithRepeats} persons</h4>
            </div>
          </div>

          <div className="bg-rose-50/50 dark:bg-rose-950/10 border border-rose-100/60 dark:border-rose-900/40 p-4 rounded-2xl flex items-center gap-4">
            <div className="w-10 h-10 bg-rose-100 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 rounded-xl flex items-center justify-center shrink-0">
              <Repeat size={20} />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Total Repeated Issues</p>
              <h4 className="v2-heading text-lg font-bold text-slate-900 dark:text-white">{repeatStats.totalRepeatIssues} times</h4>
            </div>
          </div>

          <div className="bg-emerald-50/50 dark:bg-emerald-950/10 border border-emerald-100/60 dark:border-emerald-900/40 p-4 rounded-2xl flex items-center gap-4">
            <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-xl flex items-center justify-center shrink-0">
              <Building2 size={20} />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-slate-500 font-medium">Top Repeat Alignment</p>
              <h4 className="v2-heading text-sm font-bold text-slate-900 dark:text-white truncate">
                {repeatStats.topPair.count > 1 ? `${repeatStats.topPair.person} ⟷ ${repeatStats.topPair.client}` : 'None'}
              </h4>
              {repeatStats.topPair.count > 1 && (
                <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">{repeatStats.topPair.count} times</p>
              )}
            </div>
          </div>
        </div>

        {/* List Grid */}
        {displayedRepeatAnalysis.length > 0 ? (
          <div className="space-y-6">
            <div className="v2-grid grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              {displayedRepeatAnalysis.map((data) => {
                const hasRepeats = data.repeatClients.length > 0;
                const isExpanded = !!expandedPersons[data.person];
                
                return (
                  <div 
                    key={data.person}
                    className={`border rounded-2xl transition-all duration-300 ${
                      hasRepeats 
                        ? 'bg-slate-50/50 dark:bg-slate-800/30 border-slate-200 dark:border-slate-800 shadow-sm'
                        : 'bg-white dark:bg-slate-900/20 border-slate-100 dark:border-slate-800/60'
                    }`}
                  >
                    {/* Card Header */}
                    <div className="p-5 flex items-start justify-between gap-3 border-b border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center">
                          <User size={18} />
                        </div>
                        <div>
                          <h4 className="v2-heading font-bold text-slate-900 dark:text-white">{data.person}</h4>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[11px] text-slate-500 border-r border-slate-200 dark:border-slate-700 pr-2">
                              {data.uniqueClientsCount} Unique Companies
                            </span>
                            <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
                              {data.totalIssues} Total Issues
                            </span>
                          </div>
                        </div>
                      </div>

                      {hasRepeats ? (
                        <span className="bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1 shrink-0">
                          <Repeat size={10} />
                          {data.repeatClients.length} Repeat
                        </span>
                      ) : (
                        <span className="bg-slate-100 dark:bg-slate-800 text-slate-500 text-[10px] px-2 py-1 rounded-full shrink-0">
                          No Repeats
                        </span>
                      )}
                    </div>

                    {/* Clients List */}
                    <div className="p-5 space-y-4">
                      {/* Repeat entries */}
                      {hasRepeats ? (
                        <div className="space-y-3">
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Repeated clients ({data.repeatClients.length})</p>
                          <div className="space-y-2.5">
                            {(() => {
                              const subPage = subRepeatPages[data.person] || 1;
                              const subItemsPerPage = 5;
                              const totalSubPages = Math.ceil(data.repeatClients.length / subItemsPerPage);
                              const displayedSubClients = data.repeatClients.slice((subPage - 1) * subItemsPerPage, subPage * subItemsPerPage);

                              return (
                                <>
                                  {displayedSubClients.map((client) => {
                                    const percent = Math.min(Math.round((client.count / data.totalIssues) * 100), 100);
                                    return (
                                      <div key={client.client_name} className="v2-surface bg-white dark:bg-slate-900 border border-slate-155 dark:border-slate-800/85 p-3 rounded-xl shadow-xs">
                                        <div className="flex items-center justify-between gap-2 mb-1.5">
                                          <span className="font-semibold text-sm text-slate-800 dark:text-slate-200 truncate flex items-center gap-1.5">
                                            <Building2 size={13} className="text-slate-400" />
                                            {client.client_name}
                                          </span>
                                          <span className="bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 text-xs font-black px-2 py-0.5 rounded-lg border border-rose-100 dark:border-rose-900/10 shrink-0">
                                            {client.count} times
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                            <div 
                                              className="h-full bg-gradient-to-r from-rose-500 to-indigo-500 rounded-full"
                                              style={{ width: `${percent}%` }}
                                            />
                                          </div>
                                          <span className="text-[10px] font-bold text-slate-400 w-8 text-right">{percent}%</span>
                                        </div>
                                      </div>
                                    );
                                  })}

                                  {totalSubPages > 1 && (
                                    <div className="flex items-center justify-between pt-2 mt-2 border-t border-slate-100 dark:border-slate-800/60">
                                      <span className="text-[10px] font-bold text-slate-400">
                                        Page {subPage} of {totalSubPages}
                                      </span>
                                      <div className="flex items-center gap-1.5">
                                        <button
                                          disabled={subPage === 1}
                                          onClick={() => {
                                            setSubRepeatPages(prev => ({
                                              ...prev,
                                              [data.person]: Math.max((prev[data.person] || 1) - 1, 1)
                                            }));
                                          }}
                                          className="v2-button p-1 border border-slate-250 dark:border-slate-700 rounded-lg text-slate-500 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors bg-white dark:bg-slate-900"
                                          aria-label="Previous client page"
                                        >
                                          <ChevronLeft size={12} />
                                        </button>
                                        <button
                                          disabled={subPage === totalSubPages}
                                          onClick={() => {
                                            setSubRepeatPages(prev => ({
                                              ...prev,
                                              [data.person]: Math.min((prev[data.person] || 1) + 1, totalSubPages)
                                            }));
                                          }}
                                          className="v2-button p-1 border border-slate-250 dark:border-slate-700 rounded-lg text-slate-500 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors bg-white dark:bg-slate-900"
                                          aria-label="Next client page"
                                        >
                                          <ChevronRight size={12} />
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </>
                              );
                            })()}
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 italic">This handler has handled each company at most once this year.</p>
                      )}

                      {/* Expandable all entries */}
                      {data.allClients.length > data.repeatClients.length && (
                        <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                          <button
                            onClick={() => togglePersonExpand(data.person)}
                            className="v2-button flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 font-bold transition-colors"
                          >
                            {isExpanded ? (
                              <>
                                <ChevronUp size={14} /> Hide non-repeated companies
                              </>
                            ) : (
                              <>
                                <ChevronDown size={14} /> Show other companies ({data.allClients.length - data.repeatClients.length})
                              </>
                            )}
                          </button>

                          {isExpanded && (
                            <div className="mt-3 space-y-1.5 animate-in fade-in slide-in-from-top-2 duration-200">
                              {data.allClients
                                .filter(c => c.count === 1)
                                .map((client) => (
                                  <div 
                                    key={client.client_name}
                                    className="flex items-center justify-between py-2 px-3 text-xs bg-slate-50 dark:bg-slate-800/30 rounded-lg text-slate-600 dark:text-slate-400 border border-slate-100/50 dark:border-slate-800/40"
                                  >
                                    <span className="truncate flex items-center gap-1.5">
                                      <Building2 size={12} className="text-slate-400/80" />
                                      {client.client_name}
                                    </span>
                                    <span className="font-semibold">{client.count} time</span>
                                  </div>
                                ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination Controls */}
            {totalRepeatPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-slate-100 dark:border-slate-800">
                <p className="text-xs font-semibold text-slate-500">
                  Showing <span className="text-slate-950 dark:text-white font-bold">{Math.min((repeatPage - 1) * itemsPerPage + 1, filteredRepeatAnalysis.length)}</span> to{' '}
                  <span className="text-slate-950 dark:text-white font-bold">{Math.min(repeatPage * itemsPerPage, filteredRepeatAnalysis.length)}</span> of{' '}
                  <span className="text-slate-950 dark:text-white font-bold">{filteredRepeatAnalysis.length}</span> entries
                </p>

                <div className="flex items-center gap-1.5">
                  <button
                    disabled={repeatPage === 1}
                    onClick={() => setRepeatPage(prev => Math.max(prev - 1, 1))}
                    className="v2-button p-2 border border-slate-200 dark:border-slate-700/80 rounded-xl text-slate-600 dark:text-slate-450 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors bg-white dark:bg-slate-900 shadow-xs"
                    aria-label="Previous Page"
                  >
                    <ChevronLeft size={16} />
                  </button>

                  <div className="flex items-center gap-1 px-1">
                    {Array.from({ length: totalRepeatPages }).map((_, i) => {
                      const pageNum = i + 1;
                      const isActive = repeatPage === pageNum;
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setRepeatPage(pageNum)}
                          className={"v2-button " + (`w-9 h-9 rounded-xl text-xs font-bold transition-all duration-200 ${
                            isActive
                              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800'
                          }`)}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    disabled={repeatPage === totalRepeatPages}
                    onClick={() => setRepeatPage(prev => Math.min(prev + 1, totalRepeatPages))}
                    className="v2-button p-2 border border-slate-200 dark:border-slate-700/80 rounded-xl text-slate-600 dark:text-slate-450 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors bg-white dark:bg-slate-900 shadow-xs"
                    aria-label="Next Page"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="py-12 text-center text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
            No matching assignments with repeated company issues found.
          </div>
        )}
      </div>

      {/* Monthly Trend Chart */}
      <div className="v2-surface bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h3 className="v2-heading font-bold text-slate-900 dark:text-white text-xl">Monthly Assignment Trend</h3>
            <p className="text-sm text-slate-500">Total volume of issues across {selectedYear}</p>
          </div>
        </div>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={monthlyTrend}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 12, fontWeight: 600, fill: '#64748b' }}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 12, fontWeight: 600, fill: '#64748b' }}
              />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', color: '#fff' }}
              />
              <Line 
                type="monotone" 
                dataKey="count" 
                stroke="#258f80" 
                strokeWidth={4} 
                dot={{ r: 6, fill: '#258f80', strokeWidth: 3, stroke: '#fff' }}
                activeDot={{ r: 8, strokeWidth: 0 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div></ModuleWorkspace>
  );
};

export default Analytics;


