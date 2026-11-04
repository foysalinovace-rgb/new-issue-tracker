import { DataLedger, FilterDesk } from '../common/DataLedger';
import { ModuleWorkspace } from '../common/ModuleWorkspace';
import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  Plus, 
  Download, 
  PhoneCall, 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  ShieldAlert, 
  MoreHorizontal,
  ChevronDown,
  Building2,
  Calendar,
  CreditCard,
  UserCheck
} from 'lucide-react';
import { RetentionHeader } from './RetentionHeader';
import { LogCallModal } from './LogCallModal';
import { AddCustomerModal } from './AddCustomerModal';
import { CustomerProfileModal } from './CustomerProfileModal';
import { ChurnModal } from './ChurnModal';
import { retentionService } from '../../services/retentionService';
import { RetentionCustomer, TeamSpecialist, CustomerHealth, PackageType, BillingCadence } from '../../types/retention';

export const RetentionCustomers: React.FC = () => {
  const [customers, setCustomers] = useState<RetentionCustomer[]>([]);
  const [specialists, setSpecialists] = useState<TeamSpecialist[]>([]);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPackage, setSelectedPackage] = useState<string>('all');
  const [selectedBilling, setSelectedBilling] = useState<string>('all');
  const [selectedSpecialist, setSelectedSpecialist] = useState<string>('all');
  const [selectedHealth, setSelectedHealth] = useState<string>('all');

  // Modals
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

  // Filter logic
  const filteredCustomers = customers.filter(c => {
    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = c.name.toLowerCase().includes(q);
      const matchCode = c.code.toLowerCase().includes(q);
      const matchContact = c.contact_person.toLowerCase().includes(q);
      const matchPhone = c.phone.toLowerCase().includes(q);
      if (!matchName && !matchCode && !matchContact && !matchPhone) return false;
    }

    // Package filter
    if (selectedPackage !== 'all' && c.package !== selectedPackage) return false;

    // Billing filter
    if (selectedBilling !== 'all' && c.billing_cadence !== selectedBilling) return false;

    // Specialist filter
    if (selectedSpecialist !== 'all' && c.assigned_to_id !== selectedSpecialist && c.assigned_to !== selectedSpecialist) return false;

    // Health filter
    if (selectedHealth !== 'all' && c.health !== selectedHealth) return false;

    return true;
  });

  const handleOpenCall = (cust: RetentionCustomer, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedCustForCall(cust);
    setIsLogCallOpen(true);
  };

  const handleOpenChurn = (cust: RetentionCustomer, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setChurnCustomer(cust);
  };

  return (
    <ModuleWorkspace data-ui="v2" id="RetentionCustomers" number="17" title="Customer directory" description="A living view of your accounts, contacts and relationship health." category="Customer success" kind="directory" links={[{"label":"Assign accounts","path":"/retention/assignment"}]}><div className="v2-page-content">
      <RetentionHeader 
        onOpenLogCall={() => {
          setSelectedCustForCall(null);
          setIsLogCallOpen(true);
        }}
        onOpenAddCustomer={() => setIsAddCustOpen(true)}
      />

      {/* Advanced Search & Filtering Bar */}
      <FilterDesk><div className="v2-surface bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3" data-filter-layout="">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3" data-filter-group="">
          {/* Search Input */}
          <div data-filter-field="search"><span className="filter-field-label">Search</span><div className="relative w-full md:w-96" data-filter-input-wrap="">
            <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search company, contact person, ID or phone..."
              className="v2-control w-full pl-9 pr-4 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden text-slate-900 dark:text-white"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="v2-button absolute right-3 top-2.5 text-xs text-slate-400 hover:text-slate-600"
              >
                Clear
              </button>
            )}
          </div></div>

          {/* Quick Counter */}
          <div className="flex items-center gap-2 self-start md:self-auto text-xs text-slate-500 dark:text-slate-400">
            <span>Showing: <strong className="text-slate-800 dark:text-slate-200">{filteredCustomers.length}</strong> of {customers.length} accounts</span>
          </div>
        </div>

        {/* Filter Dropdowns Grid */}
        <div className="v2-grid grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800" data-filter-group="">
          <div data-filter-field="field">
            <label className="v2-label block text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500 mb-1">
              Package Tier
            </label>
            <select
              value={selectedPackage}
              onChange={(e) => setSelectedPackage(e.target.value)}
              className="v2-control w-full text-xs py-1.5 px-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-hidden"
            >
              <option value="all">All Packages</option>
              <option value="Starter">Starter</option>
              <option value="Professional">Professional</option>
              <option value="Enterprise">Enterprise</option>
            </select>
          </div>

          <div data-filter-field="field">
            <label className="v2-label block text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500 mb-1">
              Billing Cadence
            </label>
            <select
              value={selectedBilling}
              onChange={(e) => setSelectedBilling(e.target.value)}
              className="v2-control w-full text-xs py-1.5 px-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-hidden"
            >
              <option value="all">All Billing Cycles</option>
              <option value="Monthly">Monthly</option>
              <option value="Yearly">Yearly</option>
            </select>
          </div>

          <div data-filter-field="field">
            <label className="v2-label block text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500 mb-1">
              Assigned Specialist
            </label>
            <select
              value={selectedSpecialist}
              onChange={(e) => setSelectedSpecialist(e.target.value)}
              className="v2-control w-full text-xs py-1.5 px-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-hidden"
            >
              <option value="all">All Specialists</option>
              {specialists.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div data-filter-field="field">
            <label className="v2-label block text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500 mb-1">
              Health Status
            </label>
            <select
              value={selectedHealth}
              onChange={(e) => setSelectedHealth(e.target.value)}
              className="v2-control w-full text-xs py-1.5 px-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-hidden"
            >
              <option value="all">All Health Statuses</option>
              <option value="Healthy">Healthy (Green)</option>
              <option value="Normal">Normal (Yellow)</option>
              <option value="At Risk">At Risk (Red)</option>
              <option value="Churned">Churned</option>
            </select>
          </div>
        </div>
      </div></FilterDesk>

      {/* Portfolio Table with High-Contrast Health Rows */}
      <div className="v2-surface bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="v2-ledger-scroll overflow-x-auto">
          <DataLedger><table className="v2-ledger w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/80 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <th className="py-3 px-4">Client / Company</th>
                <th className="py-3 px-3">Contact Person</th>
                <th className="py-3 px-3">Package & Billing</th>
                <th className="py-3 px-3">Monthly MRR</th>
                <th className="py-3 px-3">Health Status</th>
                <th className="py-3 px-3">Assigned Specialist</th>
                <th className="py-3 px-3">Last Contact</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No customer accounts match your current filter criteria.
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((cust) => {
                  // High contrast health row border and styling
                  let rowBorderClass = 'border-l-4 border-l-emerald-500 bg-white dark:bg-slate-900';
                  let badge = (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                      <CheckCircle size={12} /> Healthy
                    </span>
                  );

                  if (cust.health === 'Normal') {
                    rowBorderClass = 'border-l-4 border-l-amber-400 bg-white dark:bg-slate-900';
                    badge = (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                        <Clock size={12} /> Normal
                      </span>
                    );
                  } else if (cust.health === 'At Risk') {
                    rowBorderClass = 'border-l-4 border-l-rose-500 bg-rose-50/40 dark:bg-rose-950/20';
                    badge = (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 animate-pulse">
                        <AlertTriangle size={12} /> At Risk
                      </span>
                    );
                  } else if (cust.health === 'Churned') {
                    rowBorderClass = 'border-l-4 border-l-slate-400 bg-slate-50 dark:bg-slate-950/40 opacity-75';
                    badge = (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-400 line-through">
                        <ShieldAlert size={12} /> Churned
                      </span>
                    );
                  }

                  return (
                    <tr
                      key={cust.id}
                      onClick={() => setProfileCustomer(cust)}
                      className={`${rowBorderClass} hover:bg-slate-50/80 dark:hover:bg-slate-800/50 cursor-pointer transition-colors`}
                    >
                      {/* Company Name & ID */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div>
                            <div className="font-bold text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400">
                              {cust.name}
                            </div>
                            <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500">
                              {cust.code}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Contact Person */}
                      <td className="py-3 px-3">
                        <div className="text-slate-800 dark:text-slate-200 font-medium">
                          {cust.contact_person}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {cust.phone}
                        </div>
                      </td>

                      {/* Package & Billing */}
                      <td className="py-3 px-3">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          {cust.package}
                        </span>
                        <span className="text-[10px] text-slate-400 block">
                          Billed {cust.billing_cadence}
                        </span>
                      </td>

                      {/* MRR */}
                      <td className="py-3 px-3">
                        <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                          BDT {cust.mrr.toLocaleString()}
                        </span>
                      </td>

                      {/* Health Status */}
                      <td className="py-3 px-3">
                        {badge}
                      </td>

                      {/* Specialist */}
                      <td className="py-3 px-3">
                        <span className="font-medium text-slate-800 dark:text-slate-200">
                          {cust.assigned_to}
                        </span>
                      </td>

                      {/* Last Contact */}
                      <td className="py-3 px-3 text-slate-500 dark:text-slate-400">
                        {cust.last_contact_date ? (
                          <div>
                            <span>{cust.last_contact_date}</span>
                            {cust.next_followup_date && (
                              <span className="text-[10px] text-indigo-500 block">
                                Next: {cust.next_followup_date}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs italic">Never</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={(e) => handleOpenCall(cust, e)}
                            title="Log Follow-up Call"
                            className="v2-button p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 dark:text-indigo-400 transition-colors"
                          >
                            <PhoneCall size={15} />
                          </button>
                          <button
                            onClick={() => setProfileCustomer(cust)}
                            title="View Customer 360"
                            className="v2-button px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                          >
                            360°
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table></DataLedger>
        </div>
      </div>

      {/* Modals */}
      <LogCallModal
        isOpen={isLogCallOpen}
        onClose={() => setIsLogCallOpen(false)}
        onSuccess={loadData}
        preselectedCustomer={selectedCustForCall}
        customers={customers}
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
        onOpenLogCall={(cust) => handleOpenCall(cust)}
        onOpenChurnModal={(cust) => handleOpenChurn(cust)}
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
