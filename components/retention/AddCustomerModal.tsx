import { DrawerPortal } from '../common/DrawerPortal';
import React, { useState } from 'react';
import { X, UserPlus, Building2, Phone, Mail, CreditCard, UserCheck, FileText } from 'lucide-react';
import { TeamSpecialist, PackageType, BillingCadence, CustomerHealth } from '../../types/retention';
import { retentionService } from '../../services/retentionService';

interface AddCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  specialists: TeamSpecialist[];
}

export const AddCustomerModal: React.FC<AddCustomerModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  specialists,
}) => {
  const [name, setName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [pkg, setPkg] = useState<PackageType>('Professional');
  const [billingCadence, setBillingCadence] = useState<BillingCadence>('Monthly');
  const [mrr, setMrr] = useState('25000');
  const [health, setHealth] = useState<CustomerHealth>('Healthy');
  const [assignedToId, setAssignedToId] = useState(specialists[0]?.id || 'spec-1');
  const [notes, setNotes] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Company Name is required.');
      return;
    }

    const assignedSpecialist = specialists.find(s => s.id === assignedToId);

    retentionService.saveCustomer({
      name: name.trim(),
      contact_person: contactPerson.trim(),
      phone: phone.trim(),
      email: email.trim(),
      package: pkg,
      billing_cadence: billingCadence,
      mrr: Number(mrr) || 0,
      health: health,
      assigned_to: assignedSpecialist?.name || 'Fuad Hasan',
      assigned_to_id: assignedSpecialist?.id || 'spec-1',
      notes: notes.trim(),
    });

    onSuccess();
    onClose();
  };

  return (
    <DrawerPortal><div className="v2-overlay fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="v2-surface bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-xl overflow-hidden my-6">
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600 rounded-lg text-white">
              <UserPlus size={20} />
            </div>
            <div>
              <h3 className="v2-heading font-bold text-base">Add New Portfolio Customer</h3>
              <p className="text-xs text-slate-300">Enter customer details, plan, and initial status</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="v2-button v2-primary p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="v2-form p-6 space-y-4">
          <div>
            <label className="v2-label block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Company / Client Name *
            </label>
            <div className="relative">
              <Building2 size={16} className="absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Meghna Logistics Ltd"
                className="v2-control w-full pl-9 pr-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden text-slate-900 dark:text-white font-medium"
                required
              />
            </div>
          </div>

          <div className="v2-grid grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="v2-label block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Contact Person *
              </label>
              <input
                type="text"
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
                placeholder="e.g. Asif Mahmud"
                className="v2-control w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden text-slate-900 dark:text-white"
                required
              />
            </div>

            <div>
              <label className="v2-label block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Phone Number *
              </label>
              <div className="relative">
                <Phone size={15} className="absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+880 1711-..."
                  className="v2-control w-full pl-9 pr-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden text-slate-900 dark:text-white"
                  required
                />
              </div>
            </div>
          </div>

          <div className="v2-grid grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="v2-label block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail size={15} className="absolute left-3 top-3 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="contact@company.com"
                  className="v2-control w-full pl-9 pr-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="v2-label block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Monthly MRR (BDT) *
              </label>
              <input
                type="number"
                min="0"
                step="500"
                value={mrr}
                onChange={(e) => setMrr(e.target.value)}
                className="v2-control w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden text-slate-900 dark:text-white font-semibold text-emerald-600 dark:text-emerald-400"
                required
              />
            </div>
          </div>

          <div className="v2-grid grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="v2-label block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Package Tier
              </label>
              <select
                value={pkg}
                onChange={(e) => setPkg(e.target.value as PackageType)}
                className="v2-control w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden text-slate-900 dark:text-white"
              >
                <option value="Starter" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Starter</option>
                <option value="Professional" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Professional</option>
                <option value="Enterprise" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Enterprise</option>
              </select>
            </div>

            <div>
              <label className="v2-label block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Billing Cadence
              </label>
              <select
                value={billingCadence}
                onChange={(e) => setBillingCadence(e.target.value as BillingCadence)}
                className="v2-control w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden text-slate-900 dark:text-white"
              >
                <option value="Monthly" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Monthly</option>
                <option value="Yearly" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Yearly</option>
              </select>
            </div>

            <div>
              <label className="v2-label block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Initial Health
              </label>
              <select
                value={health}
                onChange={(e) => setHealth(e.target.value as CustomerHealth)}
                className="v2-control w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden text-slate-900 dark:text-white"
              >
                <option value="Healthy" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Healthy (Optimal)</option>
                <option value="Normal" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Normal (Stable)</option>
                <option value="At Risk" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">At Risk (Urgent)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="v2-label block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Assign Retention Specialist
            </label>
            <select
              value={assignedToId}
              onChange={(e) => setAssignedToId(e.target.value)}
              className="v2-control w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden text-slate-900 dark:text-white"
            >
              {specialists.map((s) => (
                <option key={s.id} value={s.id} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                  {s.name} ({s.role}) - Quota: {s.quota_capacity}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="v2-label block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Initial Notes
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Customer background, contract terms, or special requirements..."
              className="v2-control w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden text-slate-900 dark:text-white resize-none"
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
              className="v2-button v2-primary px-5 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
            >
              <UserPlus size={16} />
              Save Customer
            </button>
          </div>
        </form>
      </div>
    </div></DrawerPortal>
  );
};
