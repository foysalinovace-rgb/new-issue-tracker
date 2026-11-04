import { DrawerPortal } from '../common/DrawerPortal';
import React, { useState, useEffect } from 'react';
import { X, PhoneCall, Calendar, Clock, User, AlertTriangle, CheckCircle, HelpCircle, PhoneOff } from 'lucide-react';
import { RetentionCustomer, TeamSpecialist, CallOutcome, CustomerHealth } from '../../types/retention';
import { retentionService } from '../../services/retentionService';

interface LogCallModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  preselectedCustomer?: RetentionCustomer | null;
  customers: RetentionCustomer[];
  specialists: TeamSpecialist[];
}

export const LogCallModal: React.FC<LogCallModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  preselectedCustomer,
  customers,
  specialists,
}) => {
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [specialistName, setSpecialistName] = useState('');
  const [callDate, setCallDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [duration, setDuration] = useState('15');
  const [outcome, setOutcome] = useState<CallOutcome>('Satisfied');
  const [notes, setNotes] = useState('');
  const [nextFollowupDate, setNextFollowupDate] = useState('');
  const [updateHealth, setUpdateHealth] = useState<CustomerHealth | ''>('');

  useEffect(() => {
    if (preselectedCustomer) {
      setSelectedCustomerId(preselectedCustomer.id);
      setSpecialistName(preselectedCustomer.assigned_to || (specialists[0]?.name || ''));
      setUpdateHealth(preselectedCustomer.health);
    } else if (customers.length > 0) {
      setSelectedCustomerId(customers[0].id);
      setSpecialistName(customers[0].assigned_to || (specialists[0]?.name || ''));
    }
  }, [preselectedCustomer, customers, specialists, isOpen]);

  if (!isOpen) return null;

  const currentCust = customers.find(c => c.id === selectedCustomerId) || preselectedCustomer;

  const handleOutcomeSelect = (val: CallOutcome) => {
    setOutcome(val);
    if (val === 'Churn Risk') {
      setUpdateHealth('At Risk');
    } else if (val === 'Satisfied' && updateHealth === 'At Risk') {
      setUpdateHealth('Normal');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId) {
      alert('Please select a customer.');
      return;
    }

    retentionService.logCall({
      customer_id: selectedCustomerId,
      customer_name: currentCust?.name || 'Client',
      specialist_name: specialistName || (specialists[0]?.name || 'Fuad Hasan'),
      call_date: callDate,
      duration_minutes: Number(duration) || 10,
      outcome: outcome,
      notes: notes,
      next_followup_date: nextFollowupDate || undefined,
      scheduled_month: callDate.substring(0, 7),
      status: 'Completed',
    });

    if (updateHealth && currentCust && currentCust.health !== updateHealth) {
      retentionService.updateCustomerHealth(
        currentCust.id, 
        updateHealth, 
        outcome === 'Churn Risk' ? notes : undefined
      );
    }

    // Reset fields
    setNotes('');
    setNextFollowupDate('');
    onSuccess();
    onClose();
  };

  const outcomeOptions: { value: CallOutcome; label: string; sub: string; icon: any; color: string }[] = [
    { value: 'Satisfied', label: 'Satisfied', sub: 'Client satisfied', icon: CheckCircle, color: 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' },
    { value: 'Issue Raised', label: 'Issue Raised', sub: 'Issue reported', icon: AlertTriangle, color: 'border-amber-500 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300' },
    { value: 'No Answer', label: 'No Answer', sub: 'No response', icon: PhoneOff, color: 'border-slate-400 bg-slate-50 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
    { value: 'Churn Risk', label: 'Churn Risk', sub: 'High churn risk', icon: AlertTriangle, color: 'border-rose-500 bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300' },
    { value: 'Follow-up Needed', label: 'Follow-up Needed', sub: 'Needs callback', icon: HelpCircle, color: 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300' },
  ];

  return (
    <DrawerPortal><div className="v2-overlay fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="v2-surface bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-xl overflow-hidden my-8">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600 rounded-lg text-white">
              <PhoneCall size={20} />
            </div>
            <div>
              <h3 className="v2-heading font-bold text-base">Log Monthly Follow-up Call</h3>
              <p className="text-xs text-slate-300">Record customer call notes, sentiment, and health</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="v2-button v2-primary p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="v2-form p-6 space-y-4">
          {/* Customer Selection */}
          <div>
            <label className="v2-label block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Select Client
            </label>
            <select
              value={selectedCustomerId}
              onChange={(e) => {
                setSelectedCustomerId(e.target.value);
                const c = customers.find(item => item.id === e.target.value);
                if (c) {
                  setSpecialistName(c.assigned_to);
                  setUpdateHealth(c.health);
                }
              }}
              className="v2-control w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden text-slate-900 dark:text-white"
              required
            >
              {customers.map((c) => (
                <option key={c.id} value={c.id} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                  {c.name} ({c.code}) - {c.health} [{c.package}]
                </option>
              ))}
            </select>
            {currentCust && (
              <div className="mt-1.5 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1">
                <span>Contact: <strong className="text-slate-700 dark:text-slate-200">{currentCust.contact_person}</strong> ({currentCust.phone})</span>
                <span>MRR: <strong className="text-emerald-600 dark:text-emerald-400 font-semibold">BDT {currentCust.mrr.toLocaleString()}</strong></span>
              </div>
            )}
          </div>

          {/* Specialist & Date & Duration */}
          <div className="v2-grid grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="v2-label block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Specialist
              </label>
              <select
                value={specialistName}
                onChange={(e) => setSpecialistName(e.target.value)}
                className="v2-control w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden text-slate-900 dark:text-white"
              >
                {specialists.map((s) => (
                  <option key={s.id} value={s.name} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">{s.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="v2-label block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Call Date
              </label>
              <input
                type="date"
                value={callDate}
                onChange={(e) => setCallDate(e.target.value)}
                className="v2-control w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden text-slate-900 dark:text-white"
                required
              />
            </div>

            <div>
              <label className="v2-label block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Duration (Min)
              </label>
              <input
                type="number"
                min="1"
                max="180"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="v2-control w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden text-slate-900 dark:text-white"
                required
              />
            </div>
          </div>

          {/* Call Outcome Options */}
          <div>
            <label className="v2-label block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
              Call Outcome *
            </label>
            <div className="v2-grid grid grid-cols-2 sm:grid-cols-3 gap-2">
              {outcomeOptions.map((opt) => {
                const Icon = opt.icon;
                const isSelected = outcome === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleOutcomeSelect(opt.value)}
                    className={"v2-button " + (`p-2.5 rounded-lg border text-left transition-all flex flex-col justify-between ${
                      isSelected 
                        ? `${opt.color} ring-2 ring-indigo-500 shadow-xs font-semibold` 
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`)}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <Icon size={14} className="shrink-0" />
                      <span className="text-xs font-medium leading-none">{opt.label}</span>
                    </div>
                    <span className="text-[11px] opacity-80">{opt.sub}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Call Discussion Notes */}
          <div>
            <label className="v2-label block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Discussion Notes *
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Summarize discussion details, feedback, client concerns, or next action items..."
              className="v2-control w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden text-slate-900 dark:text-white resize-none"
              required
            />
          </div>

          {/* Next Followup Date & Health Update */}
          <div className="v2-grid grid grid-cols-1 md:grid-cols-2 gap-3 pt-1 border-t border-slate-200 dark:border-slate-800">
            <div>
              <label className="v2-label block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Next Follow-up Date (Optional)
              </label>
              <input
                type="date"
                value={nextFollowupDate}
                onChange={(e) => setNextFollowupDate(e.target.value)}
                className="v2-control w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="v2-label block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Update Customer Health
              </label>
              <select
                value={updateHealth}
                onChange={(e) => setUpdateHealth(e.target.value as CustomerHealth)}
                className="v2-control w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden text-slate-900 dark:text-white"
              >
                <option value="Healthy" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Healthy (Optimal)</option>
                <option value="Normal" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Normal (Stable)</option>
                <option value="At Risk" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">At Risk (Requires Attention)</option>
              </select>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="v2-button px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="v2-button v2-primary px-5 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
            >
              <PhoneCall size={16} />
              Save Call Log
            </button>
          </div>
        </form>
      </div>
    </div></DrawerPortal>
  );
};
