import { ModuleWorkspace } from '../common/ModuleWorkspace';
import React, { useState, useEffect } from 'react';
import { 
  DollarSign, 
  TrendingDown, 
  HeartHandshake, 
  PhoneCall, 
  AlertTriangle, 
  ArrowUpRight, 
  ArrowDownRight,
  ShieldAlert,
  Calendar,
  User,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Info
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  Area, 
  AreaChart,
  ReferenceLine 
} from 'recharts';
import { RetentionHeader } from './RetentionHeader';
import { LogCallModal } from './LogCallModal';
import { AddCustomerModal } from './AddCustomerModal';
import { CustomerProfileModal } from './CustomerProfileModal';
import { ChurnModal } from './ChurnModal';
import { 
  retentionService, 
  TEN_MONTH_CHURN_TREND 
} from '../../services/retentionService';
import { RetentionCustomer, TeamSpecialist } from '../../types/retention';

export const RetentionDashboard: React.FC = () => {
  const [customers, setCustomers] = useState<RetentionCustomer[]>([]);
  const [specialists, setSpecialists] = useState<TeamSpecialist[]>([]);
  const [isLogCallOpen, setIsLogCallOpen] = useState(false);
  const [isAddCustOpen, setIsAddCustOpen] = useState(false);
  const [selectedCustForCall, setSelectedCustForCall] = useState<RetentionCustomer | null>(null);
  const [profileCustomer, setProfileCustomer] = useState<RetentionCustomer | null>(null);
  const [churnCustomer, setChurnCustomer] = useState<RetentionCustomer | null>(null);

  const loadData = () => {
    setCustomers(retentionService.getCustomers());
    setSpecialists(retentionService.getSpecialists());
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter Active vs Churned
  const activeCustomers = customers.filter(c => c.health !== 'Churned');
  const churnedCustomers = customers.filter(c => c.health === 'Churned');

  // KPI 1: Active Portfolio MRR & ARR
  const activeMRR = activeCustomers.reduce((acc, c) => acc + c.mrr, 0);
  const activeARR = activeMRR * 12;

  // KPI 2: Current Monthly Churn Rate (%)
  const currentChurnRate = 1.4; // 1.4% current month
  const industryStandard = 2.0;

  // KPI 3: Portfolio Health Counters
  const healthyCount = activeCustomers.filter(c => c.health === 'Healthy').length;
  const normalCount = activeCustomers.filter(c => c.health === 'Normal').length;
  const atRiskCount = activeCustomers.filter(c => c.health === 'At Risk').length;

  // KPI 4: Outreach Completion Rate for Current Month
  const allCalls = retentionService.getCalls();
  const currentMonthKey = new Date().toISOString().substring(0, 7); // e.g. 2026-10
  const completedCallsThisMonth = allCalls.filter(
    c => c.scheduled_month === currentMonthKey && c.status === 'Completed'
  ).length;
  const totalTargetCalls = activeCustomers.length || 1;
  const outreachRate = Math.min(100, Math.round((completedCallsThisMonth / totalTargetCalls) * 100));

  // Urgent Attention List: At Risk customers
  const urgentList = activeCustomers.filter(c => c.health === 'At Risk');

  const handleOpenLogCall = (cust?: RetentionCustomer) => {
    setSelectedCustForCall(cust || null);
    setIsLogCallOpen(true);
  };

  return (
    <ModuleWorkspace data-ui="v2" id="RetentionDashboard" number="16" title="Relationship overview" description="Know your portfolio. Prioritize the relationships that need you." category="Customer success" kind="insights" links={[{"label":"Customer directory","path":"/retention/customers"}]}><div className="v2-page-content">
      <RetentionHeader 
        onOpenLogCall={() => handleOpenLogCall()}
        onOpenAddCustomer={() => setIsAddCustOpen(true)}
      />

      {/* Top KPI Cards (4 Cards) */}
      <div className="v2-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Active Portfolio MRR & ARR */}
        <div className="v2-surface bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Active Portfolio MRR
            </span>
            <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
              <DollarSign size={18} />
            </div>
          </div>
          <div className="mt-2">
            <h3 className="v2-heading text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              BDT {activeMRR.toLocaleString()}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center justify-between">
              <span>ARR: <strong>BDT {activeARR.toLocaleString()}</strong></span>
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center">
                <ArrowUpRight size={14} /> +4.2% MoM
              </span>
            </p>
          </div>
        </div>

        {/* Card 2: Current Monthly Churn Rate vs Benchmark */}
        <div className="v2-surface bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Monthly Churn Rate
            </span>
            <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
              <TrendingDown size={18} />
            </div>
          </div>
          <div className="mt-2">
            <div className="flex items-baseline gap-2">
              <h3 className="v2-heading text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                {currentChurnRate}%
              </h3>
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                Safe Zone
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center justify-between">
              <span>Benchmark: {industryStandard}%</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">0.6% Better</span>
            </p>
          </div>
        </div>

        {/* Card 3: Portfolio Health Counter */}
        <div className="v2-surface bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Portfolio Health
            </span>
            <div className="p-2 rounded-lg bg-teal-50 dark:bg-teal-950/50 text-teal-600 dark:text-teal-400">
              <HeartHandshake size={18} />
            </div>
          </div>
          <div className="mt-2">
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-slate-900 dark:text-white">
                {activeCustomers.length}
              </span>
              <span className="text-xs text-slate-400">Total Accounts</span>
            </div>
            <div className="mt-2 flex items-center gap-1.5 text-[11px] font-bold">
              <span className="px-2 py-0.5 rounded-sm bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                {healthyCount} Healthy
              </span>
              <span className="px-2 py-0.5 rounded-sm bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                {normalCount} Normal
              </span>
              <span className="px-2 py-0.5 rounded-sm bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
                {atRiskCount} At Risk
              </span>
            </div>
          </div>
        </div>

        {/* Card 4: Outreach Completion Rate */}
        <div className="v2-surface bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Outreach Completion
            </span>
            <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400">
              <PhoneCall size={18} />
            </div>
          </div>
          <div className="mt-2">
            <div className="flex items-baseline justify-between">
              <h3 className="v2-heading text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                {outreachRate}%
              </h3>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                {completedCallsThisMonth} of {activeCustomers.length} Calls
              </span>
            </div>
            {/* Progress bar */}
            <div className="mt-2.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
              <div 
                className="bg-purple-600 h-2 rounded-full transition-all duration-500" 
                style={{ width: `${outreachRate}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 10-Month Churn Trend Chart with Seasonal Spike Annotations */}
      <div className="v2-surface bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h3 className="v2-heading font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
              10-Month Churn Rate Trend & Seasonal Spike Detection
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Historical 10-month churn fluctuation and seasonal spike detection (March budget, June audit, September contract renewals)
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-xs bg-indigo-500" />
              <span className="text-slate-600 dark:text-slate-300">Monthly Churn %</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-0.5 bg-rose-500 border-dashed" />
              <span className="text-rose-500 font-medium">2.0% Benchmark</span>
            </div>
          </div>
        </div>

        {/* Spike Highlights Cards */}
        <div className="v2-grid grid grid-cols-1 sm:grid-cols-3 gap-2.5 mb-4">
          <div className="p-2.5 rounded-lg bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 text-xs">
            <span className="font-bold text-amber-800 dark:text-amber-300 block mb-0.5">
              ⚡ March Spike: 3.4%
            </span>
            <span className="text-slate-600 dark:text-slate-400 text-[11px]">
              Annual corporate budget closing & fiscal review cutbacks.
            </span>
          </div>
          <div className="p-2.5 rounded-lg bg-rose-50/70 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 text-xs">
            <span className="font-bold text-rose-800 dark:text-rose-300 block mb-0.5">
              🚨 June Spike: 3.8%
            </span>
            <span className="text-slate-600 dark:text-slate-400 text-[11px]">
              Half-year vendor audit & license consolidation period.
            </span>
          </div>
          <div className="p-2.5 rounded-lg bg-purple-50/70 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900/40 text-xs">
            <span className="font-bold text-purple-800 dark:text-purple-300 block mb-0.5">
              🔄 September Spike: 3.2%
            </span>
            <span className="text-slate-600 dark:text-slate-400 text-[11px]">
              End of Q3 contracts; competitor poaching attempts.
            </span>
          </div>
        </div>

        {/* Visual Chart */}
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={TEN_MONTH_CHURN_TREND} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="churnGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#258f80" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#258f80" stopOpacity={0.0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" className="dark:stroke-slate-800" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} domain={[0, 4.5]} tickFormatter={(val) => `${val}%`} />
              <Tooltip 
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-slate-900 text-white p-2.5 rounded-lg text-xs shadow-xl border border-slate-700">
                        <p className="font-bold text-sm mb-1">{data.month} 2026</p>
                        <p className="text-indigo-300">Churn Rate: <strong>{data.rate}%</strong></p>
                        <p className="text-slate-300">Accounts Lost: <strong>{data.accountsLost}</strong></p>
                        {data.spikeNote && (
                          <p className="text-amber-300 text-[11px] mt-1 pt-1 border-t border-slate-800">
                            ⚠ {data.spikeNote}
                          </p>
                        )}
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <ReferenceLine y={2.0} stroke="#f43f5e" strokeDasharray="4 4" strokeWidth={1.5} label={{ value: 'Safe Limit: 2.0%', fill: '#f43f5e', fontSize: 11, position: 'right' }} />
              <Area 
                type="monotone" 
                dataKey="rate" 
                stroke="#16766a" 
                strokeWidth={2.5} 
                fillOpacity={1} 
                fill="url(#churnGradient)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Urgent Attention List */}
      <div className="v2-surface bg-white dark:bg-slate-900 rounded-xl border border-rose-200 dark:border-rose-950/80 shadow-xs overflow-hidden">
        <div className="px-5 py-4 bg-rose-50/60 dark:bg-rose-950/30 border-b border-rose-200 dark:border-rose-900/40 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-rose-600 text-white">
              <AlertTriangle size={18} />
            </div>
            <div>
              <h3 className="v2-heading font-bold text-base text-rose-950 dark:text-rose-200">
                Urgent Attention List
              </h3>
              <p className="text-xs text-rose-700 dark:text-rose-300">
                Customers in 'At Risk' status requiring immediate specialist outreach and resolution
              </p>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-200 dark:bg-rose-900/60 text-rose-900 dark:text-rose-200">
            {urgentList.length} Accounts Require Action
          </span>
        </div>

        {urgentList.length === 0 ? (
          <div className="text-center py-10">
            <ShieldAlert className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Great work! No At-Risk accounts right now.</p>
            <p className="text-xs text-slate-400">All portfolio clients are maintaining healthy or normal engagement.</p>
          </div>
        ) : (
          <div className="divide-y divide-rose-100 dark:divide-rose-950/50">
            {urgentList.map((cust) => (
              <div 
                key={cust.id} 
                className="p-4 sm:p-5 hover:bg-rose-50/30 dark:hover:bg-rose-950/20 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span 
                      onClick={() => setProfileCustomer(cust)}
                      className="font-bold text-sm text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer underline decoration-dotted"
                    >
                      {cust.name}
                    </span>
                    <span className="text-[11px] font-mono px-1.5 py-0.5 rounded-sm bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                      {cust.code}
                    </span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
                      At Risk
                    </span>
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      BDT {cust.mrr.toLocaleString()} / mo ({cust.package})
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-slate-600 dark:text-slate-400 flex-wrap">
                    <span>Contact: <strong className="text-slate-800 dark:text-slate-200">{cust.contact_person}</strong></span>
                    <span>Phone: <strong className="text-slate-800 dark:text-slate-200">{cust.phone}</strong></span>
                    <span>Assigned: <strong className="text-indigo-600 dark:text-indigo-400">{cust.assigned_to}</strong></span>
                    <span>Last Call: <strong>{cust.last_contact_date || 'No recent call'}</strong></span>
                  </div>

                  {cust.risk_reason && (
                    <div className="v2-surface mt-1 p-2 rounded-md bg-white dark:bg-slate-900/70 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-800 dark:text-rose-300">
                      <strong>Risk Trigger:</strong> {cust.risk_reason}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  <button
                    onClick={() => setProfileCustomer(cust)}
                    className="v2-button px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                  >
                    360 View
                  </button>
                  <button
                    onClick={() => handleOpenLogCall(cust)}
                    className="v2-button v2-primary px-3 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
                  >
                    <PhoneCall size={14} />
                    Log Call
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      <LogCallModal
        isOpen={isLogCallOpen}
        onClose={() => setIsLogCallOpen(false)}
        onSuccess={loadData}
        preselectedCustomer={selectedCustForCall}
        customers={activeCustomers}
        specialists={specialists}
      />

      <AddCustomerModal
        isOpen={isAddCustOpen}
        onClose={() => setIsAddCustOpen(false)}
        onSuccess={loadData}
        specialists={specialists}
      />

      <CustomerProfileModal
        customer={profileCustomer}
        onClose={() => setProfileCustomer(null)}
        onOpenLogCall={(cust) => handleOpenLogCall(cust)}
        onOpenChurnModal={(cust) => setChurnCustomer(cust)}
        onDataRefresh={loadData}
      />

      <ChurnModal
        customer={churnCustomer}
        isOpen={!!churnCustomer}
        onClose={() => setChurnCustomer(null)}
        onSuccess={loadData}
      />
    </div></ModuleWorkspace>
  );
};

