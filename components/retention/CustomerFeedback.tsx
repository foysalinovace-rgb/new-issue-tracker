import { DataLedger, FilterDesk } from '../common/DataLedger';
import { ModuleWorkspace } from '../common/ModuleWorkspace';
import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, 
  Star, 
  Smile, 
  Meh, 
  Frown, 
  Filter, 
  Search, 
  Plus, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  Building2,
  Tag
} from 'lucide-react';
import { RetentionHeader } from './RetentionHeader';
import { AddFeedbackModal } from './AddFeedbackModal';
import { retentionService } from '../../services/retentionService';
import { CustomerFeedbackItem, RetentionCustomer, FeedbackSentiment, FeedbackStatus } from '../../types/retention';

export const CustomerFeedback: React.FC = () => {
  const [feedbacks, setFeedbacks] = useState<CustomerFeedbackItem[]>([]);
  const [customers, setCustomers] = useState<RetentionCustomer[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Filters
  const [selectedSentiment, setSelectedSentiment] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const loadData = () => {
    setFeedbacks(retentionService.getFeedbacks());
    setCustomers(retentionService.getCustomers());
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtered
  const filteredFeedbacks = feedbacks.filter(f => {
    if (selectedSentiment !== 'all' && f.sentiment !== selectedSentiment) return false;
    if (selectedCategory !== 'all' && f.category !== selectedCategory) return false;
    if (selectedStatus !== 'all' && f.status !== selectedStatus) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return f.customer_name.toLowerCase().includes(q) || f.feedback_text.toLowerCase().includes(q) || (f.action_plan && f.action_plan.toLowerCase().includes(q));
    }
    return true;
  });

  // Analytics Metrics
  const totalCount = feedbacks.length || 1;
  const avgScore = (feedbacks.reduce((acc, f) => acc + f.score, 0) / totalCount).toFixed(1);
  const positiveCount = feedbacks.filter(f => f.sentiment === 'Positive').length;
  const positivePct = Math.round((positiveCount / totalCount) * 100);
  const openCount = feedbacks.filter(f => f.status === 'Open').length;
  const resolvedCount = feedbacks.filter(f => f.status === 'Resolved').length;

  const renderStars = (score: number) => {
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map(s => (
          <Star
            key={s}
            size={13}
            className={s <= score ? 'fill-amber-400 text-amber-400' : 'text-slate-300 dark:text-slate-600'}
          />
        ))}
      </div>
    );
  };

  const getSentimentBadge = (sent: FeedbackSentiment) => {
    switch (sent) {
      case 'Positive':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
            <Smile size={13} /> Positive
          </span>
        );
      case 'Neutral':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
            <Meh size={13} /> Neutral
          </span>
        );
      case 'Negative':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
            <Frown size={13} /> Negative
          </span>
        );
    }
  };

  return (
    <ModuleWorkspace data-ui="v2" id="CustomerFeedback" number="21" title="Voice of the customer" description="Listen to feedback, spot opportunities and close the loop." category="Customer success" kind="directory" links={[{"label":"Experience report","path":"/retention/reports"}]}><div className="v2-page-content">
      <RetentionHeader onOpenLogCall={() => setIsAddModalOpen(true)} />

      {/* CSAT & Sentiment Summary Cards */}
      <div className="v2-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: CSAT Score */}
        <div className="v2-surface bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Average CSAT Rating
          </span>
          <div className="flex items-baseline gap-2 mt-2">
            <h3 className="v2-heading text-2xl font-bold tracking-tight text-amber-500">
              {avgScore} <span className="text-xs text-slate-400">/ 5.0</span>
            </h3>
            <div className="flex items-center gap-0.5">
              {[1, 2, 3, 4, 5].map(s => (
                <Star key={s} size={14} className="fill-amber-400 text-amber-400" />
              ))}
            </div>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Based on {feedbacks.length} client evaluations</p>
        </div>

        {/* Card 2: Positive Sentiment % */}
        <div className="v2-surface bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Positive Sentiment Ratio
          </span>
          <div className="flex items-baseline gap-2 mt-2">
            <h3 className="v2-heading text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
              {positivePct}%
            </h3>
            <span className="text-xs text-emerald-600 font-semibold flex items-center gap-0.5">
              <Smile size={14} /> Healthy
            </span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden mt-2">
            <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${positivePct}%` }} />
          </div>
        </div>

        {/* Card 3: Open Complaints / Action Items */}
        <div className="v2-surface bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Open Feedback & Issues
          </span>
          <div className="flex items-baseline gap-2 mt-2">
            <h3 className="v2-heading text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {openCount}
            </h3>
            <span className="text-xs text-amber-500 font-medium">Pending action</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Requires specialist follow-up</p>
        </div>

        {/* Card 4: Resolved Ratio */}
        <div className="v2-surface bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Resolved Feedback Items
          </span>
          <div className="flex items-baseline gap-2 mt-2">
            <h3 className="v2-heading text-2xl font-bold tracking-tight text-indigo-600 dark:text-indigo-400">
              {resolvedCount}
            </h3>
            <span className="text-xs text-slate-400">Items fixed</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Action plans successfully fulfilled</p>
        </div>
      </div>

      {/* Main Feedback List & Controls */}
      <div className="v2-surface bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        {/* Controls Toolbar */}
        <FilterDesk actions={<><button
              onClick={() => setIsAddModalOpen(true)}
              className="v2-button v2-primary inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-colors"
            >
              <Plus size={14} /> Add Feedback
            </button></>}><div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3" data-filter-layout="">
          <div className="flex items-center gap-3" data-filter-group="">
            <div data-filter-field="search"><span className="filter-field-label">Search</span><div className="relative w-72" data-filter-input-wrap="">
              <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search feedback text, client..."
                className="v2-control w-full pl-9 pr-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-hidden"
              />
            </div></div>
          </div>

          <div className="flex items-center gap-2 flex-wrap" data-filter-group="">
            <div data-filter-field="field"><span className="filter-field-label">Sentiment</span><select
              value={selectedSentiment}
              onChange={(e) => setSelectedSentiment(e.target.value)}
              className="v2-control text-xs py-1.5 px-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-hidden"
            >
              <option value="all" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">All Sentiments</option>
              <option value="Positive" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Positive</option>
              <option value="Neutral" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Neutral</option>
              <option value="Negative" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Negative</option>
            </select></div>

            <div data-filter-field="field"><span className="filter-field-label">Category</span><select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="v2-control text-xs py-1.5 px-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-hidden"
            >
              <option value="all" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">All Categories</option>
              <option value="Product Feature" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Product Feature</option>
              <option value="Support Speed" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Support Speed</option>
              <option value="Pricing" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Pricing</option>
              <option value="System Bug" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">System Bug</option>
              <option value="Usability" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Usability</option>
            </select></div>

            <div data-filter-field="field"><span className="filter-field-label">Status</span><select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="v2-control text-xs py-1.5 px-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-hidden"
            >
              <option value="all" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">All Statuses</option>
              <option value="Open" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Open</option>
              <option value="In Progress" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">In Progress</option>
              <option value="Resolved" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Resolved</option>
            </select></div>

            
          </div>
        </div></FilterDesk>

        {/* Feedback Cards Feed */}
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {filteredFeedbacks.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              No feedback entries found. Click <strong>"Add Feedback"</strong> to log customer reviews.
            </div>
          ) : (
            filteredFeedbacks.map((fb) => (
              <div key={fb.id} className="p-4 sm:p-5 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-slate-900 dark:text-white">
                        {fb.customer_name}
                      </span>
                      {renderStars(fb.score)}
                      {getSentimentBadge(fb.sentiment)}
                      <span className="text-xs px-2 py-0.5 rounded-sm bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium border border-slate-200 dark:border-slate-700">
                        {fb.category}
                      </span>
                    </div>

                    <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed bg-slate-50 dark:bg-slate-800/60 p-3 rounded-lg border border-slate-200/70 dark:border-slate-700/60 italic">
                      "{fb.feedback_text}"
                    </p>

                    {fb.action_plan && (
                      <div className="text-xs text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5 pt-0.5">
                        <strong>Action Plan:</strong> {fb.action_plan}
                      </div>
                    )}

                    <div className="flex items-center gap-3 text-[11px] text-slate-400 pt-1">
                      <span>Logged by: <strong>{fb.logged_by}</strong></span>
                      <span>Date: {fb.created_at.split('T')[0]}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-start shrink-0">
                    <select
                      value={fb.status}
                      onChange={(e) => {
                        retentionService.updateFeedbackStatus(fb.id, e.target.value as FeedbackStatus);
                        loadData();
                      }}
                      className={"v2-control " + (`text-xs font-semibold py-1 px-2 rounded-lg border focus:outline-hidden ${
                        fb.status === 'Resolved' 
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800' 
                          : fb.status === 'In Progress'
                          ? 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800'
                          : 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                      }`)}
                    >
                      <option value="Open">Open</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Resolved">Resolved</option>
                    </select>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Add Feedback Modal */}
      <AddFeedbackModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={loadData}
        customers={customers}
      />
    </div></ModuleWorkspace>
  );
};
