import { downloadStyledReport } from '../lib/excelReport';
import { DrawerPortal } from './common/DrawerPortal';
import { DataLedger, FilterDesk } from './common/DataLedger';
import { ModuleWorkspace } from './common/ModuleWorkspace';
import React, { useState, useEffect, useMemo } from 'react';
import { dbService } from '../services/dbService';
import { Issue, SettingItem } from '../types';
import { 
  Smile, 
  Meh, 
  Frown, 
  HelpCircle, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Users, 
  Building2, 
  Repeat, 
  Calendar, 
  Filter, 
  Download, 
  Search, 
  X, 
  TrendingUp, 
  AlertTriangle, 
  Award, 
  ChevronRight, 
  Eye, 
  BarChart3, 
  PieChart as PieChartIcon, 
  RefreshCw,
  ArrowUpRight,
  ShieldAlert,
  ArrowRight,
  Layers,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  Legend, 
  AreaChart, 
  Area, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';
import * as XLSX from 'xlsx';

export const isSolvedOrClosed = (status?: string): boolean => {
  if (!status) return false;
  const s = status.trim().toLowerCase();
  return s === 'close' || s === 'closed' || s === 'done';
};

export const isSatisfiedIssue = (issue: { customer_satisfaction?: string; feedback_rating?: number }): boolean => {
  const sat = issue.customer_satisfaction?.trim();
  if (sat === 'Excellent' || sat === 'Good' || sat === 'Satisfied') return true;
  if (issue.feedback_rating && issue.feedback_rating >= 4) return true;
  return false;
};

export const isNeutralIssue = (issue: { customer_satisfaction?: string; feedback_rating?: number }): boolean => {
  const sat = issue.customer_satisfaction?.trim();
  if (sat === 'Average' || sat === 'Neutral') return true;
  if (issue.feedback_rating === 3) return true;
  return false;
};

export const isDissatisfiedIssue = (issue: { customer_satisfaction?: string; feedback_rating?: number }): boolean => {
  const sat = issue.customer_satisfaction?.trim();
  if (sat === 'Poor' || sat === 'Very Poor' || sat === 'Dissatisfied') return true;
  if (issue.feedback_rating && (issue.feedback_rating === 1 || issue.feedback_rating === 2)) return true;
  return false;
};

const SATISFACTION_COLORS: Record<string, string> = {
  Satisfied: '#10B981',    // Emerald
  Neutral: '#F59E0B',      // Amber
  Dissatisfied: '#EF4444', // Red
  'No Feedback': '#94A3B8' // Slate
};

const RESOLVED_COLORS: Record<string, string> = {
  Yes: '#10B981',
  No: '#EF4444',
  'No Response': '#F59E0B',
  Pending: '#94A3B8'
};

const STATUS_PIE_COLORS: Record<string, string> = {
  'Closed / Solved': '#10B981',
  'Open': '#3B82F6',
  'In Progress': '#8B5CF6',
  'Pending': '#F97316',
  'Other': '#64748B'
};

export const CSATReport: React.FC = () => {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [assignedOptions, setAssignedOptions] = useState<SettingItem[]>([]);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  });
  const [allMonths, setAllMonths] = useState(false);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [assignedFilter, setAssignedFilter] = useState('');
  const [satisfactionFilter, setSatisfactionFilter] = useState('');
  const [resolvedFilter, setResolvedFilter] = useState('');
  const [repetitionFilter, setRepetitionFilter] = useState<'all' | 'repeat' | 'high_repeat' | 'single'>('all');

  // UI state
  const [selectedRatingCard, setSelectedRatingCard] = useState<'all' | 5 | 4 | 3 | 2 | 1 | 'none'>('all');
  const [viewIssueModal, setViewIssueModal] = useState<Issue | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [fetchedIssues, fetchedAssigned] = await Promise.all([
        dbService.getIssues(),
        dbService.getSettingsByCategory('assigned_person')
      ]);
      setIssues(fetchedIssues || []);
      setAssignedOptions(fetchedAssigned || []);
    } catch (err) {
      console.error('Failed to load CSAT report data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Group all issues by client for repetition tracking across all history
  const clientHistoryMap = useMemo(() => {
    const map = new Map<string, Issue[]>();
    issues.forEach(issue => {
      const name = (issue.client_name || '').trim();
      if (!name) return;
      if (!map.has(name)) {
        map.set(name, []);
      }
      map.get(name)!.push(issue);
    });
    // Sort each client's issues chronologically
    map.forEach((list) => {
      list.sort((a, b) => {
        const dateA = new Date(a.issue_date || a.created_at || '').getTime();
        const dateB = new Date(b.issue_date || b.created_at || '').getTime();
        return dateA - dateB;
      });
    });
    return map;
  }, [issues]);

  // Filter issues based on criteria
  const filteredIssues = useMemo(() => {
    return issues.filter(issue => {
      // Search
      if (search) {
        const q = search.toLowerCase();
        const client = (issue.client_name || '').toLowerCase();
        const details = (issue.issue_details || '').toLowerCase();
        const assigned = (issue.assigned_person || '').toLowerCase();
        const ticketId = (issue.clickup_ticket_id || '').toLowerCase();
        const status = (issue.status || '').toLowerCase();
        if (!client.includes(q) && !details.includes(q) && !assigned.includes(q) && !ticketId.includes(q) && !status.includes(q)) {
          return false;
        }
      }

      // Date logic: prioritize feedback_date if available for CSAT, fallback to issue_date/created_at
      const relevantDateStr = issue.feedback_date || issue.issue_date || issue.created_at;
      const relevantDate = relevantDateStr ? new Date(relevantDateStr) : null;

      // Month filter
      if (!allMonths && selectedMonth && relevantDate && !isNaN(relevantDate.getTime())) {
        const [year, month] = selectedMonth.split('-').map(Number);
        if (relevantDate.getFullYear() !== year || (relevantDate.getMonth() + 1) !== month) {
          return false;
        }
      }

      // Date range filter
      if (fromDate && relevantDate) {
        const fromTime = new Date(fromDate).getTime();
        if (relevantDate.getTime() < fromTime) return false;
      }
      if (toDate && relevantDate) {
        const toTime = new Date(toDate).getTime() + 86400000;
        if (relevantDate.getTime() > toTime) return false;
      }

      // Status / Solution filter (Closed vs Open, etc.)
      if (statusFilter) {
        const isClosed = isSolvedOrClosed(issue.status);
        if (statusFilter === 'closed' && !isClosed) return false;
        if (statusFilter === 'open' && (issue.status?.toLowerCase() !== 'open')) return false;
        if (statusFilter === 'in_progress' && (issue.status?.toLowerCase() !== 'in progress')) return false;
        if (statusFilter === 'pending' && (issue.status?.toLowerCase() !== 'pending')) return false;
        if (statusFilter === 'unsolved' && isClosed) return false;
      }

      // Assigned person
      if (assignedFilter && issue.assigned_person !== assignedFilter) {
        return false;
      }

      // Customer satisfaction
      if (satisfactionFilter) {
        if (satisfactionFilter === 'none') {
          if ((issue.customer_satisfaction && issue.customer_satisfaction.trim() !== '') || issue.feedback_rating) return false;
        } else if (satisfactionFilter === 'Satisfied') {
          if (!isSatisfiedIssue(issue)) return false;
        } else if (satisfactionFilter === 'Neutral') {
          if (!isNeutralIssue(issue)) return false;
        } else if (satisfactionFilter === 'Dissatisfied') {
          if (!isDissatisfiedIssue(issue)) return false;
        } else if (satisfactionFilter === 'Excellent') {
          if (issue.customer_satisfaction !== 'Excellent' && issue.feedback_rating !== 5) return false;
        } else if (satisfactionFilter === 'Good') {
          if (issue.customer_satisfaction !== 'Good' && issue.feedback_rating !== 4) return false;
        } else if (satisfactionFilter === 'Average') {
          if (issue.customer_satisfaction !== 'Average' && issue.feedback_rating !== 3) return false;
        } else if (satisfactionFilter === 'Poor') {
          if (issue.customer_satisfaction !== 'Poor' && issue.feedback_rating !== 2) return false;
        } else if (satisfactionFilter === 'Very Poor') {
          if (issue.customer_satisfaction !== 'Very Poor' && issue.feedback_rating !== 1) return false;
        } else if (issue.customer_satisfaction !== satisfactionFilter) {
          return false;
        }
      }

      // Issue resolved confirmed
      if (resolvedFilter) {
        if (resolvedFilter === 'none') {
          if (issue.issue_resolved_confirmed && issue.issue_resolved_confirmed.trim() !== '') return false;
        } else if (issue.issue_resolved_confirmed !== resolvedFilter) {
          return false;
        }
      }

      // Client repetitions
      const clientName = (issue.client_name || '').trim();
      const totalClientTickets = clientHistoryMap.get(clientName)?.length || 1;
      if (repetitionFilter === 'single' && totalClientTickets > 1) return false;
      if (repetitionFilter === 'repeat' && totalClientTickets < 2) return false;
      if (repetitionFilter === 'high_repeat' && totalClientTickets < 3) return false;

      return true;
    });
  }, [
    issues,
    search,
    allMonths,
    selectedMonth,
    fromDate,
    toDate,
    statusFilter,
    assignedFilter,
    satisfactionFilter,
    resolvedFilter,
    repetitionFilter,
    clientHistoryMap
  ]);

  // Overall CSAT, Solution (Closed Status), and Resolution Calculations
  const stats = useMemo(() => {
    const total = filteredIssues.length;

    // Solution / Status calculations
    let closedCount = 0;
    let openCount = 0;
    let inProgressCount = 0;
    let pendingCount = 0;

    // Customer satisfaction calculations
    let satisfied = 0;
    let neutral = 0;
    let dissatisfied = 0;
    let feedbackCount = 0;

    // Client confirmation calculations
    let resolvedYes = 0;
    let resolvedNo = 0;
    let resolvedNoResponse = 0;
    let resolvedCount = 0;

    const repeatClientsSet = new Set<string>();
    const totalClientsSet = new Set<string>();

    filteredIssues.forEach(i => {
      // Repetition tracking
      const clientName = (i.client_name || '').trim();
      if (clientName) {
        totalClientsSet.add(clientName);
        if ((clientHistoryMap.get(clientName)?.length || 0) > 1) {
          repeatClientsSet.add(clientName);
        }
      }

      // Solution / Status check
      if (isSolvedOrClosed(i.status)) {
        closedCount++;
      } else {
        const st = (i.status || '').toLowerCase();
        if (st === 'open') openCount++;
        else if (st === 'in progress') inProgressCount++;
        else if (st === 'pending') pendingCount++;
        else openCount++;
      }

      // Customer satisfaction check
      if (isSatisfiedIssue(i)) {
        satisfied++;
        feedbackCount++;
      } else if (isNeutralIssue(i)) {
        neutral++;
        feedbackCount++;
      } else if (isDissatisfiedIssue(i)) {
        dissatisfied++;
        feedbackCount++;
      }

      // Issue resolved confirmed check
      const res = i.issue_resolved_confirmed?.trim();
      if (res === 'Yes') {
        resolvedYes++;
        resolvedCount++;
      } else if (res === 'No') {
        resolvedNo++;
        resolvedCount++;
      } else if (res === 'No Response') {
        resolvedNoResponse++;
        resolvedCount++;
      }
    });

    const closedRate = total > 0 ? Math.round((closedCount / total) * 100) : 0;
    const csatScore = feedbackCount > 0 ? Math.round((satisfied / feedbackCount) * 100) : 0;
    const resolvedRate = resolvedCount > 0 ? Math.round((resolvedYes / resolvedCount) * 100) : 0;
    const feedbackRate = total > 0 ? Math.round((feedbackCount / total) * 100) : 0;

    return {
      total,
      closedCount,
      openCount,
      inProgressCount,
      pendingCount,
      closedRate,
      feedbackCount,
      feedbackRate,
      satisfied,
      neutral,
      dissatisfied,
      csatScore,
      resolvedYes,
      resolvedNo,
      resolvedNoResponse,
      resolvedCount,
      resolvedRate,
      totalClients: totalClientsSet.size,
      repeatClients: repeatClientsSet.size
    };
  }, [filteredIssues, clientHistoryMap]);

  // Monthly Trend Data for Chart
  const monthlyTrendData = useMemo(() => {
    const monthsMap = new Map<string, {
      month: string;
      totalIssues: number;
      closedCount: number;
      satisfied: number;
      neutral: number;
      dissatisfied: number;
      totalFeedback: number;
      resolvedYes: number;
      totalResolved: number;
    }>();

    issues.forEach(issue => {
      const dateStr = issue.feedback_date || issue.issue_date || issue.created_at;
      if (!dateStr) return;
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

      if (!monthsMap.has(key)) {
        monthsMap.set(key, {
          month: key,
          totalIssues: 0,
          closedCount: 0,
          satisfied: 0,
          neutral: 0,
          dissatisfied: 0,
          totalFeedback: 0,
          resolvedYes: 0,
          totalResolved: 0
        });
      }

      const entry = monthsMap.get(key)!;
      entry.totalIssues++;

      if (isSolvedOrClosed(issue.status)) {
        entry.closedCount++;
      }

      if (isSatisfiedIssue(issue)) {
        entry.satisfied++;
        entry.totalFeedback++;
      } else if (isNeutralIssue(issue)) {
        entry.neutral++;
        entry.totalFeedback++;
      } else if (isDissatisfiedIssue(issue)) {
        entry.dissatisfied++;
        entry.totalFeedback++;
      }

      const res = issue.issue_resolved_confirmed?.trim();
      if (res === 'Yes') {
        entry.resolvedYes++;
        entry.totalResolved++;
      } else if (res === 'No' || res === 'No Response') {
        entry.totalResolved++;
      }
    });

    const sortedMonths = Array.from(monthsMap.values()).sort((a, b) => a.month.localeCompare(b.month));

    return sortedMonths.map(m => {
      const csat = m.totalFeedback > 0 ? Math.round((m.satisfied / m.totalFeedback) * 100) : 0;
      const closedRate = m.totalIssues > 0 ? Math.round((m.closedCount / m.totalIssues) * 100) : 0;
      const resolvedRate = m.totalResolved > 0 ? Math.round((m.resolvedYes / m.totalResolved) * 100) : 0;
      return {
        ...m,
        csatScore: csat,
        closedRate,
        resolvedRate
      };
    });
  }, [issues]);

  // 5 Ratings Breakdown & Details
  const ratingDetails = useMemo(() => {
    const counts: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    const issuesByRating: Record<number, Issue[]> = { 5: [], 4: [], 3: [], 2: [], 1: [] };
    const unratedIssues: Issue[] = [];

    filteredIssues.forEach(i => {
      let r = i.feedback_rating;
      if (!r) {
        const sat = (i.customer_satisfaction || '').trim();
        if (sat === 'Excellent') r = 5;
        else if (sat === 'Good' || sat === 'Satisfied') r = 4;
        else if (sat === 'Average' || sat === 'Neutral') r = 3;
        else if (sat === 'Poor') r = 2;
        else if (sat === 'Very Poor' || sat === 'Dissatisfied') r = 1;
      }

      if (r && r >= 1 && r <= 5) {
        counts[r] = (counts[r] || 0) + 1;
        issuesByRating[r].push(i);
      } else {
        unratedIssues.push(i);
      }
    });

    const totalRated = counts[5] + counts[4] + counts[3] + counts[2] + counts[1];

    const cards = [
      {
        rating: 5 as const,
        label: 'Excellent',
        emoji: '😊',
        point: '5 Point',
        count: counts[5],
        percentage: totalRated > 0 ? Math.round((counts[5] / totalRated) * 100) : 0,
        badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-700',
        barColor: 'bg-emerald-500',
        textColor: 'text-emerald-600 dark:text-emerald-400',
        bgCard: 'bg-emerald-50/60 border-emerald-200/80 dark:bg-emerald-950/20 dark:border-emerald-800/40'
      },
      {
        rating: 4 as const,
        label: 'Good',
        emoji: '😊',
        point: '4 Point',
        count: counts[4],
        percentage: totalRated > 0 ? Math.round((counts[4] / totalRated) * 100) : 0,
        badgeClass: 'bg-teal-100 text-teal-800 border-teal-300 dark:bg-teal-950/60 dark:text-teal-300 dark:border-teal-700',
        barColor: 'bg-teal-500',
        textColor: 'text-teal-600 dark:text-teal-400',
        bgCard: 'bg-teal-50/60 border-teal-200/80 dark:bg-teal-950/20 dark:border-teal-800/40'
      },
      {
        rating: 3 as const,
        label: 'Average',
        emoji: '😐',
        point: '3 Point',
        count: counts[3],
        percentage: totalRated > 0 ? Math.round((counts[3] / totalRated) * 100) : 0,
        badgeClass: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-700',
        barColor: 'bg-amber-500',
        textColor: 'text-amber-600 dark:text-amber-400',
        bgCard: 'bg-amber-50/60 border-amber-200/80 dark:bg-amber-950/20 dark:border-amber-800/40'
      },
      {
        rating: 2 as const,
        label: 'Poor',
        emoji: '😡',
        point: '2 Point',
        count: counts[2],
        percentage: totalRated > 0 ? Math.round((counts[2] / totalRated) * 100) : 0,
        badgeClass: 'bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-950/60 dark:text-orange-300 dark:border-orange-700',
        barColor: 'bg-orange-500',
        textColor: 'text-orange-600 dark:text-orange-400',
        bgCard: 'bg-orange-50/60 border-orange-200/80 dark:bg-orange-950/20 dark:border-orange-800/40'
      },
      {
        rating: 1 as const,
        label: 'Very Poor',
        emoji: '😡',
        point: '1 Point',
        count: counts[1],
        percentage: totalRated > 0 ? Math.round((counts[1] / totalRated) * 100) : 0,
        badgeClass: 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-700',
        barColor: 'bg-rose-500',
        textColor: 'text-rose-600 dark:text-rose-400',
        bgCard: 'bg-rose-50/60 border-rose-200/80 dark:bg-rose-950/20 dark:border-rose-800/40'
      }
    ];

    return {
      cards,
      totalRated,
      unratedCount: unratedIssues.length,
      issuesByRating,
      unratedIssues
    };
  }, [filteredIssues]);

  // Filtered issues for rating table
  const ratingTableIssues = useMemo(() => {
    if (selectedRatingCard === 'all') {
      return [...filteredIssues].sort((a, b) => (b.feedback_rating || 0) - (a.feedback_rating || 0));
    }
    if (selectedRatingCard === 'none') {
      return ratingDetails.unratedIssues;
    }
    return ratingDetails.issuesByRating[selectedRatingCard] || [];
  }, [filteredIssues, selectedRatingCard, ratingDetails]);

  const totalPages = Math.ceil(ratingTableIssues.length / itemsPerPage) || 1;
  const paginatedRatingIssues = ratingTableIssues.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Distribution Data for Pie Charts
  const statusPieData = useMemo(() => {
    return [
      { name: 'Closed / Solved', value: stats.closedCount, color: STATUS_PIE_COLORS['Closed / Solved'] },
      { name: 'Open', value: stats.openCount, color: STATUS_PIE_COLORS['Open'] },
      { name: 'In Progress', value: stats.inProgressCount, color: STATUS_PIE_COLORS['In Progress'] },
      { name: 'Pending', value: stats.pendingCount, color: STATUS_PIE_COLORS['Pending'] }
    ].filter(item => item.value > 0);
  }, [stats]);

  const satisfactionPieData = useMemo(() => {
    return [
      { name: 'Satisfied', value: stats.satisfied, color: SATISFACTION_COLORS.Satisfied },
      { name: 'Neutral', value: stats.neutral, color: SATISFACTION_COLORS.Neutral },
      { name: 'Dissatisfied', value: stats.dissatisfied, color: SATISFACTION_COLORS.Dissatisfied },
      { name: 'No Feedback', value: stats.total - stats.feedbackCount, color: SATISFACTION_COLORS['No Feedback'] }
    ].filter(item => item.value > 0);
  }, [stats]);

  const resolvedPieData = useMemo(() => {
    return [
      { name: 'Yes (Confirmed)', value: stats.resolvedYes, color: RESOLVED_COLORS.Yes },
      { name: 'No (Not Resolved)', value: stats.resolvedNo, color: RESOLVED_COLORS.No },
      { name: 'No Response', value: stats.resolvedNoResponse, color: RESOLVED_COLORS['No Response'] },
      { name: 'Pending / Blank', value: stats.total - stats.resolvedCount, color: RESOLVED_COLORS.Pending }
    ].filter(item => item.value > 0);
  }, [stats]);

  // Reset Filters
  const clearFilters = () => {
    setSearch('');
    setSelectedMonth('');
    setAllMonths(true);
    setFromDate('');
    setToDate('');
    setStatusFilter('');
    setAssignedFilter('');
    setSatisfactionFilter('');
    setResolvedFilter('');
    setRepetitionFilter('all');
    setCurrentPage(1);
  };

  // Export to Excel with CSAT summary and rating details
  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();

    const dateStamp = new Date().toISOString().split('T')[0];
    const generatedTime = new Date().toLocaleString();

    // Sheet 1: CSAT & Ratings Summary
    const summaryRows = [
      ['CSAT & RATINGS EXECUTIVE SUMMARY', ''],
      ['Generated On:', generatedTime],
      ['Selected Period / Filter:', allMonths ? 'All Months (Historical)' : selectedMonth || 'Custom Filter'],
      ['', ''],
      ['KEY METRIC', 'COUNT / PERCENTAGE'],
      ['Total Issue Count', stats.total],
      ['Solution Count', stats.closedCount],
      ['Solution Rate', `${stats.closedRate}%`],
      ['Pending / Unresolved Issues', stats.total - stats.closedCount],
      ['', ''],
      ['CUSTOMER SATISFACTION (CSAT)', ''],
      ['Total Feedbacks Collected', stats.feedbackCount],
      ['Feedback Collection Rate', `${stats.feedbackRate}%`],
      ['Overall CSAT Score (% Satisfied)', `${stats.csatScore}%`],
      ['Satisfied Responses', stats.satisfied],
      ['Neutral Responses', stats.neutral],
      ['Dissatisfied Responses', stats.dissatisfied],
      ['', ''],
      ['FEEDBACK RATINGS BREAKDOWN', ''],
      ['Rating 5 - Excellent', `${ratingDetails.cards.find(c => c.rating === 5)?.count || 0} (${ratingDetails.cards.find(c => c.rating === 5)?.percentage || 0}%)`],
      ['Rating 4 - Good', `${ratingDetails.cards.find(c => c.rating === 4)?.count || 0} (${ratingDetails.cards.find(c => c.rating === 4)?.percentage || 0}%)`],
      ['Rating 3 - Average', `${ratingDetails.cards.find(c => c.rating === 3)?.count || 0} (${ratingDetails.cards.find(c => c.rating === 3)?.percentage || 0}%)`],
      ['Rating 2 - Poor', `${ratingDetails.cards.find(c => c.rating === 2)?.count || 0} (${ratingDetails.cards.find(c => c.rating === 2)?.percentage || 0}%)`],
      ['Rating 1 - Very Poor', `${ratingDetails.cards.find(c => c.rating === 1)?.count || 0} (${ratingDetails.cards.find(c => c.rating === 1)?.percentage || 0}%)`],
      ['Pending Feedback', ratingDetails.unratedCount],
      ['', ''],
      ['CLIENT RESOLUTION CONFIRMATION', ''],
      ['Confirmed Rate (% Yes)', `${stats.resolvedRate}%`],
      ['Client Confirmed Resolved (Yes)', stats.resolvedYes],
      ['Client Confirmed Not Resolved (No)', stats.resolvedNo],
      ['No Confirmation Response', stats.resolvedNoResponse]
    ];
    const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
    wsSummary['!cols'] = [{ wch: 45 }, { wch: 30 }];
    XLSX.utils.book_append_sheet(wb, wsSummary, 'CSAT & Ratings Summary');

    // Sheet 2: Rating Details
    const ratingHeaders = [
      'Client Name',
      'Feedback Rating (1-5)',
      'Customer Satisfaction',
      'Called By',
      'Assigned Handler',
      'Status (Solution)',
      'Resolved Confirmed',
      'Issue Date',
      'Feedback Date',
      'Resolution Date',
      'Issue Details'
    ];
    const ratingRows = filteredIssues.map(i => [
      i.client_name || '',
      i.feedback_rating || '',
      i.customer_satisfaction || '',
      i.called_by || '',
      i.assigned_person || '',
      i.status || 'Open',
      i.issue_resolved_confirmed || 'Not Provided',
      i.issue_date || (i.created_at ? i.created_at.split('T')[0] : ''),
      i.feedback_date || '',
      i.resolution_date || '',
      i.issue_details || ''
    ]);
    const wsRatingDetails = XLSX.utils.aoa_to_sheet([ratingHeaders, ...ratingRows]);
    wsRatingDetails['!cols'] = [
      { wch: 28 }, { wch: 22 }, { wch: 22 }, { wch: 20 },
      { wch: 20 }, { wch: 18 }, { wch: 20 }, { wch: 16 }, { wch: 16 },
      { wch: 16 }, { wch: 55 }
    ];
    if (ratingRows.length > 0) {
      wsRatingDetails['!autofilter'] = { ref: `A1:K${ratingRows.length + 1}` };
    }
    XLSX.utils.book_append_sheet(wb, wsRatingDetails, 'Rating Details');

    downloadStyledReport(wb, `CSAT_Report_${dateStamp}.xlsx`);
  };

  return (
    <ModuleWorkspace data-ui="v2" id="CSATReport" number="03" title="CSAT Report" description="Understand customer satisfaction and the people behind every resolution." category="Support intelligence" kind="insights" links={[{"label":"Issue ledger","path":"/issue-reports"}]}><div className="v2-page-content">
      {/* Top Banner & Header */}
      <FilterDesk actions={<><button
              onClick={loadData}
              disabled={loading}
              className="v2-button p-2 text-slate-600 hover:text-indigo-600 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl transition"
              title="Refresh Data"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </button><button
              onClick={handleExportExcel}
              className="v2-button v2-primary px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm hover:shadow transition flex items-center gap-1.5"
            >
              <Download size={15} />
              Export Multi-Sheet Excel
            </button></>}><div className="v2-surface bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm" data-filter-layout="">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
                <Smile size={24} />
              </div>
              <div>
                <h1 className="v2-heading text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  CSAT Report
                </h1>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          
        </div>

        {/* Global Filter Toolbar */}
        <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-2.5" data-filter-group="">
          {/* Month Wise Filter */}
          <div className="flex items-center gap-1.5" data-filter-field="field">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Month:</span>
            <input
              type="month"
              value={allMonths ? '' : selectedMonth}
              disabled={allMonths}
              onChange={(e) => {
                setSelectedMonth(e.target.value);
                setAllMonths(false);
                setCurrentPage(1);
              }}
              className={"v2-control " + (`px-2 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500 ${
                allMonths ? 'opacity-40 cursor-not-allowed' : ''
              }`)}
            />
            <button
              onClick={() => {
                setAllMonths(!allMonths);
                setCurrentPage(1);
              }}
              className={"v2-button " + (`px-2 py-1.5 text-xs font-semibold rounded-lg border transition ${
                allMonths
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-200'
              }`)}
            >
              All Months
            </button>
          </div>

          {/* Date Range */}
          <div className="flex items-center gap-1.5" data-filter-field="range">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Range:</span>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => { setFromDate(e.target.value); setCurrentPage(1); }}
              className="v2-control px-2 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <span className="text-slate-400 text-xs">to</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => { setToDate(e.target.value); setCurrentPage(1); }}
              className="v2-control px-2 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Customer Satisfaction Filter */}
          <div className="flex items-center gap-1.5" data-filter-field="field">
            <span className="text-[10px] font-bold text-slate-400 uppercase">CSAT:</span>
            <select
              value={satisfactionFilter}
              onChange={(e) => { setSatisfactionFilter(e.target.value); setCurrentPage(1); }}
              className="v2-control px-2 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">All CSAT Ratings</option>
              <option value="Satisfied">Satisfied (😊 Excellent / Good)</option>
              <option value="Neutral">Neutral (😐 Average)</option>
              <option value="Dissatisfied">Dissatisfied (😡 Poor / Very Poor)</option>
              <option value="Excellent">5 - Excellent</option>
              <option value="Good">4 - Good</option>
              <option value="Average">3 - Average</option>
              <option value="Poor">2 - Poor</option>
              <option value="Very Poor">1 - Very Poor</option>
              <option value="none">Pending / No Feedback</option>
            </select>
          </div>

          {/* Assigned Person Filter */}
          <div className="flex items-center gap-1.5" data-filter-field="field">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Handler:</span>
            <select
              value={assignedFilter}
              onChange={(e) => { setAssignedFilter(e.target.value); setCurrentPage(1); }}
              className="v2-control px-2 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">All Handlers</option>
              {assignedOptions.map(p => (
                <option key={p.id} value={p.name}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* Clear Filters */}
          {(!allMonths || fromDate || toDate || assignedFilter || satisfactionFilter) && (
            <button
              onClick={clearFilters}
              className="v2-button px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-xs font-bold transition flex items-center gap-1"
            >
              <X size={13} />
              Clear
            </button>
          )}
        </div>
      </div></FilterDesk>

      {/* CORE KPI CARDS: Total Issues, Solution (Status Closed), Customer Satisfaction, Client Confirmed */}
      <div className="v2-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* CARD 1: TOTAL ISSUE COUNT */}
        <div className="v2-surface bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Total Issue Count
            </span>
            <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40">
              <Layers size={18} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900 dark:text-white">
              {stats.total}
            </span>
            <span className="text-xs text-slate-500">tickets logged</span>
          </div>
          <div className="absolute -right-3 -bottom-3 opacity-5 pointer-events-none">
            <Layers size={80} />
          </div>
        </div>

        {/* CARD 2: SOLUTION / STATUS CLOSED COUNT */}
        <div className="v2-surface bg-white dark:bg-slate-900 p-4 rounded-2xl border border-emerald-200 dark:border-emerald-800/60 shadow-sm relative overflow-hidden bg-gradient-to-br from-white to-emerald-50/20 dark:from-slate-900 dark:to-emerald-950/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              Solution (Status Closed)
            </span>
            <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
              <CheckCircle2 size={18} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-emerald-600 dark:text-emerald-400">
              {stats.closedCount}
            </span>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
              {stats.closedRate}% Solved
            </span>
          </div>
          <div className="absolute -right-3 -bottom-3 opacity-5 pointer-events-none">
            <CheckCircle2 size={80} />
          </div>
        </div>

        {/* CARD 3: CUSTOMER SATISFACTION (CSAT SCORE) */}
        <div className="v2-surface bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Customer Satisfaction
            </span>
            <div className={`p-1.5 rounded-lg ${stats.csatScore >= 75 ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40' : stats.csatScore >= 50 ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/40' : 'bg-rose-50 text-rose-600 dark:bg-rose-950/40'}`}>
              <Smile size={18} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900 dark:text-white">
              {stats.csatScore}%
            </span>
            <span className="text-xs text-slate-500">CSAT score</span>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-center gap-1.5">
            <div className="flex-1 bg-emerald-50/70 dark:bg-emerald-950/30 py-1.5 px-1 rounded-lg border border-emerald-100 dark:border-emerald-900/40">
              <div className="text-xs font-black text-emerald-700 dark:text-emerald-400 flex items-center justify-center gap-1">
                <span>😊</span> <span>{stats.satisfied}</span>
              </div>
              <div className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                4 - 5 Point
              </div>
            </div>
            <div className="flex-1 bg-amber-50/70 dark:bg-amber-950/30 py-1.5 px-1 rounded-lg border border-amber-100 dark:border-amber-900/40">
              <div className="text-xs font-black text-amber-700 dark:text-amber-400 flex items-center justify-center gap-1">
                <span>😐</span> <span>{stats.neutral}</span>
              </div>
              <div className="text-[10px] font-bold text-amber-600 dark:text-amber-400 mt-0.5">
                3 Point
              </div>
            </div>
            <div className="flex-1 bg-rose-50/70 dark:bg-rose-950/30 py-1.5 px-1 rounded-lg border border-rose-100 dark:border-rose-900/40">
              <div className="text-xs font-black text-rose-700 dark:text-rose-400 flex items-center justify-center gap-1">
                <span>😡</span> <span>{stats.dissatisfied}</span>
              </div>
              <div className="text-[10px] font-bold text-rose-600 dark:text-rose-400 mt-0.5">
                1 - 2 Point
              </div>
            </div>
          </div>
          <div className="absolute -right-3 -bottom-3 opacity-5 pointer-events-none">
            <Smile size={80} />
          </div>
        </div>

        {/* CARD 4: ISSUE RESOLVED CONFIRMED */}
        <div className="v2-surface bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Client Confirmed
            </span>
            <div className="p-1.5 rounded-lg bg-teal-50 text-teal-600 dark:bg-teal-950/40">
              <Award size={18} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900 dark:text-white">
              {stats.resolvedRate}%
            </span>
            <span className="text-xs text-slate-500">confirmed Yes</span>
          </div>
          <div className="absolute -right-3 -bottom-3 opacity-5 pointer-events-none">
            <Award size={80} />
          </div>
        </div>
      </div>


          {/* Monthly Trend Area Chart: Total Issues vs Solution (Closed) vs CSAT % */}
          <div className="v2-surface bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
              <div>
                <h3 className="v2-heading text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Calendar size={16} className="text-emerald-600" />
                  Monthly Trend: Total Issues vs Solved (Status Closed) vs CSAT Score
                </h3>
                <p className="text-xs text-slate-500">
                  Tracking monthly volume of issues, solved tickets (Status Closed), and customer satisfaction %
                </p>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 self-start sm:self-auto">
                {monthlyTrendData.length} Months Tracked
              </span>
            </div>

            <div className="h-72 w-full">
              {monthlyTrendData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlyTrendData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="totalIssuesGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366F1" stopOpacity={0.25}/>
                        <stop offset="95%" stopColor="#6366F1" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="solvedGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="month" stroke="#94A3B8" fontSize={11} />
                    <YAxis yAxisId="left" stroke="#94A3B8" fontSize={11} />
                    <YAxis yAxisId="right" orientation="right" stroke="#10B981" fontSize={11} domain={[0, 100]} tickFormatter={(val) => `${val}%`} />
                    <Tooltip 
                      formatter={(val: any, name: any) => [
                        name === 'csatScore' ? `${val}%` : val, 
                        name === 'totalIssues' ? 'Total Issues' : name === 'closedCount' ? 'Solved (Status Closed)' : 'CSAT Score %'
                      ]}
                      labelFormatter={(label) => `Month: ${label}`}
                      contentStyle={{ backgroundColor: '#1E293B', borderColor: '#334155', borderRadius: '8px', color: '#FFF' }}
                    />
                    <Legend />
                    <Area yAxisId="left" type="monotone" dataKey="totalIssues" name="Total Issues" stroke="#6366F1" strokeWidth={2} fillOpacity={1} fill="url(#totalIssuesGrad)" />
                    <Area yAxisId="left" type="monotone" dataKey="closedCount" name="Solved (Status Closed)" stroke="#10B981" strokeWidth={2.5} fillOpacity={1} fill="url(#solvedGrad)" />
                    <Area yAxisId="right" type="monotone" dataKey="csatScore" name="CSAT Score %" stroke="#F59E0B" strokeWidth={2.5} fillOpacity={0} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                  No monthly trend data available.
                </div>
              )}
            </div>
          </div>
      {/* SECTION 2: 5 Ratings Cards & Details */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="v2-heading text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Smile size={18} className="text-emerald-500" />
              Customer Feedback Rating Details
            </h2>
            <p className="text-xs text-slate-500">
              Total {ratingDetails.totalRated} rated feedbacks ({ratingDetails.unratedCount} pending) • Click a card or filter button to view individual ticket details
            </p>
          </div>
        </div>

        {/* 5 Rating Cards Grid (5 to 1) */}
        <div className="v2-grid grid grid-cols-2 md:grid-cols-5 gap-3">
          {ratingDetails.cards.map((card) => {
            const isSelected = selectedRatingCard === card.rating;
            return (
              <button
                key={card.rating}
                type="button"
                onClick={() => {
                  setSelectedRatingCard(isSelected ? 'all' : card.rating);
                  setCurrentPage(1);
                }}
                className={"v2-button " + (`p-3.5 rounded-2xl border text-left transition relative overflow-hidden flex flex-col justify-between ${
                  card.bgCard
                } ${
                  isSelected
                    ? 'ring-2 ring-emerald-500 shadow-md'
                    : 'hover:border-slate-400/60 dark:hover:border-slate-600'
                }`)}
              >
                <div className="flex items-center justify-between">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-black border ${card.badgeClass}`}>
                    {card.rating} ★
                  </span>
                  <span className="text-xl">{card.emoji}</span>
                </div>

                <div className="mt-3">
                  <div className="text-sm font-bold text-slate-900 dark:text-white flex items-baseline gap-1">
                    {card.label}
                    
                  </div>
                  <div className="text-[11px] text-slate-500 font-medium mt-0.5">
                    {card.point}
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-200/60 dark:border-slate-700/60 flex items-baseline justify-between">
                  <span className="text-2xl font-black text-slate-900 dark:text-white">
                    {card.count}
                  </span>
                  <span className={`text-xs font-bold ${card.textColor}`}>
                    {card.percentage}%
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Rating Filter Buttons & Ticket Details Table */}
        <div className="v2-surface bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h3 className="v2-heading text-sm font-bold text-slate-900 dark:text-white">
                Rating Tickets Log
              </h3>
              <p className="text-xs text-slate-500">
                Showing {paginatedRatingIssues.length} of {ratingTableIssues.length} tickets {selectedRatingCard !== 'all' ? `(Filtered: Rating ${selectedRatingCard})` : ''}
              </p>
            </div>

            {/* Quick rating filter buttons */}
            <div className="flex items-center flex-wrap gap-1.5">
              <button
                onClick={() => { setSelectedRatingCard('all'); setCurrentPage(1); }}
                className={"v2-button " + (`px-3 py-1 rounded-xl text-xs font-bold transition ${
                  selectedRatingCard === 'all'
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                }`)}
              >
                All ({filteredIssues.length})
              </button>
              {ratingDetails.cards.map((c) => (
                <button
                  key={`btn-${c.rating}`}
                  onClick={() => { setSelectedRatingCard(c.rating); setCurrentPage(1); }}
                  className={"v2-button " + (`px-2.5 py-1 rounded-xl text-xs font-bold transition flex items-center gap-1 ${
                    selectedRatingCard === c.rating
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                  }`)}
                >
                  <span>{c.rating} ★</span>
                  <span className="text-[10px] opacity-80">({c.count})</span>
                </button>
              ))}
              <button
                onClick={() => { setSelectedRatingCard('none'); setCurrentPage(1); }}
                className={"v2-button " + (`px-2.5 py-1 rounded-xl text-xs font-bold transition ${
                  selectedRatingCard === 'none'
                    ? 'bg-slate-700 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                }`)}
              >
                Pending ({ratingDetails.unratedCount})
              </button>
            </div>
          </div>

          <div className="v2-ledger-scroll overflow-x-auto">
            <DataLedger><table className="v2-ledger w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200 dark:border-slate-700">
                  <th className="py-3 px-4">Client Name</th>
                  <th className="py-3 px-4">Issue Details</th>
                  <th className="py-3 px-3 text-center bg-emerald-50/50 dark:bg-emerald-950/20 font-bold text-emerald-700 dark:text-emerald-300">
                    Rating
                  </th>
                  <th className="py-3 px-3 text-center bg-amber-50/50 dark:bg-amber-950/20 font-bold text-amber-700 dark:text-amber-300">
                    Satisfaction
                  </th>
                  <th className="py-3 px-3">Called By</th>
                  <th className="py-3 px-3">Assigned Handler</th>
                  <th className="py-3 px-3 text-center">Solution Status</th>
                  <th className="py-3 px-3 text-center">Resolved Confirmed</th>
                  <th className="py-3 px-3">Feedback Date</th>
                  <th className="py-3 px-3 text-right sticky-action-header">View</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {paginatedRatingIssues.length > 0 ? (
                  paginatedRatingIssues.map((issue) => {
                    const isClosed = isSolvedOrClosed(issue.status);
                    const r = issue.feedback_rating;
                    const sat = issue.customer_satisfaction?.trim();
                    const res = issue.issue_resolved_confirmed?.trim();

                    return (
                      <tr key={issue.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition group">
                        <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                          {issue.client_name || 'Unknown'}
                        </td>
                        <td className="py-3 px-4 max-w-xs truncate text-slate-600 dark:text-slate-300" title={issue.issue_details}>
                          {issue.issue_details}
                        </td>

                        {/* Rating (1-5) Badge */}
                        <td className="py-3 px-3 text-center bg-emerald-50/20 dark:bg-emerald-950/10">
                          {r === 5 ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-700">
                              5 ★
                            </span>
                          ) : r === 4 ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-teal-100 text-teal-800 border border-teal-300 dark:bg-teal-950/60 dark:text-teal-300 dark:border-teal-700">
                              4 ★
                            </span>
                          ) : r === 3 ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-700">
                              3 ★
                            </span>
                          ) : r === 2 ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-orange-100 text-orange-800 border border-orange-300 dark:bg-orange-950/60 dark:text-orange-300 dark:border-orange-700">
                              2 ★
                            </span>
                          ) : r === 1 ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-rose-100 text-rose-800 border border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-700">
                              1 ★
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[11px]">-</span>
                          )}
                        </td>

                        {/* Customer Satisfaction */}
                        <td className="py-3 px-3 text-center bg-amber-50/20 dark:bg-amber-950/10">
                          {sat === 'Excellent' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                              <Smile size={12} /> Excellent
                            </span>
                          ) : sat === 'Good' || sat === 'Satisfied' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                              <Smile size={12} /> {sat === 'Good' ? 'Good' : 'Satisfied'}
                            </span>
                          ) : sat === 'Average' || sat === 'Neutral' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
                              <Meh size={12} /> {sat === 'Average' ? 'Average' : 'Neutral'}
                            </span>
                          ) : sat === 'Poor' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-orange-100 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300">
                              <Frown size={12} /> Poor
                            </span>
                          ) : sat === 'Very Poor' || sat === 'Dissatisfied' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300">
                              <Frown size={12} /> {sat === 'Very Poor' ? 'Very Poor' : 'Dissatisfied'}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[11px]">No Feedback</span>
                          )}
                        </td>

                        {/* Called By */}
                        <td className="py-3 px-3 text-slate-700 dark:text-slate-300 font-medium">
                          {issue.called_by ? (
                            <span className="px-2 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 text-[11px] font-semibold">
                              {issue.called_by}
                            </span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>

                        {/* Assigned Handler */}
                        <td className="py-3 px-3 text-slate-700 dark:text-slate-300 font-medium">
                          {issue.assigned_person || '-'}
                        </td>

                        {/* Status (Solution) Badge */}
                        <td className="py-3 px-3 text-center">
                          {isClosed ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                              <CheckCircle2 size={12} /> Closed
                            </span>
                          ) : (issue.status?.toLowerCase() === 'in progress') ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300">
                              In Progress
                            </span>
                          ) : (issue.status?.toLowerCase() === 'pending') ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-orange-100 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300">
                              Pending
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
                              Open
                            </span>
                          )}
                        </td>

                        {/* Resolved Confirmed */}
                        <td className="py-3 px-3 text-center">
                          {res === 'Yes' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                              <CheckCircle2 size={12} /> Yes
                            </span>
                          ) : res === 'No' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300">
                              <XCircle size={12} /> No
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[11px]">Pending</span>
                          )}
                        </td>

                        {/* Feedback Date */}
                        <td className="py-3 px-3 text-slate-500 text-[11px] whitespace-nowrap">
                          {issue.feedback_date || '-'}
                        </td>

                        {/* Action View */}
                        <td className="py-3 px-3 text-right sticky-action-cell">
                          <button
                            onClick={() => setViewIssueModal(issue)}
                            className="v2-button p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-lg transition"
                            title="View Details"
                          >
                            <Eye size={15} />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={11} className="py-8 text-center text-slate-400 text-xs">
                      No tickets found for selected rating filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table></DataLedger>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="p-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                Page {currentPage} of {totalPages} ({ratingTableIssues.length} total)
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="v2-button px-3 py-1 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                >
                  Previous
                </button>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="v2-button px-3 py-1 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>




      {/* SINGLE ISSUE DETAIL MODAL */}
      {viewIssueModal && (
        <DrawerPortal><div className="v2-overlay fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="v2-surface bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <h3 className="v2-heading font-bold text-sm text-slate-900 dark:text-white">
                  Client: {viewIssueModal.client_name || 'Details'}
                </h3>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  isSolvedOrClosed(viewIssueModal.status)
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                    : 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                }`}>
                  {viewIssueModal.status || 'Open'}
                </span>
              </div>
              <button
                onClick={() => setViewIssueModal(null)}
                className="v2-button p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-slate-400 font-semibold block mb-0.5">Client</span>
                <span className="font-bold text-slate-900 dark:text-white text-sm">{viewIssueModal.client_name}</span>
              </div>

              <div>
                <span className="text-slate-400 font-semibold block mb-0.5">Issue Details</span>
                <p className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 leading-relaxed">
                  {viewIssueModal.issue_details}
                </p>
              </div>

              <div className="v2-grid grid grid-cols-2 gap-3 pt-2">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Solution Status</span>
                  <span className={`font-bold ${isSolvedOrClosed(viewIssueModal.status) ? 'text-emerald-600' : 'text-blue-600'}`}>
                    {viewIssueModal.status || 'Open'} {isSolvedOrClosed(viewIssueModal.status) ? '(Solved)' : '(Pending)'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Customer Satisfaction</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {viewIssueModal.customer_satisfaction || 'No Feedback Recorded'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Issue Resolved Confirmed</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {viewIssueModal.issue_resolved_confirmed || 'No Response'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Feedback Date</span>
                  <span className="text-slate-700 dark:text-slate-300">
                    {viewIssueModal.feedback_date || 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Assigned Handler</span>
                  <span className="text-slate-700 dark:text-slate-300">
                    {viewIssueModal.assigned_person || 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Resolution Date</span>
                  <span className="text-slate-700 dark:text-slate-300">
                    {viewIssueModal.resolution_date || 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Response / Resolution Time</span>
                  <span className="text-slate-700 dark:text-slate-300">
                    {viewIssueModal.response_time || '-'} / {viewIssueModal.resolution_time || '-'}
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                onClick={() => setViewIssueModal(null)}
                className="v2-button v2-primary px-4 py-1.5 text-xs font-bold text-white bg-slate-800 hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 rounded-xl transition"
              >
                Close
              </button>
            </div>
          </div>
        </div></DrawerPortal>
      )}
    </div></ModuleWorkspace>
  );
};

export default CSATReport;
