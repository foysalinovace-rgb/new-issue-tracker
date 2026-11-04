import { DataLedger, FilterDesk } from '../common/DataLedger';
import { ModuleWorkspace } from '../common/ModuleWorkspace';
import React, { useState, useEffect } from 'react';
import { 
  PhoneCall, 
  Calendar, 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  PhoneOff, 
  HelpCircle, 
  Filter, 
  Search, 
  Plus, 
  ArrowUpRight,
  ShieldCheck,
  Building2,
  UserCheck
} from 'lucide-react';
import { RetentionHeader } from './RetentionHeader';
import { LogCallModal } from './LogCallModal';
import { CustomerProfileModal } from './CustomerProfileModal';
import { retentionService } from '../../services/retentionService';
import { FollowupCall, RetentionCustomer, TeamSpecialist, CallOutcome } from '../../types/retention';

export const MonthlyFollowup: React.FC = () => {
  const [calls, setCalls] = useState<FollowupCall[]>([]);
  const [customers, setCustomers] = useState<RetentionCustomer[]>([]);
  const [specialists, setSpecialists] = useState<TeamSpecialist[]>([]);

  // Filters
  const [selectedMonth, setSelectedMonth] = useState('2026-10');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedOutcome, setSelectedOutcome] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [isLogCallOpen, setIsLogCallOpen] = useState(false);
  const [profileCust, setProfileCust] = useState<RetentionCustomer | null>(null);

  const loadData = () => {
    setCalls(retentionService.getCalls());
    setCustomers(retentionService.getCustomers());
    setSpecialists(retentionService.getSpecialists());
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtered Calls
  const filteredCalls = calls.filter(c => {
    if (selectedMonth && c.scheduled_month !== selectedMonth && !c.call_date.startsWith(selectedMonth)) {
      return false;
    }
    if (selectedStatus !== 'all' && c.status !== selectedStatus) return false;
    if (selectedOutcome !== 'all' && c.outcome !== selectedOutcome) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return c.customer_name.toLowerCase().includes(q) || c.specialist_name.toLowerCase().includes(q) || c.notes.toLowerCase().includes(q);
    }
    return true;
  });

  // Monthly stats
  const totalCallsInMonth = calls.filter(c => c.scheduled_month === selectedMonth || c.call_date.startsWith(selectedMonth)).length;
  const completedInMonth = calls.filter(c => (c.scheduled_month === selectedMonth || c.call_date.startsWith(selectedMonth)) && c.status === 'Completed').length;
  const pendingInMonth = calls.filter(c => (c.scheduled_month === selectedMonth || c.call_date.startsWith(selectedMonth)) && c.status === 'Pending').length;
  const overdueInMonth = calls.filter(c => (c.scheduled_month === selectedMonth || c.call_date.startsWith(selectedMonth)) && c.status === 'Overdue').length;
  const completionRate = totalCallsInMonth > 0 ? Math.round((completedInMonth / totalCallsInMonth) * 100) : 0;

  const getOutcomeBadge = (outcome: CallOutcome) => {
    switch (outcome) {
      case 'Satisfied':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"><CheckCircle size={12} /> Satisfied</span>;
      case 'Issue Raised':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"><AlertTriangle size={12} /> Issue Raised</span>;
      case 'No Answer':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"><PhoneOff size={12} /> No Answer</span>;
      case 'Churn Risk':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300"><AlertTriangle size={12} /> Churn Risk</span>;
      case 'Follow-up Needed':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300"><HelpCircle size={12} /> Follow-up Needed</span>;
    }
  };

  const monthsList = [
    { value: '2026-10', label: 'October 2026 (Current)' },
    { value: '2026-09', label: 'September 2026' },
    { value: '2026-08', label: 'August 2026' },
    { value: '2026-07', label: 'July 2026' },
  ];

  return (
    <ModuleWorkspace data-ui="v2" id="MonthlyFollowup" number="20" title="Outreach planner" description="Plan the next conversation and keep every follow-up moving forward." category="Customer success" kind="ledger" links={[{"label":"Customer directory","path":"/retention/customers"}]}><div className="v2-page-content">
      <RetentionHeader onOpenLogCall={() => setIsLogCallOpen(true)} />

      {/* Month & Summary Metrics */}
      <FilterDesk actions={<><button
            onClick={() => setIsLogCallOpen(true)}
            className="v2-button v2-primary mt-3 w-full py-1.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs transition-colors"
          >
            <PhoneCall size={14} /> Log New Call
          </button></>}><div className="v2-surface bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between" data-filter-layout="">
          <div data-filter-field="field">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Select Outreach Cycle
            </span>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="v2-control w-full text-xs sm:text-sm font-semibold py-2 px-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-hidden"
            >
              {monthsList.map(m => (
                <option key={m.value} value={m.value} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">{m.label}</option>
              ))}
            </select>
          </div>
          
        </div><div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3" data-filter-layout="">
          <div data-filter-field="search"><span className="filter-field-label">Search</span><div className="relative w-full md:w-72" data-filter-input-wrap="">
            <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search customer, specialist or note..."
              className="v2-control w-full pl-9 pr-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-hidden"
            />
          </div></div>

          <div className="flex items-center gap-2 flex-wrap" data-filter-group="">
            <div data-filter-field="field"><span className="filter-field-label">Status</span><select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="v2-control text-xs py-1.5 px-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-hidden"
            >
              <option value="all" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">All Call Statuses</option>
              <option value="Completed" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Completed</option>
              <option value="Pending" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Pending</option>
              <option value="Overdue" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Overdue</option>
              <option value="Rescheduled" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Rescheduled</option>
            </select></div>

            <div data-filter-field="field"><span className="filter-field-label">Call outcome</span><select
              value={selectedOutcome}
              onChange={(e) => setSelectedOutcome(e.target.value)}
              className="v2-control text-xs py-1.5 px-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-hidden"
            >
              <option value="all" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">All Call Outcomes</option>
              <option value="Satisfied" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Satisfied</option>
              <option value="Issue Raised" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Issue Raised</option>
              <option value="No Answer" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">No Answer</option>
              <option value="Churn Risk" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Churn Risk</option>
              <option value="Follow-up Needed" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Follow-up Needed</option>
            </select></div>
          </div>
        </div></FilterDesk><div className="v2-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Month Selector Card */}
        

        {/* Total Scheduled */}
        <div className="v2-surface bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Outreach Targets</span>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
            {totalCallsInMonth}
          </p>
          <span className="text-[11px] text-slate-400">Monthly call queue</span>
        </div>

        {/* Completed */}
        <div className="v2-surface bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Completed Calls</span>
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
            {completedInMonth}
          </p>
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden mt-2">
            <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${completionRate}%` }} />
          </div>
        </div>

        {/* Pending */}
        <div className="v2-surface bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">Pending Outreach</span>
          <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">
            {pendingInMonth}
          </p>
          <span className="text-[11px] text-slate-400">Awaiting call log</span>
        </div>

        {/* Overdue */}
        <div className="v2-surface bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-xs font-semibold text-rose-600 dark:text-rose-400">Overdue / Needs Urgent Call</span>
          <p className="text-2xl font-bold text-rose-600 dark:text-rose-400 mt-1">
            {overdueInMonth}
          </p>
          <span className="text-[11px] text-rose-500 font-medium">Escalation required</span>
        </div>
      </div>

      {/* Filter and Table Card */}
      <div className="v2-surface bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        {/* Filter bar */}
        

        {/* Call Logs Table */}
        <div className="v2-ledger-scroll overflow-x-auto">
          <DataLedger><table className="v2-ledger w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50/80 dark:bg-slate-800/80 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-3">Client Company</th>
                <th className="py-3 px-3">Specialist</th>
                <th className="py-3 px-3">Duration</th>
                <th className="py-3 px-3">Outcome</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-4">Discussion Summary & Notes</th>
                <th className="py-3 px-3">Next Action</th>
                <th className="py-3 px-4 text-right">Quick Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {filteredCalls.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    No follow-up calls found for this period. Click <strong>"Log New Call"</strong> to record one!
                  </td>
                </tr>
              ) : (
                filteredCalls.map((call) => {
                  const linkedCust = customers.find(c => c.id === call.customer_id);
                  return (
                    <tr key={call.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        {call.call_date}
                      </td>
                      <td className="py-3 px-3 font-semibold text-slate-900 dark:text-white">
                        <span
                          onClick={() => linkedCust && setProfileCust(linkedCust)}
                          className="hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer underline decoration-dotted"
                        >
                          {call.customer_name}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-700 dark:text-slate-300">
                        {call.specialist_name}
                      </td>
                      <td className="py-3 px-3 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        {call.duration_minutes} mins
                      </td>
                      <td className="py-3 px-3">
                        {getOutcomeBadge(call.outcome)}
                      </td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          call.status === 'Completed'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : call.status === 'Pending'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                            : call.status === 'Overdue'
                            ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                            : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300'
                        }`}>
                          {call.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-700 dark:text-slate-300 max-w-xs truncate" title={call.notes}>
                        {call.notes}
                      </td>
                      <td className="py-3 px-3 text-indigo-600 dark:text-indigo-400 whitespace-nowrap font-medium">
                        {call.next_followup_date || '—'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <select
                          value={call.status}
                          onChange={(e) => {
                            retentionService.updateCallStatus(call.id, e.target.value as any);
                            loadData();
                          }}
                          className="v2-control text-[11px] py-1 px-1.5 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden"
                        >
                          <option value="Completed" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Completed</option>
                          <option value="Pending" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Pending</option>
                          <option value="Overdue" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Overdue</option>
                          <option value="Rescheduled" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Rescheduled</option>
                        </select>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table></DataLedger>
        </div>
      </div>

      {/* Log Call Modal */}
      <LogCallModal
        isOpen={isLogCallOpen}
        onClose={() => setIsLogCallOpen(false)}
        onSuccess={loadData}
        customers={customers}
        specialists={specialists}
      />

      {/* Customer 360 View */}
      <CustomerProfileModal
        customer={profileCust}
        onClose={() => setProfileCust(null)}
        onOpenLogCall={() => setIsLogCallOpen(true)}
        onOpenChurnModal={() => {}}
        onDataRefresh={loadData}
      />
    </div></ModuleWorkspace>
  );
};
