import { DrawerPortal } from '../common/DrawerPortal';
import React, { useState } from 'react';
import { 
  X, 
  Building2, 
  Phone, 
  Mail, 
  Calendar, 
  CreditCard, 
  UserCheck, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  PhoneCall, 
  MessageSquare,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';
import { RetentionCustomer, FollowupCall, CustomerFeedbackItem } from '../../types/retention';
import { retentionService } from '../../services/retentionService';

interface CustomerProfileModalProps {
  customer: RetentionCustomer | null;
  onClose: () => void;
  onOpenLogCall: (cust: RetentionCustomer) => void;
  onOpenChurnModal: (cust: RetentionCustomer) => void;
  onDataRefresh: () => void;
}

export const CustomerProfileModal: React.FC<CustomerProfileModalProps> = ({
  customer,
  onClose,
  onOpenLogCall,
  onOpenChurnModal,
  onDataRefresh,
}) => {
  if (!customer) return null;

  const [activeTab, setActiveTab] = useState<'timeline' | 'details'>('timeline');
  const allCalls = retentionService.getCalls().filter(c => c.customer_id === customer.id);
  const allFeedbacks = retentionService.getFeedbacks().filter(f => f.customer_id === customer.id);

  // Combine into unified timeline
  const timelineEvents = [
    ...allCalls.map(c => ({
      type: 'call' as const,
      date: c.call_date,
      title: `Call logged by ${c.specialist_name}`,
      outcome: c.outcome,
      duration: c.duration_minutes,
      notes: c.notes,
      next_date: c.next_followup_date,
      rawDate: new Date(c.call_date).getTime()
    })),
    ...allFeedbacks.map(f => ({
      type: 'feedback' as const,
      date: f.created_at.split('T')[0],
      title: `Feedback: ${f.category} (${f.sentiment})`,
      outcome: `Rating: ${f.score}/5`,
      duration: 0,
      notes: f.feedback_text,
      next_date: f.action_plan ? `Plan: ${f.action_plan}` : undefined,
      rawDate: new Date(f.created_at).getTime()
    }))
  ].sort((a, b) => b.rawDate - a.rawDate);

  const getHealthBadge = (health: RetentionCustomer['health']) => {
    switch (health) {
      case 'Healthy':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800"><CheckCircle size={13} /> Healthy</span>;
      case 'Normal':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800"><Clock size={13} /> Normal</span>;
      case 'At Risk':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300 dark:border-rose-800 animate-pulse"><AlertTriangle size={13} /> At Risk</span>;
      case 'Churned':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-400 border border-slate-300 dark:border-slate-700 line-through"><ShieldAlert size={13} /> Churned</span>;
    }
  };

  const handleChangeHealth = (newHealth: RetentionCustomer['health']) => {
    retentionService.updateCustomerHealth(customer.id, newHealth);
    onDataRefresh();
  };

  return (
    <DrawerPortal><div className="v2-overlay fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="v2-surface bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-3xl overflow-hidden my-6">
        {/* Header Profile Bar */}
        <div className="px-6 py-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-start justify-between">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold text-xl shadow-lg border border-indigo-400/30">
              {customer.name.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="v2-heading font-bold text-xl tracking-tight text-white">{customer.name}</h3>
                <span className="text-xs px-2 py-0.5 rounded-sm bg-slate-800 text-slate-300 font-mono border border-slate-700">
                  {customer.code}
                </span>
                {getHealthBadge(customer.health)}
              </div>
              <p className="text-xs text-slate-300 mt-1 flex items-center gap-3 flex-wrap">
                <span className="flex items-center gap-1"><UserCheck size={13} className="text-indigo-400" /> Specialist: <strong>{customer.assigned_to}</strong></span>
                <span className="flex items-center gap-1"><CreditCard size={13} className="text-emerald-400" /> Package: <strong>{customer.package}</strong> ({customer.billing_cadence})</span>
                <span className="flex items-center gap-1"><Calendar size={13} className="text-slate-400" /> Since: {customer.onboarding_date}</span>
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="v2-button v2-primary p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Quick Highlights Bar */}
        <div className="v2-grid grid grid-cols-2 sm:grid-cols-4 divide-x divide-slate-100 dark:divide-slate-800 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 px-4 py-3">
          <div className="px-3">
            <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider">Monthly MRR</span>
            <p className="text-base font-bold text-emerald-600 dark:text-emerald-400">BDT {customer.mrr.toLocaleString()}</p>
          </div>
          <div className="px-3">
            <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider">Contact Person</span>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">{customer.contact_person}</p>
          </div>
          <div className="px-3">
            <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider">Phone</span>
            <p className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate">{customer.phone}</p>
          </div>
          <div className="px-3">
            <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider">Last Contact</span>
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">{customer.last_contact_date || 'No call recorded'}</p>
          </div>
        </div>

        {/* Risk Banner if At Risk */}
        {customer.health === 'At Risk' && (
          <div className="mx-6 mt-4 p-3.5 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 rounded-xl flex items-start gap-3">
            <AlertTriangle size={20} className="text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="v2-heading text-xs font-bold text-rose-800 dark:text-rose-300 uppercase tracking-wide">
                Urgent Risk Flag Identified
              </h4>
              <p className="text-sm text-rose-700 dark:text-rose-200 mt-0.5">
                {customer.risk_reason || 'Customer has reported issues or delayed payments that put this account at churn risk.'}
              </p>
            </div>
            <button
              onClick={() => {
                onClose();
                onOpenLogCall(customer);
              }}
              className="v2-button v2-primary px-3 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shrink-0 shadow-xs transition-colors flex items-center gap-1"
            >
              <PhoneCall size={13} />
              Call Now
            </button>
          </div>
        )}

        {/* Tab Controls */}
        <div className="px-6 pt-4 flex items-center justify-between border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setActiveTab('timeline')}
              className={"v2-button " + (`pb-2.5 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
                activeTab === 'timeline'
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
              }`)}
            >
              <Clock size={16} />
              Communication Timeline ({timelineEvents.length})
            </button>
            <button
              onClick={() => setActiveTab('details')}
              className={"v2-button " + (`pb-2.5 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
                activeTab === 'details'
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
              }`)}
            >
              <Building2 size={16} />
              Account Details & Notes
            </button>
          </div>

          {/* Quick Health Selector */}
          <div className="flex items-center gap-1.5 pb-2">
            <span className="text-xs text-slate-400 font-medium">Health:</span>
            <select
              value={customer.health}
              onChange={(e) => handleChangeHealth(e.target.value as any)}
              className="v2-control text-xs font-semibold px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden"
            >
              <option value="Healthy">Healthy</option>
              <option value="Normal">Normal</option>
              <option value="At Risk">At Risk</option>
              <option value="Churned">Churned</option>
            </select>
          </div>
        </div>

        {/* Body Content */}
        <div className="p-6 max-h-[380px] overflow-y-auto">
          {activeTab === 'timeline' ? (
            timelineEvents.length === 0 ? (
              <div className="text-center py-10">
                <Clock className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                <p className="text-sm text-slate-500 dark:text-slate-400">No interaction records found yet.</p>
                <button
                  onClick={() => {
                    onClose();
                    onOpenLogCall(customer);
                  }}
                  className="v2-button mt-3 px-4 py-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 rounded-lg hover:bg-indigo-100 transition-colors"
                >
                  + Log First Call
                </button>
              </div>
            ) : (
              <div className="relative pl-6 space-y-5 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
                {timelineEvents.map((evt, idx) => (
                  <div key={idx} className="relative group">
                    <div className="v2-surface absolute -left-6 top-1 w-5 h-5 rounded-full bg-white dark:bg-slate-900 border-2 border-indigo-600 flex items-center justify-center">
                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
                    </div>
                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                          {evt.type === 'call' ? <PhoneCall size={13} className="text-indigo-500" /> : <MessageSquare size={13} className="text-emerald-500" />}
                          {evt.title}
                        </span>
                        <span className="text-slate-400 font-mono text-[11px]">{evt.date}</span>
                      </div>
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-sm bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300">
                          {evt.outcome}
                        </span>
                        {evt.duration > 0 && (
                          <span className="text-[11px] text-slate-400">Duration: {evt.duration} mins</span>
                        )}
                      </div>
                      <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed bg-white dark:bg-slate-900/50 p-2 rounded-md border border-slate-100 dark:border-slate-800">
                        {evt.notes}
                      </p>
                      {evt.next_date && (
                        <p className="text-[11px] text-indigo-600 dark:text-indigo-400 mt-2 font-medium">
                          Next Action: {evt.next_date}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            <div className="space-y-4 text-xs">
              <div className="v2-grid grid grid-cols-2 gap-4">
                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <span className="text-slate-400 font-medium block mb-1">Email Address</span>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">{customer.email || 'N/A'}</p>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <span className="text-slate-400 font-medium block mb-1">Phone Number</span>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">{customer.phone || 'N/A'}</p>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <span className="text-slate-400 font-medium block mb-1">Package & Tier</span>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">{customer.package} (Billed {customer.billing_cadence})</p>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <span className="text-slate-400 font-medium block mb-1">Monthly Recurring Revenue</span>
                  <p className="font-semibold text-emerald-600 dark:text-emerald-400 text-sm">BDT {customer.mrr.toLocaleString()} / mo</p>
                </div>
              </div>

              <div className="p-3.5 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <span className="text-slate-400 font-medium block mb-1">Relationship Notes</span>
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                  {customer.notes || 'No general notes entered for this customer yet.'}
                </p>
              </div>

              {customer.churn_reason && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/30 rounded-lg border border-rose-200 dark:border-rose-900/50">
                  <span className="text-rose-500 font-bold block mb-1">Churn Reason</span>
                  <p className="text-rose-700 dark:text-rose-300 font-semibold">{customer.churn_reason} (Date: {customer.churned_date})</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            {customer.health !== 'Churned' && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenChurnModal(customer);
                }}
                className="v2-button text-xs font-semibold text-rose-600 hover:text-rose-700 hover:underline flex items-center gap-1"
              >
                <ShieldAlert size={14} />
                Mark as Churned
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="v2-button px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              Close
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenLogCall(customer);
              }}
              className="v2-button v2-primary px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
            >
              <PhoneCall size={14} />
              Log Follow-up Call
            </button>
          </div>
        </div>
      </div>
    </div></DrawerPortal>
  );
};
