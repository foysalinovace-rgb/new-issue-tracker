import React, { useState, useEffect, useMemo } from 'react';
import { 
  Star, 
  MapPin, 
  ExternalLink, 
  RefreshCw, 
  Plus, 
  Download, 
  Search, 
  Filter, 
  CheckCircle2, 
  Clock, 
  MessageSquare, 
  Building2, 
  Phone, 
  Globe, 
  ThumbsUp, 
  AlertCircle,
  X,
  Edit3,
  Calendar,
  Sparkles,
  Share2
} from 'lucide-react';
import { DrawerPortal } from './common/DrawerPortal';

export interface PlaceReview {
  id: string;
  authorName: string;
  authorPhotoUrl?: string | null;
  authorUri?: string | null;
  rating: number;
  publishTime: string;
  relativePublishTimeDescription: string;
  text: string;
  source: string;
  responseStatus: 'Replied' | 'Needs Response' | 'Acknowledged';
  responseNote?: string;
  clientSegment?: string;
}

export interface PlaceMetadata {
  id: string;
  name: string;
  category: string;
  address: string;
  location: { latitude: number; longitude: number };
  rating: number;
  userRatingCount: number;
  websiteUri: string;
  nationalPhoneNumber: string;
  googleMapsUri: string;
  writeReviewUri: string;
  lastSyncedAt: string;
}

const DEFAULT_PLACE: PlaceMetadata = {
  id: 'ChIJMWfQRJWHEAYRLCYbtfI0ZU4',
  name: 'Tipsoi',
  category: 'Software company',
  address: 'Nad Al Sheba, Meydan Grandstand, Dubai, United Arab Emirates',
  location: { latitude: 25.1105788, longitude: 55.317707 },
  rating: 4.7,
  userRatingCount: 3,
  websiteUri: 'https://tipsoi.ai',
  nationalPhoneNumber: '+971 54 567 9417',
  googleMapsUri: 'https://www.google.com/maps/place//@25.1105788,55.317707,8z/data=!3m1!4b1!4m3!3m2!1s0x610879544d06731:0x4e6534f2b51b262c!12e1',
  writeReviewUri: 'https://search.google.com/local/writereview?placeid=ChIJMWfQRJWHEAYRLCYbtfI0ZU4',
  lastSyncedAt: new Date().toISOString(),
};

export const ReviewTracker: React.FC = () => {
  const [place, setPlace] = useState<PlaceMetadata>(DEFAULT_PLACE);
  const [reviews, setReviews] = useState<PlaceReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [starFilter, setStarFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'all' | 'positive' | 'needs_response'>('all');
  
  // Modals
  const [selectedReview, setSelectedReview] = useState<PlaceReview | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newReviewForm, setNewReviewForm] = useState({
    authorName: '',
    rating: 5,
    text: '',
    clientSegment: 'Dubai Enterprise Client',
    responseStatus: 'Acknowledged' as 'Replied' | 'Needs Response' | 'Acknowledged',
    responseNote: '',
  });

  const fetchReviews = async (forceRefresh = false) => {
    try {
      if (forceRefresh) setRefreshing(true);
      else setLoading(true);

      const url = `/api/google-maps/reviews${forceRefresh ? '?refresh=true' : ''}`;
      const res = await fetch(url);
      const json = await res.json();

      if (json.success && json.data) {
        if (json.data.place) setPlace(json.data.place);
        if (Array.isArray(json.data.reviews)) setReviews(json.data.reviews);
      }
    } catch (err) {
      console.error('Failed to fetch reviews:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  // Filtered reviews
  const filteredReviews = useMemo(() => {
    return reviews.filter(rev => {
      if (starFilter !== 'all' && rev.rating !== Number(starFilter)) return false;
      if (statusFilter !== 'all' && rev.responseStatus !== statusFilter) return false;
      if (activeTab === 'positive' && rev.rating < 4) return false;
      if (activeTab === 'needs_response' && rev.responseStatus !== 'Needs Response') return false;

      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesAuthor = rev.authorName.toLowerCase().includes(q);
        const matchesText = rev.text.toLowerCase().includes(q);
        const matchesSegment = rev.clientSegment?.toLowerCase().includes(q);
        const matchesNote = rev.responseNote?.toLowerCase().includes(q);
        return matchesAuthor || matchesText || matchesSegment || matchesNote;
      }
      return true;
    });
  }, [reviews, starFilter, statusFilter, activeTab, search]);

  // Breakdown statistics
  const stats = useMemo(() => {
    const total = reviews.length;
    const avg = total > 0 ? (reviews.reduce((sum, r) => sum + r.rating, 0) / total).toFixed(1) : place.rating.toFixed(1);
    const starCounts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviews.forEach(r => {
      const star = Math.min(5, Math.max(1, Math.round(r.rating))) as 1|2|3|4|5;
      starCounts[star]++;
    });
    const repliedCount = reviews.filter(r => r.responseStatus === 'Replied').length;
    const needsResponseCount = reviews.filter(r => r.responseStatus === 'Needs Response').length;
    const positiveCount = reviews.filter(r => r.rating >= 4).length;

    return {
      total,
      avg,
      starCounts,
      repliedCount,
      needsResponseCount,
      positiveRate: total > 0 ? Math.round((positiveCount / total) * 100) : 100,
    };
  }, [reviews, place.rating]);

  const handleUpdateReviewStatus = async (reviewId: string, updates: Partial<PlaceReview>) => {
    try {
      const res = await fetch('/api/google-maps/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updateId: reviewId, review: updates })
      });
      const json = await res.json();
      if (json.success && json.review) {
        setReviews(prev => prev.map(r => r.id === reviewId ? { ...r, ...json.review } : r));
        if (selectedReview?.id === reviewId) {
          setSelectedReview(prev => prev ? { ...prev, ...json.review } : null);
        }
      }
    } catch (e) {
      console.error('Failed to update review:', e);
    }
  };

  const handleCreateReview = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/google-maps/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ review: newReviewForm })
      });
      const json = await res.json();
      if (json.success && json.review) {
        setReviews(prev => [json.review, ...prev]);
        if (json.place) setPlace(json.place);
        setShowAddModal(false);
        setNewReviewForm({
          authorName: '',
          rating: 5,
          text: '',
          clientSegment: 'Dubai Enterprise Client',
          responseStatus: 'Acknowledged',
          responseNote: '',
        });
      }
    } catch (e) {
      console.error('Failed to create review:', e);
    }
  };

  const exportToCSV = () => {
    if (reviews.length === 0) return;
    const headers = ['Reviewer Name', 'Rating (Stars)', 'Date Given', 'Relative Time', 'Review Content', 'Response Status', 'Response Note', 'Client Segment'];
    const rows = reviews.map(r => [
      `"${r.authorName.replace(/"/g, '""')}"`,
      r.rating,
      `"${new Date(r.publishTime).toLocaleDateString()}"`,
      `"${r.relativePublishTimeDescription}"`,
      `"${r.text.replace(/"/g, '""')}"`,
      `"${r.responseStatus}"`,
      `"${(r.responseNote || '').replace(/"/g, '""')}"`,
      `"${(r.clientSegment || '').replace(/"/g, '""')}"`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Google_Maps_Reviews_${place.name}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const renderStars = (rating: number, size = 16) => {
    return (
      <div className="flex items-center gap-0.5 text-amber-400">
        {[1, 2, 3, 4, 5].map(star => (
          <Star 
            key={star} 
            size={size} 
            className={star <= rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300 dark:text-slate-600'} 
          />
        ))}
      </div>
    );
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Target Location Header Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 md:p-6 shadow-xs relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-teal-500/10 via-indigo-500/5 to-transparent rounded-full -mr-20 -mt-20 pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-teal-50 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                <MapPin size={12} className="text-teal-600 dark:text-teal-400" />
                Verified Google Maps Location
              </span>
              <span className="text-xs text-slate-400 font-mono">
                Place ID: {place.id}
              </span>
            </div>

            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
              <span>{place.name}</span>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                {place.category}
              </span>
            </h1>

            <p className="text-xs md:text-sm text-slate-600 dark:text-slate-400 max-w-2xl flex items-center gap-2">
              <Building2 size={14} className="shrink-0 text-slate-400" />
              <span>{place.address}</span>
            </p>

            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400 pt-1">
              {place.websiteUri && (
                <a 
                  href={place.websiteUri} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 hover:text-teal-600 dark:hover:text-teal-400 transition-colors"
                >
                  <Globe size={13} />
                  <span>{place.websiteUri.replace('https://', '')}</span>
                </a>
              )}
              {place.nationalPhoneNumber && (
                <span className="flex items-center gap-1">
                  <Phone size={13} />
                  <span>{place.nationalPhoneNumber}</span>
                </span>
              )}
              <span className="flex items-center gap-1 text-slate-400">
                <Clock size={13} />
                <span>Last updated: {new Date(place.lastSyncedAt).toLocaleDateString()}</span>
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              onClick={() => fetchReviews(true)}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-colors disabled:opacity-50 cursor-pointer"
              title="Sync latest reviews from Google Maps Platform"
            >
              <RefreshCw size={14} className={refreshing ? 'animate-spin text-teal-600' : ''} />
              <span>{refreshing ? 'Syncing...' : 'Sync Reviews'}</span>
            </button>

            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-teal-600 hover:bg-teal-700 text-white shadow-xs transition-colors cursor-pointer"
            >
              <Plus size={14} />
              <span>Log Review</span>
            </button>

            <a
              href={place.googleMapsUri}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:hover:bg-slate-100 dark:text-slate-900 transition-colors"
            >
              <span>View on Maps</span>
              <ExternalLink size={13} />
            </a>

            <a
              href={place.writeReviewUri}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border border-teal-500/40 text-teal-600 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-950/40 transition-colors"
              title="Open Google Maps Write Review Form"
            >
              <Sparkles size={13} />
              <span>Write Review</span>
            </a>
          </div>
        </div>
      </div>

      {/* KPI & Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Rating Score */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Average Rating</span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-900 dark:text-white">{stats.avg}</span>
              <span className="text-xs text-slate-400">/ 5.0</span>
            </div>
            {renderStars(Number(stats.avg), 14)}
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex items-center justify-center text-amber-500">
            <Star size={24} className="fill-amber-400 text-amber-400" />
          </div>
        </div>

        {/* Total Reviews */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Reviews</span>
            <div className="text-3xl font-black text-slate-900 dark:text-white">{stats.total}</div>
            <span className="text-[11px] text-teal-600 dark:text-teal-400 font-medium">Verified Google Reviews</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 flex items-center justify-center text-teal-600">
            <MessageSquare size={22} />
          </div>
        </div>

        {/* Positive Sentiment Rate */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Positive Sentiment</span>
            <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400">{stats.positiveRate}%</div>
            <span className="text-[11px] text-slate-400 font-medium">{stats.starCounts[5] + stats.starCounts[4]} of {stats.total} ratings are 4-5★</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-600">
            <ThumbsUp size={22} />
          </div>
        </div>

        {/* Response Coverage */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Response Status</span>
            <div className="text-3xl font-black text-slate-900 dark:text-white">{stats.repliedCount}</div>
            <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium">
              {stats.needsResponseCount === 0 ? 'All reviews responded' : `${stats.needsResponseCount} pending reply`}
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600">
            <CheckCircle2 size={22} />
          </div>
        </div>
      </div>

      {/* Star Rating Breakdown Bar Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3 flex items-center justify-between">
          <span>Rating Distribution</span>
          <span className="text-xs font-normal text-slate-500">Based on verified Google Maps reviews</span>
        </h3>
        <div className="space-y-2">
          {[5, 4, 3, 2, 1].map(stars => {
            const count = (stats.starCounts as any)[stars] || 0;
            const pct = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;
            return (
              <div key={stars} className="flex items-center gap-3 text-xs">
                <span className="w-12 text-slate-600 dark:text-slate-400 font-semibold flex items-center gap-1">
                  {stars} <Star size={12} className="fill-amber-400 text-amber-400" />
                </span>
                <div className="flex-1 bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                  <div 
                    className="bg-amber-400 h-full rounded-full transition-all duration-500" 
                    style={{ width: `${pct}%` }} 
                  />
                </div>
                <span className="w-14 text-right font-mono text-slate-500 dark:text-slate-400">{count} ({pct}%)</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Filter and Tab Controls */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Quick Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                activeTab === 'all' 
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs' 
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              All Reviews ({reviews.length})
            </button>
            <button
              onClick={() => setActiveTab('positive')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                activeTab === 'positive' 
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs' 
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              4-5 Stars ({stats.starCounts[5] + stats.starCounts[4]})
            </button>
            <button
              onClick={() => setActiveTab('needs_response')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                activeTab === 'needs_response' 
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs' 
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Needs Response ({stats.needsResponseCount})
            </button>
          </div>

          {/* Export & Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={exportToCSV}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
            >
              <Download size={13} />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Search & Select Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 border-t border-slate-100 dark:border-slate-800/80">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search reviewer name or feedback..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-teal-500 text-slate-900 dark:text-white"
            />
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-500 shrink-0">Rating:</label>
            <select
              value={starFilter}
              onChange={e => setStarFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none text-slate-900 dark:text-white"
            >
              <option value="all">All Stars (1 - 5)</option>
              <option value="5">5 Stars only</option>
              <option value="4">4 Stars only</option>
              <option value="3">3 Stars only</option>
              <option value="2">2 Stars only</option>
              <option value="1">1 Star only</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-500 shrink-0">Status:</label>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none text-slate-900 dark:text-white"
            >
              <option value="all">All Response Statuses</option>
              <option value="Replied">Replied</option>
              <option value="Needs Response">Needs Response</option>
              <option value="Acknowledged">Acknowledged</option>
            </select>
          </div>
        </div>
      </div>

      {/* Review Cards List */}
      <div className="space-y-4">
        {loading ? (
          <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
            <RefreshCw size={24} className="animate-spin text-teal-600 mx-auto mb-2" />
            <p className="text-xs text-slate-500">Loading reviews from Google Maps Platform...</p>
          </div>
        ) : filteredReviews.length === 0 ? (
          <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
            <MessageSquare size={32} className="text-slate-400 mx-auto mb-2" />
            <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">No reviews found</h4>
            <p className="text-xs text-slate-500 mt-1">Try adjusting your search criteria or star filters.</p>
          </div>
        ) : (
          filteredReviews.map(rev => (
            <div 
              key={rev.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs hover:border-teal-500/40 transition-all space-y-3.5"
            >
              {/* Header: Reviewer info, Stars, Date */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-500 to-indigo-600 text-white font-bold text-sm flex items-center justify-center shrink-0 shadow-xs">
                    {rev.authorName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 dark:text-white text-sm">
                        {rev.authorName}
                      </span>
                      {rev.clientSegment && (
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-medium">
                          {rev.clientSegment}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <span>{rev.relativePublishTimeDescription}</span>
                      <span>•</span>
                      <span>{new Date(rev.publishTime).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60">
                    {renderStars(rev.rating, 14)}
                    <span className="text-xs font-black text-amber-700 dark:text-amber-300 ml-1">
                      {rev.rating}.0
                    </span>
                  </div>

                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${
                    rev.responseStatus === 'Replied'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                      : rev.responseStatus === 'Needs Response'
                      ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
                      : 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800'
                  }`}>
                    {rev.responseStatus}
                  </span>
                </div>
              </div>

              {/* Review Content / What they wrote */}
              <div className="bg-slate-50 dark:bg-slate-800/40 rounded-xl p-3.5 border border-slate-100 dark:border-slate-800 text-slate-800 dark:text-slate-200 text-xs md:text-sm leading-relaxed">
                "{rev.text}"
              </div>

              {/* Internal Note / Response Tracking */}
              {rev.responseNote && (
                <div className="text-xs text-slate-600 dark:text-slate-400 flex items-start gap-2 bg-indigo-50/50 dark:bg-indigo-950/20 p-2.5 rounded-xl border border-indigo-100 dark:border-indigo-900/40">
                  <CheckCircle2 size={14} className="text-indigo-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-indigo-950 dark:text-indigo-300">Management Follow-up: </span>
                    <span>{rev.responseNote}</span>
                  </div>
                </div>
              )}

              {/* Footer Actions */}
              <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100 dark:border-slate-800/60 text-slate-400">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-teal-500 inline-block" />
                  {rev.source}
                </span>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSelectedReview(rev)}
                    className="p-1.5 hover:text-teal-600 dark:hover:text-teal-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer flex items-center gap-1 font-semibold"
                  >
                    <Edit3 size={13} />
                    <span>Manage</span>
                  </button>
                  <a
                    href={place.googleMapsUri}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-1"
                  >
                    <ExternalLink size={13} />
                    <span>View on Maps</span>
                  </a>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Detail / Manage Review Modal */}
      {selectedReview && (
        <DrawerPortal>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <MessageSquare size={16} className="text-teal-600" />
                  Review Details & Management
                </h3>
                <button 
                  onClick={() => setSelectedReview(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="text-slate-500 font-semibold block mb-1">Reviewer Name</label>
                  <div className="font-bold text-slate-900 dark:text-white text-sm">{selectedReview.authorName}</div>
                </div>

                <div>
                  <label className="text-slate-500 font-semibold block mb-1">Star Rating</label>
                  <div className="flex items-center gap-2">
                    {renderStars(selectedReview.rating, 16)}
                    <span className="font-bold text-slate-800 dark:text-slate-200">({selectedReview.rating} of 5 Stars)</span>
                  </div>
                </div>

                <div>
                  <label className="text-slate-500 font-semibold block mb-1">Date Published</label>
                  <div className="text-slate-700 dark:text-slate-300">
                    {new Date(selectedReview.publishTime).toLocaleString()} ({selectedReview.relativePublishTimeDescription})
                  </div>
                </div>

                <div>
                  <label className="text-slate-500 font-semibold block mb-1">Review Content (What was written)</label>
                  <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 leading-relaxed">
                    "{selectedReview.text}"
                  </div>
                </div>

                <div>
                  <label className="text-slate-500 font-semibold block mb-1">Response / Follow-up Status</label>
                  <select
                    value={selectedReview.responseStatus}
                    onChange={e => handleUpdateReviewStatus(selectedReview.id, { responseStatus: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-slate-900 dark:text-white"
                  >
                    <option value="Replied">Replied</option>
                    <option value="Needs Response">Needs Response</option>
                    <option value="Acknowledged">Acknowledged</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-500 font-semibold block mb-1">Internal Management Note</label>
                  <textarea
                    rows={3}
                    defaultValue={selectedReview.responseNote || ''}
                    onBlur={e => handleUpdateReviewStatus(selectedReview.id, { responseNote: e.target.value })}
                    placeholder="Add operational notes or details on how this client was contacted..."
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={() => setSelectedReview(null)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </DrawerPortal>
      )}

      {/* Log Review Modal */}
      {showAddModal && (
        <DrawerPortal>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Plus size={16} className="text-teal-600" />
                  Record Customer Review
                </h3>
                <button 
                  onClick={() => setShowAddModal(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleCreateReview} className="space-y-3.5 text-xs">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Reviewer Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newReviewForm.authorName}
                    onChange={e => setNewReviewForm({ ...newReviewForm, authorName: e.target.value })}
                    placeholder="e.g. Tariq Mansoor / Corporate Client"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-slate-900 dark:text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Star Rating</label>
                    <select
                      value={newReviewForm.rating}
                      onChange={e => setNewReviewForm({ ...newReviewForm, rating: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-slate-900 dark:text-white"
                    >
                      <option value="5">⭐⭐⭐⭐⭐ 5 Stars</option>
                      <option value="4">⭐⭐⭐⭐ 4 Stars</option>
                      <option value="3">⭐⭐⭐ 3 Stars</option>
                      <option value="2">⭐⭐ 2 Stars</option>
                      <option value="1">⭐ 1 Star</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Client Segment</label>
                    <input
                      type="text"
                      value={newReviewForm.clientSegment}
                      onChange={e => setNewReviewForm({ ...newReviewForm, clientSegment: e.target.value })}
                      placeholder="e.g. Dubai Enterprise"
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Review Content / What they wrote <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={4}
                    required
                    value={newReviewForm.text}
                    onChange={e => setNewReviewForm({ ...newReviewForm, text: e.target.value })}
                    placeholder="Enter what the client wrote in their Google review..."
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Follow-up Note</label>
                  <input
                    type="text"
                    value={newReviewForm.responseNote}
                    onChange={e => setNewReviewForm({ ...newReviewForm, responseNote: e.target.value })}
                    placeholder="Optional internal action note"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-slate-900 dark:text-white"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-xs font-semibold rounded-xl bg-teal-600 hover:bg-teal-700 text-white shadow-xs cursor-pointer"
                  >
                    Save Review
                  </button>
                </div>
              </form>
            </div>
          </div>
        </DrawerPortal>
      )}

      {/* Google Maps Platform Attribution & Compliance */}
      <div className="text-[11px] text-slate-500 dark:text-slate-400 p-4 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <MapPin size={14} className="text-teal-600 shrink-0" />
          <span>
            Google Maps Platform Places API (New) • Attribution ID:{' '}
            <code className="text-slate-700 dark:text-slate-300 font-mono">gmp_mcp_codeassist_v1_aistudio</code>
          </span>
        </div>
        <div className="flex items-center gap-3">
          <a
            href="https://cloud.google.com/maps-platform/terms?utm_campaign=gmp_mcp_codeassist_v1_aistudio"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline text-teal-600 dark:text-teal-400"
          >
            Maps Terms of Service
          </a>
          <a
            href={place.googleMapsUri}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline"
          >
            Google Maps Listing
          </a>
        </div>
      </div>
    </div>
  );
};

export default ReviewTracker;
