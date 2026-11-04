import { DrawerPortal } from '../common/DrawerPortal';
import React, { useState } from 'react';
import { X, ShieldAlert, AlertTriangle } from 'lucide-react';
import { RetentionCustomer, ChurnReason } from '../../types/retention';
import { retentionService } from '../../services/retentionService';

interface ChurnModalProps {
  customer: RetentionCustomer | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const ChurnModal: React.FC<ChurnModalProps> = ({
  customer,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [reason, setReason] = useState<ChurnReason>('Pricing / Budget');
  const [notes, setNotes] = useState('');

  if (!isOpen || !customer) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    retentionService.markAsChurned(customer.id, reason, notes);
    onSuccess();
    onClose();
  };

  const reasonList: { value: ChurnReason; label: string; desc: string }[] = [
    { value: 'Pricing / Budget', label: 'Pricing / Budget', desc: 'Price sensitivity or budget constraint' },
    { value: 'Competitor', label: 'Switched to Competitor', desc: 'Migrated to competitor software or service' },
    { value: 'Feature Gap', label: 'Feature Gap / Missing Tech', desc: 'Missing crucial product features or integrations' },
    { value: 'Poor Support', label: 'Support & SLA Dissatisfaction', desc: 'Slow response time or unresolved tickets' },
    { value: 'Business Closed', label: 'Business Closed / Inactive', desc: 'Client discontinued project or closed operations' },
    { value: 'Other', label: 'Other Reasons', desc: 'Miscellaneous or undisclosed circumstances' },
  ];

  return (
    <DrawerPortal><div className="v2-overlay fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="v2-surface bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-lg overflow-hidden my-6">
        <div className="px-6 py-4 bg-rose-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-rose-700/80 rounded-lg text-white">
              <ShieldAlert size={20} />
            </div>
            <div>
              <h3 className="v2-heading font-bold text-base">Mark Customer as Churned</h3>
              <p className="text-xs text-rose-100">Record churn details and root cause analysis</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="v2-button v2-primary p-1 rounded-md text-rose-200 hover:text-white hover:bg-rose-700 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="v2-form p-6 space-y-4">
          <div className="p-3 bg-rose-50 dark:bg-rose-950/30 rounded-xl border border-rose-200 dark:border-rose-900/50">
            <p className="text-xs text-rose-800 dark:text-rose-200">
              Are you sure you want to mark <strong>{customer.name}</strong> ({customer.code}) as churned?
              This will update their health status to <em>Churned</em> and adjust active MRR.
            </p>
          </div>

          <div>
            <label className="v2-label block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
              Primary Reason for Churn *
            </label>
            <div className="space-y-2">
              {reasonList.map((r) => (
                <label 
                  key={r.value}
                  className={"v2-label " + (`flex items-start gap-3 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                    reason === r.value 
                      ? 'border-rose-500 bg-rose-50/50 dark:bg-rose-950/20' 
                      : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`)}
                >
                  <input
                    type="radio"
                    name="churnReason"
                    value={r.value}
                    checked={reason === r.value}
                    onChange={() => setReason(r.value)}
                    className="v2-control mt-1 text-rose-600 focus:ring-rose-500"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">{r.label}</span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">{r.desc}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="v2-label block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Exit Notes
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Summarize exit feedback, discussion with client, or win-back opportunities in future..."
              className="v2-control w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-rose-500 focus:outline-hidden text-slate-900 dark:text-white resize-none"
            />
          </div>

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
              className="v2-button v2-primary px-5 py-2 text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
            >
              <ShieldAlert size={16} />
              Confirm Churn
            </button>
          </div>
        </form>
      </div>
    </div></DrawerPortal>
  );
};
