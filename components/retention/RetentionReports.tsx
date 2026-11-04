import { DataLedger, FilterDesk } from '../common/DataLedger';
import { ModuleWorkspace } from '../common/ModuleWorkspace';
import React, { useState, useEffect } from 'react';
import { 
  BarChart2, 
  Download, 
  TrendingUp, 
  PieChart as PieIcon, 
  Layers, 
  Calendar, 
  FileSpreadsheet,
  AlertTriangle,
  ArrowUpRight,
  ShieldAlert
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  Cell,
  PieChart,
  Pie,
  Legend
} from 'recharts';
import { RetentionHeader } from './RetentionHeader';
import { 
  retentionService, 
  INITIAL_COHORT_DATA 
} from '../../services/retentionService';
import { RetentionCustomer, ChurnReason } from '../../types/retention';

export const RetentionReports: React.FC = () => {
  const [customers, setCustomers] = useState<RetentionCustomer[]>([]);

  useEffect(() => {
    setCustomers(retentionService.getCustomers());
  }, []);

  const activeCustomers = customers.filter(c => c.health !== 'Churned');
  const churnedCustomers = customers.filter(c => c.health === 'Churned');

  // Reason breakdown
  const churnReasonsMap: Record<string, number> = {
    'Pricing / Budget': 0,
    'Competitor': 0,
    'Feature Gap': 1, // sample initial
    'Poor Support': 0,
    'Business Closed': 0,
    'Other': 0,
  };

  churnedCustomers.forEach(c => {
    const r = c.churn_reason || 'Other';
    churnReasonsMap[r] = (churnReasonsMap[r] || 0) + 1;
  });

  const churnChartData = Object.keys(churnReasonsMap).map(key => ({
    name: key,
    value: churnReasonsMap[key],
  }));

  const COLORS = ['#258f80', '#f43f5e', '#f59e0b', '#10b981', '#8b5cf6', '#64748b'];

  const getHeatmapColor = (pct: number) => {
    if (pct >= 95) return 'bg-emerald-600 text-white';
    if (pct >= 90) return 'bg-emerald-500 text-white';
    if (pct >= 85) return 'bg-emerald-400 text-slate-900';
    if (pct >= 80) return 'bg-emerald-200 text-emerald-900 dark:bg-emerald-900/60 dark:text-emerald-200';
    if (pct >= 75) return 'bg-amber-200 text-amber-900 dark:bg-amber-900/60 dark:text-amber-200';
    return 'bg-rose-200 text-rose-900 dark:bg-rose-900/60 dark:text-rose-200';
  };

  const handleExport = () => {
    retentionService.exportFullRetentionReport();
  };

  return (
    <ModuleWorkspace data-ui="v2" id="RetentionReports" number="22" title="Retention intelligence" description="Understand portfolio health, outreach and customer lifetime value." category="Customer success" kind="insights" links={[{"label":"Relationship overview","path":"/retention/dashboard"}]}><div className="v2-page-content">
      <RetentionHeader />

      {/* Top High-level Metric Indicators */}
      <div className="v2-grid grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="v2-surface bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Net Revenue Retention (NRR)
          </span>
          <div className="flex items-baseline gap-2 mt-2">
            <h3 className="v2-heading text-3xl font-black text-indigo-600 dark:text-indigo-400">
              108.4%
            </h3>
            <span className="text-xs text-emerald-600 font-semibold flex items-center">
              <ArrowUpRight size={14} /> +3.2% Expansion
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">Expansion MRR outpaces churn contraction</p>
        </div>

        <div className="v2-surface bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Gross Retention Rate (GRR)
          </span>
          <div className="flex items-baseline gap-2 mt-2">
            <h3 className="v2-heading text-3xl font-black text-emerald-600 dark:text-emerald-400">
              96.2%
            </h3>
            <span className="text-xs text-emerald-600 font-semibold">Tier-1 SaaS Level</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">Excludes upsell; pure retention integrity</p>
        </div>

        <div className="v2-surface bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Export Master Report
          </span>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Complete spreadsheet with all 4 sheets: Portfolio, Calls, Feedback, Specialists.
          </p>
          <button
            onClick={handleExport}
            className="v2-button v2-primary mt-3 w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-colors"
          >
            <Download size={15} />
            Download Excel Spreadsheet (.xlsx)
          </button>
        </div>
      </div>

      {/* Cohort Retention Analysis Matrix */}
      <div className="v2-surface bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs p-5 overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h3 className="v2-heading font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
              <Layers size={18} className="text-indigo-600" />
              Monthly Cohort Retention Matrix
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Retention rate heatmap tracking customer cohorts by onboarding month
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400">Legend:</span>
            <span className="px-2 py-0.5 rounded-sm bg-emerald-600 text-white text-[10px] font-bold">&gt;90%</span>
            <span className="px-2 py-0.5 rounded-sm bg-emerald-200 text-emerald-900 text-[10px] font-bold">80-90%</span>
            <span className="px-2 py-0.5 rounded-sm bg-amber-200 text-amber-900 text-[10px] font-bold">75-80%</span>
            <span className="px-2 py-0.5 rounded-sm bg-rose-200 text-rose-900 text-[10px] font-bold">&lt;75%</span>
          </div>
        </div>

        <div className="v2-ledger-scroll overflow-x-auto">
          <DataLedger><table className="v2-ledger w-full text-center text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/80 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <th className="py-2.5 px-3 text-left">Cohort Month</th>
                <th className="py-2.5 px-3">Size</th>
                <th className="py-2.5 px-2">M1</th>
                <th className="py-2.5 px-2">M2</th>
                <th className="py-2.5 px-2">M3</th>
                <th className="py-2.5 px-2">M4</th>
                <th className="py-2.5 px-2">M5</th>
                <th className="py-2.5 px-2">M6</th>
                <th className="py-2.5 px-2">M7</th>
                <th className="py-2.5 px-2">M8</th>
                <th className="py-2.5 px-2">M9</th>
                <th className="py-2.5 px-2">M10</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono text-xs">
              {INITIAL_COHORT_DATA.map((cohort, idx) => (
                <tr key={cohort.cohortMonth} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                  <td className="py-2.5 px-3 text-left font-sans font-bold text-slate-800 dark:text-slate-200">
                    {cohort.cohortMonth}
                  </td>
                  <td className="py-2.5 px-3 font-sans text-slate-500">
                    {cohort.totalCustomers}
                  </td>
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((mIdx) => {
                    const rate = cohort.retentionRates[mIdx];
                    if (rate === undefined) {
                      return <td key={mIdx} className="py-2.5 px-2 text-slate-200 dark:text-slate-800">—</td>;
                    }
                    return (
                      <td key={mIdx} className="py-1 px-1">
                        <div className={`py-1.5 px-1 rounded-sm font-semibold text-[11px] ${getHeatmapColor(rate)}`}>
                          {rate}%
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table></DataLedger>
        </div>
      </div>

      {/* Churn Breakdown by Reason Section */}
      <div className="v2-grid grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Chart */}
        <div className="v2-surface bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs">
          <h3 className="v2-heading font-bold text-base text-slate-900 dark:text-white flex items-center gap-2 mb-2">
            <PieIcon size={18} className="text-rose-500" />
            Churn Breakdown by Root Cause
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
            Proportional analysis of customer departure drivers and primary churn reasons
          </p>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={churnChartData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" className="dark:stroke-slate-800" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={110} />
                <Tooltip />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {churnChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Churned Accounts Listing */}
        <div className="v2-surface bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="v2-heading font-bold text-base text-slate-900 dark:text-white flex items-center gap-2 mb-2">
              <ShieldAlert size={18} className="text-rose-500" />
              Recent Churned Customer Archive
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Archived records and review of discontinued accounts
            </p>

            {churnedCustomers.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                No churned accounts registered yet.
              </div>
            ) : (
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {churnedCustomers.map(c => (
                  <div key={c.id} className="p-3 rounded-lg bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200/80 dark:border-rose-900/40 text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-slate-900 dark:text-white">{c.name}</span>
                      <span className="text-[11px] font-mono text-slate-400">{c.churned_date || 'Recent'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-rose-700 dark:text-rose-300 font-semibold mb-1">
                      <span>Reason: {c.churn_reason || 'Other'}</span>
                      <span>•</span>
                      <span>Lost MRR: BDT {c.mrr.toLocaleString()}</span>
                    </div>
                    {c.risk_reason && (
                      <p className="text-slate-600 dark:text-slate-400 text-[11px]">
                        {c.risk_reason}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 mt-4">
            <button
              onClick={handleExport}
              className="v2-button w-full py-2 px-3 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
            >
              <FileSpreadsheet size={15} /> Export Historical Churn Logs to Excel
            </button>
          </div>
        </div>
      </div>
    </div></ModuleWorkspace>
  );
};

