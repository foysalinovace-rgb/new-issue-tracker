import { DataLedger, FilterDesk } from '../common/DataLedger';
import { ModuleWorkspace } from '../common/ModuleWorkspace';
import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserCheck, 
  ArrowRightLeft, 
  Check, 
  Filter, 
  Building2, 
  Layers, 
  DollarSign, 
  CheckSquare, 
  Square,
  RefreshCw,
  Search
} from 'lucide-react';
import { RetentionHeader } from './RetentionHeader';
import { BulkAssignModal } from './BulkAssignModal';
import { LogCallModal } from './LogCallModal';
import { CustomerProfileModal } from './CustomerProfileModal';
import { retentionService } from '../../services/retentionService';
import { RetentionCustomer, TeamSpecialist } from '../../types/retention';

export const CustomerAssignment: React.FC = () => {
  const [customers, setCustomers] = useState<RetentionCustomer[]>([]);
  const [specialists, setSpecialists] = useState<TeamSpecialist[]>([]);
  const [selectedSpecialistFilter, setSelectedSpecialistFilter] = useState<string | null>(null);
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modals
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [profileCust, setProfileCust] = useState<RetentionCustomer | null>(null);

  const loadData = () => {
    setCustomers(retentionService.getCustomers());
    setSpecialists(retentionService.getSpecialists());
  };

  useEffect(() => {
    loadData();
  }, []);

  const activeCustomers = customers.filter(c => c.health !== 'Churned');
  const totalActiveCount = activeCustomers.length || 1;
  const totalActiveMrr = activeCustomers.reduce((acc, c) => acc + c.mrr, 0) || 1;

  // Filter accounts displayed in table
  const displayedCustomers = activeCustomers.filter(c => {
    if (selectedSpecialistFilter && c.assigned_to_id !== selectedSpecialistFilter && c.assigned_to !== selectedSpecialistFilter) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q) || c.contact_person.toLowerCase().includes(q);
    }
    return true;
  });

  // Checkbox handlers
  const handleToggleSelectAll = () => {
    if (selectedCustomerIds.length === displayedCustomers.length) {
      setSelectedCustomerIds([]);
    } else {
      setSelectedCustomerIds(displayedCustomers.map(c => c.id));
    }
  };

  const handleToggleSelectOne = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedCustomerIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const selectedCustomerObjects = activeCustomers.filter(c => selectedCustomerIds.includes(c.id));

  return (
    <ModuleWorkspace data-ui="v2" id="CustomerAssignment" number="18" title="Portfolio planner" description="Balance account ownership and give every customer the right attention." category="Customer success" kind="directory" links={[{"label":"Meet the team","path":"/retention/team"}]}><div className="v2-page-content">
      <RetentionHeader />

      {/* Intro Description */}
      <div className="v2-surface bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <h2 className="v2-heading text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <UserCheck className="text-indigo-600" size={18} />
          Customer Assignment & Workload Distribution
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Balance specialist capacity, monitor portfolio workload distribution, and reassign accounts in bulk.
        </p>

        {/* Proportional Balance Bar (Visual Distribution Bar) */}
        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            <span>Team Portfolio Workload Distribution</span>
            <span className="text-slate-400 text-[11px] font-normal">{activeCustomers.length} Total Active Accounts</span>
          </div>

          <div className="w-full h-3 rounded-full overflow-hidden flex bg-slate-100 dark:bg-slate-800">
            {specialists.map((spec) => {
              const specCusts = activeCustomers.filter(c => c.assigned_to_id === spec.id || c.assigned_to === spec.name);
              const pct = (specCusts.length / totalActiveCount) * 100;
              if (pct === 0) return null;
              return (
                <div
                  key={spec.id}
                  style={{ width: `${pct}%`, backgroundColor: spec.avatar_color }}
                  title={`${spec.name}: ${specCusts.length} accounts (${Math.round(pct)}%)`}
                  className="h-full transition-all duration-300 hover:opacity-85 cursor-pointer"
                  onClick={() => setSelectedSpecialistFilter(selectedSpecialistFilter === spec.id ? null : spec.id)}
                />
              );
            })}
          </div>

          {/* Color Legend */}
          <div className="flex items-center gap-4 flex-wrap mt-2.5 text-xs">
            {specialists.map(spec => {
              const count = activeCustomers.filter(c => c.assigned_to_id === spec.id || c.assigned_to === spec.name).length;
              const isSelected = selectedSpecialistFilter === spec.id;
              return (
                <button
                  key={spec.id}
                  onClick={() => setSelectedSpecialistFilter(isSelected ? null : spec.id)}
                  className={"v2-button " + (`flex items-center gap-1.5 px-2 py-0.5 rounded-md transition-all ${
                    isSelected ? 'ring-2 ring-indigo-500 bg-indigo-50 dark:bg-indigo-950/60 font-bold' : 'hover:opacity-80'
                  }`)}
                >
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: spec.avatar_color }} />
                  <span className="text-slate-700 dark:text-slate-300">{spec.name}</span>
                  <span className="text-slate-400 font-mono">({count})</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Specialist Workload Cards Grid */}
      <div className="v2-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {specialists.map((spec) => {
          const specCusts = activeCustomers.filter(c => c.assigned_to_id === spec.id || c.assigned_to === spec.name);
          const count = specCusts.length;
          const sharePct = Math.round((count / totalActiveCount) * 100);
          const mrr = specCusts.reduce((acc, curr) => acc + curr.mrr, 0);
          const isSelected = selectedSpecialistFilter === spec.id;
          const isOverloaded = count > spec.quota_capacity;

          return (
            <div
              key={spec.id}
              onClick={() => setSelectedSpecialistFilter(isSelected ? null : spec.id)}
              className={`p-4 rounded-xl border transition-all cursor-pointer relative overflow-hidden bg-white dark:bg-slate-900 ${
                isSelected 
                  ? 'border-indigo-600 shadow-md ring-2 ring-indigo-500/50' 
                  : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-xs'
              }`}
            >
              {/* Header */}
              <div className="flex items-center gap-2.5">
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-xs shadow-xs"
                  style={{ backgroundColor: spec.avatar_color }}
                >
                  {spec.name.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="v2-heading font-bold text-sm text-slate-900 dark:text-white truncate">
                    {spec.name}
                  </h4>
                  <p className="text-[11px] text-slate-400 truncate">{spec.role}</p>
                </div>
              </div>

              {/* Big bold accounts count */}
              <div className="mt-3.5">
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                    {count} <span className="text-xs font-semibold text-slate-400">Accounts</span>
                  </span>
                  <span className="text-xs font-bold px-1.5 py-0.5 rounded-sm bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                    {sharePct}% Share
                  </span>
                </div>
                <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mt-1">
                  BDT {mrr.toLocaleString()} / mo
                </p>
              </div>

              {/* Capacity indicator */}
              <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px]">
                <span className="text-slate-400">Capacity</span>
                <span className={`font-semibold ${isOverloaded ? 'text-rose-500 font-bold' : 'text-slate-600 dark:text-slate-400'}`}>
                  {count} / {spec.quota_capacity} Max
                </span>
              </div>

              {isSelected && (
                <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-indigo-600 ring-2 ring-white dark:ring-slate-900" />
              )}
            </div>
          );
        })}
      </div>

      {/* Customer Workload List & Bulk Action Bar */}
      <div className="v2-surface bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        {/* Table Toolbar */}
        <FilterDesk actions={selectedCustomerIds.length > 0 ? <><span className="filter-selection-count">{selectedCustomerIds.length} selected</span><button
                onClick={() => setIsBulkModalOpen(true)}
                className="v2-button v2-primary inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-xs transition-colors"
              >
                <ArrowRightLeft size={14} />
                Reassign in Bulk
              </button></> : null}><div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3" data-filter-layout="">
          <div className="flex items-center gap-3" data-filter-group="">
            <div data-filter-field="search"><span className="filter-field-label">Search</span><div className="relative w-64" data-filter-input-wrap="">
              <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter by customer name..."
                className="v2-control w-full pl-8 pr-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-hidden text-slate-900 dark:text-white"
              />
            </div></div>

            {selectedSpecialistFilter && (
              <button
                onClick={() => setSelectedSpecialistFilter(null)}
                className="v2-button text-xs px-2.5 py-1 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-semibold border border-indigo-200 dark:border-indigo-800"
              >
                Clear Specialist Filter ✕
              </button>
            )}
          </div>

          {/* Bulk Action Sticky Notice / Button */}
          {selectedCustomerIds.length > 0 && (
            <div className="flex items-center gap-2">
              
              
            </div>
          )}
        </div></FilterDesk>

        {/* Table */}
        <div className="v2-ledger-scroll overflow-x-auto">
          <DataLedger><table className="v2-ledger w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50/80 dark:bg-slate-800/80 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <th className="py-2.5 px-4 w-10">
                  <input
                    type="checkbox"
                    checked={displayedCustomers.length > 0 && selectedCustomerIds.length === displayedCustomers.length}
                    onChange={handleToggleSelectAll}
                    className="v2-control rounded-sm text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                </th>
                <th className="py-2.5 px-3">Client Company</th>
                <th className="py-2.5 px-3">Contact</th>
                <th className="py-2.5 px-3">Package</th>
                <th className="py-2.5 px-3">Monthly MRR</th>
                <th className="py-2.5 px-3">Health</th>
                <th className="py-2.5 px-3">Current Specialist</th>
                <th className="py-2.5 px-4 text-right">Quick Assign</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {displayedCustomers.map((cust) => {
                const isSelected = selectedCustomerIds.includes(cust.id);
                return (
                  <tr
                    key={cust.id}
                    className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors ${
                      isSelected ? 'bg-indigo-50/40 dark:bg-indigo-950/20' : ''
                    }`}
                  >
                    <td className="py-3 px-4">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => handleToggleSelectOne(cust.id, e as any)}
                        className="v2-control rounded-sm text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      />
                    </td>
                    <td className="py-3 px-3">
                      <span 
                        onClick={() => setProfileCust(cust)}
                        className="font-bold text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer"
                      >
                        {cust.name}
                      </span>
                      <span className="text-[10px] text-slate-400 block font-mono">{cust.code}</span>
                    </td>
                    <td className="py-3 px-3 text-slate-700 dark:text-slate-300">
                      {cust.contact_person}
                    </td>
                    <td className="py-3 px-3 text-slate-600 dark:text-slate-400">
                      {cust.package}
                    </td>
                    <td className="py-3 px-3 font-semibold text-emerald-600 dark:text-emerald-400">
                      BDT {cust.mrr.toLocaleString()}
                    </td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        cust.health === 'Healthy' 
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                          : cust.health === 'Normal'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                          : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                      }`}>
                        {cust.health}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-medium text-slate-800 dark:text-slate-200">
                      {cust.assigned_to}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {/* Inline Quick Specialist Switcher */}
                      <select
                        value={cust.assigned_to_id}
                        onChange={(e) => {
                          const target = specialists.find(s => s.id === e.target.value);
                          if (target) {
                            retentionService.bulkAssignCustomers([cust.id], target);
                            loadData();
                          }
                        }}
                        className="v2-control text-xs py-1 px-2 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden"
                      >
                        {specialists.map(s => (
                          <option key={s.id} value={s.id} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">{s.name}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table></DataLedger>
        </div>
      </div>

      {/* Bulk Assign Modal */}
      <BulkAssignModal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        onSuccess={() => {
          setSelectedCustomerIds([]);
          loadData();
        }}
        selectedCustomers={selectedCustomerObjects}
        specialists={specialists}
      />

      {/* Customer 360 view if clicked */}
      <CustomerProfileModal
        customer={profileCust}
        onClose={() => setProfileCust(null)}
        onOpenLogCall={() => {}}
        onOpenChurnModal={() => {}}
        onDataRefresh={loadData}
      />
    </div></ModuleWorkspace>
  );
};
