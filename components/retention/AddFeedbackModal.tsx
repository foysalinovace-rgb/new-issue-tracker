import { DrawerPortal } from '../common/DrawerPortal';
import React, { useState } from 'react';
import { X, MessageSquarePlus, Star, Check } from 'lucide-react';
import { RetentionCustomer, FeedbackCategory, FeedbackSentiment, FeedbackStatus } from '../../types/retention';
import { retentionService } from '../../services/retentionService';

interface AddFeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  customers: RetentionCustomer[];
  preselectedCustomer?: RetentionCustomer | null;
}

export const AddFeedbackModal: React.FC<AddFeedbackModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  customers,
  preselectedCustomer,
}) => {
  const [customerId, setCustomerId] = useState(preselectedCustomer?.id || customers[0]?.id || '');
  const [score, setScore] = useState(4);
  const [category, setCategory] = useState<FeedbackCategory>('Product Feature');
  const [sentiment, setSentiment] = useState<FeedbackSentiment>('Positive');
  const [feedbackText, setFeedbackText] = useState('');
  const [actionPlan, setActionPlan] = useState('');
  const [status, setStatus] = useState<FeedbackStatus>('Open');

  if (!isOpen) return null;

  const currentCust = customers.find(c => c.id === customerId) || preselectedCustomer;

  const handleScoreChange = (newScore: number) => {
    setScore(newScore);
    if (newScore >= 4) setSentiment('Positive');
    else if (newScore === 3) setSentiment('Neutral');
    else setSentiment('Negative');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackText.trim()) {
      alert('Please provide feedback content.');
      return;
    }

    retentionService.saveFeedback({
      customer_id: customerId,
      customer_name: currentCust?.name || 'Client',
      score: score,
      category: category,
      sentiment: sentiment,
      feedback_text: feedbackText.trim(),
      action_plan: actionPlan.trim(),
      status: status,
      logged_by: currentCust?.assigned_to || 'Retention Specialist',
    });

    onSuccess();
    onClose();
  };

  const categories: { value: FeedbackCategory; label: string }[] = [
    { value: 'Product Feature', label: 'Product Feature Request' },
    { value: 'Support Speed', label: 'Support Responsiveness & SLA' },
    { value: 'Pricing', label: 'Pricing & Billing' },
    { value: 'System Bug', label: 'System Bug / Downtime' },
    { value: 'Usability', label: 'Usability & UI Experience' },
  ];

  return (
    <DrawerPortal><div className="v2-overlay fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="v2-surface bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-lg overflow-hidden my-6">
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600 rounded-lg text-white">
              <MessageSquarePlus size={20} />
            </div>
            <div>
              <h3 className="v2-heading font-bold text-base">Record Customer Feedback & CSAT</h3>
              <p className="text-xs text-slate-300">Collect client satisfaction ratings and actionable suggestions</p>
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
              Select Client *
            </label>
            <select
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              className="v2-control w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden text-slate-900 dark:text-white"
              required
            >
              {customers.map((c) => (
                <option key={c.id} value={c.id} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">{c.name} ({c.code})</option>
              ))}
            </select>
          </div>

          {/* Star Rating */}
          <div>
            <label className="v2-label block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
              Customer Satisfaction Score (CSAT / NPS)
            </label>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => handleScoreChange(star)}
                  className="v2-button p-1 transition-transform hover:scale-110 focus:outline-hidden"
                >
                  <Star
                    size={28}
                    className={
                      star <= score 
                        ? 'fill-amber-400 text-amber-400' 
                        : 'text-slate-300 dark:text-slate-600'
                    }
                  />
                </button>
              ))}
              <span className="ml-2 text-sm font-bold text-slate-700 dark:text-slate-200">
                {score} / 5 Stars
              </span>
            </div>
          </div>

          <div className="v2-grid grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="v2-label block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Feedback Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as FeedbackCategory)}
                className="v2-control w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden text-slate-900 dark:text-white"
              >
                {categories.map((cat) => (
                  <option key={cat.value} value={cat.value} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">{cat.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="v2-label block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Sentiment Tag
              </label>
              <div className="flex items-center gap-2 pt-1">
                {(['Positive', 'Neutral', 'Negative'] as FeedbackSentiment[]).map((sent) => (
                  <button
                    key={sent}
                    type="button"
                    onClick={() => setSentiment(sent)}
                    className={"v2-button " + (`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                      sentiment === sent
                        ? sent === 'Positive'
                          ? 'bg-emerald-500 text-white border-emerald-600'
                          : sent === 'Neutral'
                          ? 'bg-amber-500 text-white border-amber-600'
                          : 'bg-rose-500 text-white border-rose-600'
                        : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                    }`)}
                  >
                    {sent}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="v2-label block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Feedback Content *
            </label>
            <textarea
              rows={3}
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              placeholder="Enter client remarks, requested improvements, or concerns..."
              className="v2-control w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden text-slate-900 dark:text-white resize-none"
              required
            />
          </div>

          <div className="v2-grid grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="v2-label block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Resolution Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as FeedbackStatus)}
                className="v2-control w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden text-slate-900 dark:text-white"
              >
                <option value="Open" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Open</option>
                <option value="In Progress" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">In Progress</option>
                <option value="Resolved" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Resolved</option>
              </select>
            </div>

            <div>
              <label className="v2-label block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Internal Action Plan
              </label>
              <input
                type="text"
                value={actionPlan}
                onChange={(e) => setActionPlan(e.target.value)}
                placeholder="Assigned team next steps or corrective plan..."
                className="v2-control w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden text-slate-900 dark:text-white"
              />
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
              Save Feedback
            </button>
          </div>
        </form>
      </div>
    </div></DrawerPortal>
  );
};
