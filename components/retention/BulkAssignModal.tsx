import { DrawerPortal } from '../common/DrawerPortal';
import React, { useState } from 'react';
import { X, Users, ArrowRight, Check } from 'lucide-react';
import { RetentionCustomer, TeamSpecialist } from '../../types/retention';
import { retentionService } from '../../services/retentionService';

interface BulkAssignModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  selectedCustomers: RetentionCustomer[];
  specialists: TeamSpecialist[];
}

export const BulkAssignModal: React.FC<BulkAssignModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  selectedCustomers,
  specialists,
}) => {
  const [targetSpecialistId, setTargetSpecialistId] = useState(specialists[0]?.id || '');

  if (!isOpen || selectedCustomers.length === 0) return null;

  const targetSpecialist = specialists.find(s => s.id === targetSpecialistId) || specialists[0];
  const totalMrrSelected = selectedCustomers.reduce((acc, c) => acc + c.mrr, 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetSpecialist) return;

    retentionService.bulkAssignCustomers(
      selectedCustomers.map(c => c.id),
      targetSpecialist
    );

    onSuccess();
    onClose();
  };

  return (
    <DrawerPortal><div className="v2-overlay fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="v2-surface bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-lg overflow-hidden my-6">
        <div className="px-6 py-4 bg-indigo-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-700 rounded-lg text-white">
              <Users size={20} />
            </div>
            <div>
              <h3 className="v2-heading font-bold text-base">Bulk Customer Assignment</h3>
              <p className="text-xs text-indigo-100">Reassign selected portfolio accounts in bulk</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="v2-button v2-primary p-1 rounded-md text-indigo-200 hover:text-white hover:bg-indigo-700 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="v2-form p-6 space-y-4">
          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="font-semibold text-slate-700 dark:text-slate-300">Selected Accounts:</span>
              <span className="font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-full">
                {selectedCustomers.length} Customers
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700 dark:text-slate-300">Combined MRR:</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                BDT {totalMrrSelected.toLocaleString()} / mo
              </span>
            </div>
            
            <div className="mt-3 max-h-32 overflow-y-auto space-y-1 text-[11px] pt-2 border-t border-slate-200 dark:border-slate-700">
              {selectedCustomers.map(c => (
                <div key={c.id} className="flex items-center justify-between py-0.5 text-slate-600 dark:text-slate-400">
                  <span className="truncate pr-2 font-medium">{c.name}</span>
                  <span className="text-[10px] text-slate-400 shrink-0">Currently: {c.assigned_to}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="v2-label block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
              Assign All Selected To Specialist *
            </label>
            <div className="space-y-2">
              {specialists.map((s) => (
                <label 
                  key={s.id}
                  className={"v2-label " + (`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                    targetSpecialistId === s.id 
                      ? 'border-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/30 ring-2 ring-indigo-500' 
                      : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                  }`)}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="targetSpecialist"
                      value={s.id}
                      checked={targetSpecialistId === s.id}
                      onChange={() => setTargetSpecialistId(s.id)}
                      className="v2-control text-indigo-600 focus:ring-indigo-500"
                    />
                    <div 
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-xs"
                      style={{ backgroundColor: s.avatar_color }}
                    >
                      {s.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-white leading-tight">{s.name}</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">{s.role}</p>
                    </div>
                  </div>
                  <div className="text-right text-xs">
                    <span className="text-slate-400 text-[10px] block">Quota</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">{s.quota_capacity} Max</span>
                  </div>
                </label>
              ))}
            </div>
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
              className="v2-button v2-primary px-5 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
            >
              <Check size={16} />
              Reassign ({selectedCustomers.length}) Accounts
            </button>
          </div>
        </form>
      </div>
    </div></DrawerPortal>
  );
};
