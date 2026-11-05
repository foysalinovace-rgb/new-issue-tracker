import { feedbackService } from '../services/feedbackService';
import './customer-feedback.css';

const FeedbackShell = ({ children }: { children: React.ReactNode }) => <main className="feedback-page">{children}</main>;
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { dbService } from '../services/dbService';
import { Issue, BrandingConfig } from '../types';
import { 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Send, 
  Calendar, 
  Headphones, 
  ShieldCheck, 
  Sparkles,
  Globe,
  HelpCircle,
  Star
} from 'lucide-react';

type Lang = 'bn' | 'en';

interface RatingOption {
  value: number;
  emoji: string;
  labelBn: string;
  labelEn: string;
  descBn: string;
  descEn: string;
  starColor: string;
  activeBg: string;
  activeBorder: string;
  activeText: string;
}

const RATING_OPTIONS: RatingOption[] = [
  {
    value: 1,
    emoji: '😞',
    labelBn: 'খুব খারাপ',
    labelEn: 'Very Poor',
    descBn: 'অত্যন্ত অসন্তোষজনক',
    descEn: 'Highly dissatisfied',
    starColor: 'text-rose-500',
    activeBg: 'bg-rose-50/90',
    activeBorder: 'border-rose-500 ring-2 ring-rose-500/20',
    activeText: 'text-rose-950',
  },
  {
    value: 2,
    emoji: '🙁',
    labelBn: 'খারাপ',
    labelEn: 'Poor',
    descBn: 'প্রত্যাশার চেয়ে কম',
    descEn: 'Below expectations',
    starColor: 'text-orange-500',
    activeBg: 'bg-orange-50/90',
    activeBorder: 'border-orange-500 ring-2 ring-orange-500/20',
    activeText: 'text-orange-950',
  },
  {
    value: 3,
    emoji: '😐',
    labelBn: 'মোটামুটি',
    labelEn: 'Average',
    descBn: 'সাধারণ মানের সেবা',
    descEn: 'Acceptable service',
    starColor: 'text-amber-500',
    activeBg: 'bg-amber-50/90',
    activeBorder: 'border-amber-500 ring-2 ring-amber-500/20',
    activeText: 'text-amber-950',
  },
  {
    value: 4,
    emoji: '😊',
    labelBn: 'ভালো',
    labelEn: 'Good',
    descBn: 'সন্তোষজনক সেবা',
    descEn: 'Satisfactory service',
    starColor: 'text-teal-500',
    activeBg: 'bg-teal-50/90',
    activeBorder: 'border-teal-500 ring-2 ring-teal-500/20',
    activeText: 'text-teal-950',
  },
  {
    value: 5,
    emoji: '🤩',
    labelBn: 'অসাধারণ',
    labelEn: 'Excellent',
    descBn: 'সর্বোচ্চ মানের সেবা',
    descEn: 'Outstanding service',
    starColor: 'text-emerald-500',
    activeBg: 'bg-emerald-50/90',
    activeBorder: 'border-emerald-500 ring-2 ring-emerald-500/20',
    activeText: 'text-emerald-950',
  },
];

export const CustomerFeedbackPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  
  // Language State - Default is Bangla ('bn')
  const [lang, setLang] = useState<Lang>('bn');

  const [issue, setIssue] = useState<Issue | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);
  const [branding, setBranding] = useState<BrandingConfig>(() => dbService.getCachedBranding());

  // Form states - Only 'Yes' or 'No' for Q1
  const [resolvedConfirmed, setResolvedConfirmed] = useState<'Yes' | 'No' | ''>('');
  
  // 1 to 5 Feedback Rating for Q2
  const [rating, setRating] = useState<number | 0>(0);
  const [satisfaction, setSatisfaction] = useState<'Very Poor' | 'Poor' | 'Average' | 'Good' | 'Excellent' | string>('');
  
  // Default to today's running date
  const [feedbackDate, setFeedbackDate] = useState<string>(() => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  });
  const [customerComment, setCustomerComment] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    dbService.getBranding().then((b) => setBranding(b));
    if (id) {
      loadIssueData(id);
    } else {
      setLoading(false);
    }
  }, [id]);

  const loadIssueData = async (issueId: string) => {
    setLoading(true);
    try {
      const data = await feedbackService.getIssue(issueId);
      setIssue(data);
    } catch (err) {
      console.error('Failed to load issue for feedback:', err);
    } finally {
      setLoading(false);
    }
  };

  // Helper for Bengali numerals
  const toBanglaNumber = (num: number | string): string => {
    const bnDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
    return String(num).replace(/[0-9]/g, (d) => bnDigits[parseInt(d, 10)]);
  };

  // Pure language formatted date
  const formatDateByLang = (dateStr?: string, currentLang: Lang = 'bn'): string => {
    if (!dateStr) return currentLang === 'bn' ? 'সাম্প্রতিক' : 'Recent';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      if (currentLang === 'bn') {
        const monthsBn = [
          'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 
          'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'
        ];
        const dayBn = toBanglaNumber(d.getDate());
        const monthBn = monthsBn[d.getMonth()];
        const yearBn = toBanglaNumber(d.getFullYear());
        return `${dayBn} ${monthBn}, ${yearBn}`;
      } else {
        const monthsEn = [
          'January', 'February', 'March', 'April', 'May', 'June', 
          'July', 'August', 'September', 'October', 'November', 'December'
        ];
        return `${monthsEn[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
      }
    } catch (e) {
      return dateStr;
    }
  };

  const getRatingText = (val?: number, currentLang: Lang = 'bn') => {
    const opt = RATING_OPTIONS.find(o => o.value === val);
    if (!opt) return '';
    return currentLang === 'bn' ? opt.labelBn : opt.labelEn;
  };

  // When rating is selected, auto sync satisfaction to the 5 levels
  const handleSelectRating = (selectedVal: number) => {
    setRating(selectedVal);
    let autoSat = 'Excellent';
    if (selectedVal === 5) {
      autoSat = 'Excellent';
    } else if (selectedVal === 4) {
      autoSat = 'Good';
    } else if (selectedVal === 3) {
      autoSat = 'Average';
    } else if (selectedVal === 2) {
      autoSat = 'Poor';
    } else {
      autoSat = 'Very Poor';
    }
    setSatisfaction(autoSat);
    setErrorMessage('');
  };

  const isAlreadySubmitted = Boolean(
    issue && 
    (issue.customer_satisfaction || issue.issue_resolved_confirmed || issue.feedback_rating) &&
    issue.feedback_date
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!issue || !issue.id) return;

    if (!resolvedConfirmed) {
      setErrorMessage(
        lang === 'bn' 
          ? 'অনুগ্রহ করে জানান আপনার সমস্যাটি সমাধান হয়েছে কিনা।' 
          : 'Please select whether your issue has been resolved.'
      );
      return;
    }

    if (!rating) {
      setErrorMessage(
        lang === 'bn'
          ? 'অনুগ্রহ করে আমাদের কাস্টমার সেবায় ১ থেকে ৫ এর মধ্যে রেটিং নির্বাচন করুন।'
          : 'Please select a rating between 1 and 5 for our customer support.'
      );
      return;
    }

    setErrorMessage('');
    setSubmitting(true);

    try {
      // Append customer comment if provided
      let updatedDetails = issue.issue_details || '';
      if (customerComment.trim()) {
        const commentTag = lang === 'bn' ? 'গ্রাহকের মন্তব্য' : 'Customer Comment';
        updatedDetails += `\n[${commentTag} (${feedbackDate})]: ${customerComment.trim()}`;
      }

      await feedbackService.submit({ issueId: issue.id, resolvedConfirmed, rating, feedbackDate, comment: customerComment.trim() });

      // Update local issue state
      setIssue(prev => prev ? {
        ...prev,
        issue_resolved_confirmed: resolvedConfirmed,
        feedback_rating: rating,
        customer_satisfaction: satisfaction,
        feedback_date: feedbackDate,
        issue_details: updatedDetails
      } : null);

      setSubmittedSuccess(true);
    } catch (err) {
      console.error('Error submitting feedback:', err);
      setErrorMessage(
        lang === 'bn'
          ? 'মতামত জমা দিতে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।'
          : 'Failed to submit feedback. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Language switcher component
  const renderLanguageSwitcher = () => (
    <div className="inline-flex items-center p-1 bg-white rounded-full border border-slate-200 shadow-xs">
      <div className="flex items-center gap-1 px-1.5 text-slate-400">
        <Globe size={13} />
      </div>
      <button
        type="button"
        onClick={() => setLang('bn')}
        className={"" + (`px-3 py-1 rounded-full text-xs font-semibold transition-all duration-200 cursor-pointer ${
          lang === 'bn'
            ? 'bg-indigo-600 text-white shadow-xs font-bold'
            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
        }`)}
      >
        বাংলা
      </button>
      <button
        type="button"
        onClick={() => setLang('en')}
        className={"" + (`px-3 py-1 rounded-full text-xs font-semibold transition-all duration-200 cursor-pointer ${
          lang === 'en'
            ? 'bg-indigo-600 text-white shadow-xs font-bold'
            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
        }`)}
      >
        English
      </button>
    </div>
  );

  // Loading State - Clean Light Background
  if (loading) {
    return (
      <FeedbackShell><div className={`min-h-screen bg-slate-50 flex items-center justify-center p-4 ${lang === 'bn' ? 'font-bangla' : ''}`}>
        <div className="text-center space-y-3">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-slate-600 text-sm font-medium">
            {lang === 'bn' ? 'অপেক্ষা করুন, লোড হচ্ছে...' : 'Loading feedback form, please wait...'}
          </p>
        </div>
      </div></FeedbackShell>
    );
  }

  // Not Found State - Clean Light Background
  if (!issue) {
    return (
      <FeedbackShell><div className={`min-h-screen bg-slate-50 flex items-center justify-center p-4 ${lang === 'bn' ? 'font-bangla' : ''}`}>
        <div className="max-w-md w-full">
          <div className="flex justify-end mb-4">
            {renderLanguageSwitcher()}
          </div>
          <div className="bg-white rounded-3xl p-8 shadow-md border border-slate-200 text-center space-y-4">
            <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
              <AlertCircle size={32} />
            </div>
            <h2 className="text-xl font-bold text-slate-800">
              {lang === 'bn' ? 'লিংকটি সঠিক নয় বা তথ্য পাওয়া যায়নি' : 'Invalid Link or Ticket Not Found'}
            </h2>
            <p className="text-sm text-slate-500 leading-relaxed">
              {lang === 'bn' 
                ? 'দুঃখিত, এই লিংকের সাথে সংযুক্ত কোনো তথ্য পাওয়া যায়নি। অনুগ্রহ করে সাপোর্ট টিমের সাথে যোগাযোগ করুন।' 
                : 'Sorry, no support issue could be found with this link. Please reach out to our support team for assistance.'}
            </p>
          </div>
        </div>
      </div></FeedbackShell>
    );
  }

  // State 1: Already Submitted Previously - Clean Light Background
  if (isAlreadySubmitted && !submittedSuccess) {
    return (
      <FeedbackShell><div className={`min-h-screen bg-slate-50 flex flex-col justify-between p-4 sm:p-6 ${lang === 'bn' ? 'font-bangla' : ''}`}>
        {/* Top bar with language switcher */}
        <div className="max-w-xl w-full mx-auto flex items-center justify-between pt-2">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 bg-white rounded-full border border-slate-200 shadow-xs">
            <ShieldCheck size={15} className="text-emerald-600" />
            <span className="text-xs font-semibold text-slate-700">
              {lang === 'bn' ? 'টিপসই কাস্টমার সাপোর্ট' : 'Tipsoi Customer Support'}
            </span>
          </div>
          {renderLanguageSwitcher()}
        </div>

        <div className="max-w-xl w-full mx-auto my-auto py-6">
          <div className="bg-white rounded-3xl shadow-lg border border-slate-200 p-6 sm:p-9 text-center space-y-6">
            <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto shadow-inner ring-8 ring-emerald-50/60 animate-in zoom-in-90 duration-300">
              <CheckCircle2 size={44} />
            </div>

            <div className="space-y-2">
              <span className="inline-block px-3.5 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-bold uppercase tracking-wider">
                {lang === 'bn' ? 'মতামত পূর্বে গৃহীত হয়েছে' : 'Feedback Already Submitted'}
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                {lang === 'bn' ? 'আপনি ইতিমধ্যেই আপনার মতামত দিয়েছেন!' : 'You have already submitted your feedback!'}
              </h2>
              <p className="text-slate-600 text-sm sm:text-base leading-relaxed max-w-md mx-auto">
                {lang === 'bn' ? (
                  <>
                    <span className="font-semibold text-slate-800">{issue.client_name}</span>, টিপসই সাপোর্ট সেবা ব্যবহার করার জন্য এবং আপনার মূল্যবান মতামত প্রদানের জন্য আপনাকে অনেক ধন্যবাদ।
                  </>
                ) : (
                  <>
                    Thank you, <span className="font-semibold text-slate-800">{issue.client_name}</span>, for using Tipsoi support and taking the time to share your feedback.
                  </>
                )}
              </p>
            </div>

            {/* Previously recorded response card */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 text-left space-y-3.5">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                {lang === 'bn' ? 'আপনার পূর্বে প্রদত্ত তথ্যের বিবরণ:' : 'Summary of your submitted response:'}
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                  <span className="text-slate-400 block text-[11px] mb-1 font-medium">
                    {lang === 'bn' ? 'সমস্যা সমাধান হয়েছে?' : 'Issue Resolved?'}
                  </span>
                  <div className="font-bold text-slate-800 flex items-center gap-1.5">
                    {issue.issue_resolved_confirmed === 'Yes' ? (
                      <>
                        <CheckCircle2 size={16} className="text-emerald-600" />
                        <span className="text-emerald-700">
                          {lang === 'bn' ? 'হ্যাঁ, সমাধান হয়েছে' : 'Yes, fully resolved'}
                        </span>
                      </>
                    ) : (
                      <>
                        <XCircle size={16} className="text-rose-600" />
                        <span className="text-rose-700">
                          {lang === 'bn' ? 'না, সমাধান হয়নি' : 'No, not resolved'}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                  <span className="text-slate-400 block text-[11px] mb-1 font-medium">
                    {lang === 'bn' ? 'রেটিং ও সন্তুষ্টি' : 'Rating & Satisfaction'}
                  </span>
                  <div className="font-bold text-slate-800 flex items-center gap-1.5">
                    {issue.feedback_rating ? (
                      <span className="text-amber-500 font-bold flex items-center gap-0.5">
                        <Star size={15} className="fill-amber-400 text-amber-400 inline" />
                        <span>{lang === 'bn' ? toBanglaNumber(issue.feedback_rating) : issue.feedback_rating}</span>
                        <span className="text-slate-700 font-semibold text-xs ml-1">
                          ({getRatingText(issue.feedback_rating, lang)})
                        </span>
                      </span>
                    ) : (
                      <span>
                        {issue.customer_satisfaction === 'Excellent' ? (lang === 'bn' ? 'অসাধারণ' : 'Excellent')
                          : issue.customer_satisfaction === 'Good' || issue.customer_satisfaction === 'Satisfied' ? (lang === 'bn' ? 'ভালো' : 'Good')
                          : issue.customer_satisfaction === 'Average' || issue.customer_satisfaction === 'Neutral' ? (lang === 'bn' ? 'মোটামুটি' : 'Average')
                          : issue.customer_satisfaction === 'Poor' ? (lang === 'bn' ? 'খারাপ' : 'Poor')
                          : issue.customer_satisfaction === 'Very Poor' || issue.customer_satisfaction === 'Dissatisfied' ? (lang === 'bn' ? 'খুব খারাপ' : 'Very Poor')
                          : (issue.customer_satisfaction || '-')}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-200">
                <span className="flex items-center gap-1 font-medium">
                  <Calendar size={13} className="text-slate-400" />
                  {lang === 'bn' ? 'মতামত প্রদানের তারিখ:' : 'Feedback Date:'}
                </span>
                <span className="font-bold text-slate-700">
                  {formatDateByLang(issue.feedback_date, lang)}
                </span>
              </div>
            </div>

            <div className="pt-2 text-xs text-slate-500 leading-relaxed bg-indigo-50/50 border border-indigo-100 p-3 rounded-xl flex items-center gap-2 text-left">
              <HelpCircle size={16} className="shrink-0 text-indigo-500" />
              <span>
                {lang === 'bn' 
                  ? 'আপনার কি কোনো নতুন সাহায্য বা টেকনিক্যাল সেবা প্রয়োজন? নির্দ্বিধায় আমাদের হেল্পলাইনে যোগাযোগ করুন।'
                  : 'Do you need any further technical support or assistance? Feel free to contact our helpline anytime.'}
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center py-4 text-xs text-slate-400">
          {lang === 'bn' 
            ? `© ${toBanglaNumber(new Date().getFullYear())} টিপসই • ইনোভেস টেকনোলজিস লিমিটেড • সর্বস্বত্ব সংরক্ষিত`
            : `© ${new Date().getFullYear()} Tipsoi • Inovace Technologies Ltd. • All rights reserved`}
        </div>
      </div></FeedbackShell>
    );
  }

  // State 2: Just Submitted (Thank You screen) - Clean Light Background
  if (submittedSuccess) {
    return (
      <FeedbackShell><div className={`min-h-screen bg-slate-50 flex flex-col justify-between p-4 sm:p-6 ${lang === 'bn' ? 'font-bangla' : ''}`}>
        {/* Top bar with language switcher */}
        <div className="max-w-xl w-full mx-auto flex items-center justify-between pt-2">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 bg-white rounded-full border border-slate-200 shadow-xs">
            <Sparkles size={14} className="text-emerald-500" />
            <span className="text-xs font-semibold text-slate-700">
              {lang === 'bn' ? 'টিপসই কাস্টমার সাপোর্ট' : 'Tipsoi Customer Support'}
            </span>
          </div>
          {renderLanguageSwitcher()}
        </div>

        <div className="max-w-xl w-full mx-auto my-auto py-8">
          <div className="bg-white rounded-3xl shadow-lg border border-slate-200 p-6 sm:p-10 text-center space-y-6 animate-in zoom-in-95 duration-400">
            <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto shadow-md ring-8 ring-emerald-50 animate-bounce">
              <CheckCircle2 size={46} />
            </div>

            <div className="space-y-2">
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-bold border border-emerald-200">
                <Sparkles size={14} className="text-emerald-500" />
                {lang === 'bn' ? 'মতামত সফলভাবে গৃহীত হয়েছে' : 'Feedback Successfully Recorded'}
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                {lang === 'bn' ? `অনেক ধন্যবাদ, ${issue.client_name}!` : `Thank You, ${issue.client_name}!`}
              </h2>
              <p className="text-slate-600 text-sm sm:text-base leading-relaxed max-w-md mx-auto">
                {lang === 'bn' 
                  ? 'আপনার মূল্যবান মতামত আমাদের সার্ভিসের মান বৃদ্ধি করতে সহায়তা করবে। টিপসই পরিবারের সাথে থাকার জন্য আমরা আন্তরিকভাবে কৃতজ্ঞ।'
                  : 'Your valuable feedback will help us improve our service quality. We are sincerely grateful for your trust in Tipsoi.'}
              </p>
            </div>

            {/* Quick Summary of what was just submitted */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 text-left space-y-2.5 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-slate-200">
                <span className="text-slate-600 font-medium">
                  {lang === 'bn' ? 'সমস্যা সমাধানের অবস্থা:' : 'Resolution Status:'}
                </span>
                <span className="font-bold text-emerald-800">
                  {resolvedConfirmed === 'Yes' 
                    ? (lang === 'bn' ? 'হ্যাঁ, সমাধান হয়েছে' : 'Yes, fully resolved')
                    : (lang === 'bn' ? 'না, সমাধান হয়নি' : 'No, not resolved')}
                </span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-200">
                <span className="text-slate-600 font-medium">
                  {lang === 'bn' ? 'সার্ভিস রেটিং:' : 'Service Rating:'}
                </span>
                <span className="font-bold text-emerald-800 flex items-center gap-1">
                  <Star size={14} className="fill-amber-400 text-amber-400 inline" />
                  <span>{lang === 'bn' ? toBanglaNumber(rating) : rating} / {lang === 'bn' ? '৫' : '5'}</span>
                  <span>({getRatingText(rating, lang)})</span>
                </span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-slate-600 font-medium">
                  {lang === 'bn' ? 'তারিখ:' : 'Date:'}
                </span>
                <span className="font-bold text-emerald-800">
                  {formatDateByLang(feedbackDate, lang)}
                </span>
              </div>
            </div>

            <div className="text-center pt-2">
              <p className="text-xs text-slate-400">
                {lang === 'bn' ? 'আপনার দিনটি শুভ হোক! ❤️' : 'Wishing you a wonderful day! ❤️'}
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center py-4 text-xs text-slate-400">
          {lang === 'bn' 
            ? `© ${toBanglaNumber(new Date().getFullYear())} টিপসই • ইনোভেস টেকনোলজিস লিমিটেড • সর্বস্বত্ব সংরক্ষিত`
            : `© ${new Date().getFullYear()} Tipsoi • Inovace Technologies Ltd. • All rights reserved`}
        </div>
      </div></FeedbackShell>
    );
  }

  // State 3: Active Feedback Form - Clean Solid Light Slate-50 Background
  const issueDateFormatted = formatDateByLang(issue.issue_date || issue.created_at, lang);

  return (
    <FeedbackShell><div className={`min-h-screen bg-slate-50 flex flex-col justify-between py-6 px-4 sm:px-6 ${lang === 'bn' ? 'font-bangla' : ''}`}>
      <div className="max-w-3xl w-full mx-auto space-y-6">
        
        {/* Top Header Bar with Brand and Language Switcher */}
        <div className="flex items-center justify-between">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-white text-indigo-700 rounded-full border border-slate-200 shadow-xs text-xs font-semibold">
            <Headphones size={15} className="text-indigo-600" />
            <span>
              {lang === 'bn' ? 'টিপসই কাস্টমার সাপোর্ট সার্ভিস' : 'Tipsoi Customer Support Service'}
            </span>
          </div>

          {/* Language Switcher in the top corner */}
          {renderLanguageSwitcher()}
        </div>

        <div className="feedback-intro"><span aria-hidden="true">👋</span><h1>{lang === 'bn' ? 'আপনার অভিজ্ঞতা কেমন ছিল?' : 'How was your experience?'}</h1><p>{lang === 'bn' ? 'আপনার একটুখানি মতামত আমাদের আরও ভালো করতে সাহায্য করে।' : 'A little feedback helps us make your next experience even better.'}</p></div>
        {/* Main Heading & Greeting Hero Card */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 sm:p-7 space-y-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shrink-0 font-bold text-xl shadow-sm">
              {issue.client_name ? issue.client_name.charAt(0).toUpperCase() : 'C'}
            </div>
            <div className="space-y-1.5">
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                {lang === 'bn' ? 'প্রিয় গ্রাহক' : 'Dear Valued Customer'}{' '}
                <span className="text-indigo-600 font-extrabold">{issue.client_name}</span>,
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                {lang === 'bn' ? (
                  <>
                    আপনি গত <span className="font-semibold text-slate-800">{issueDateFormatted}</span> তারিখে টিপসই থেকে সাপোর্ট নিয়েছিলেন। আমাদের সেবার মান সম্পর্কে আপনার মূল্যবান মতামত প্রদান করুন। আপনার মতামত আমাদের সেবার মান উন্নত করতে সহায়তা করবে।
                  </>
                ) : (
                  <>
                    You received technical support from Tipsoi on <span className="font-semibold text-slate-800">{issueDateFormatted}</span>. Please share your valuable feedback regarding our service quality. Your feedback helps us continually improve our support experience.
                  </>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Feedback Form Card */}
        <form onSubmit={handleSubmit} className="bg-white rounded-3xl shadow-md border border-slate-200 p-6 sm:p-8 space-y-7">
          {errorMessage && (
            <div role="alert" className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs sm:text-sm flex items-center gap-3 animate-in fade-in">
              <AlertCircle size={18} className="shrink-0 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Question 1: Resolved Confirmed - Only Yes and No */}
          <div className="space-y-3.5">
            <label className="block text-sm sm:text-base font-bold text-slate-900">
              {lang === 'bn' ? (
                <>১. আপনার সমস্যাটি কি সমাধান হয়েছে? <span className="text-rose-500">*</span></>
              ) : (
                <>1. Has your issue been resolved? <span className="text-rose-500">*</span></>
              )}
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Option: Yes */}
              <button
                type="button"
                onClick={() => {
                  setResolvedConfirmed('Yes');
                  setErrorMessage('');
                }}
                className={"" + (`p-4 rounded-2xl border text-left transition-all duration-200 flex items-center gap-3.5 cursor-pointer group ${
                  resolvedConfirmed === 'Yes'
                    ? 'border-emerald-500 bg-emerald-50/70 text-emerald-950 ring-2 ring-emerald-500/20 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50 bg-white text-slate-700'
                }`)}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                  resolvedConfirmed === 'Yes' 
                    ? 'bg-emerald-600 text-white shadow-xs' 
                    : 'bg-slate-100 text-slate-400 group-hover:bg-slate-200'
                }`}>
                  <CheckCircle2 size={20} />
                </div>
                <div>
                  <div className="font-bold text-base">
                    {lang === 'bn' ? 'হ্যাঁ' : 'Yes'}
                  </div>
                  <div className="text-xs text-slate-500">
                    {lang === 'bn' ? 'সম্পূর্ণ সমাধান হয়েছে' : 'Fully resolved'}
                  </div>
                </div>
              </button>

              {/* Option: No */}
              <button
                type="button"
                onClick={() => {
                  setResolvedConfirmed('No');
                  setErrorMessage('');
                }}
                className={"" + (`p-4 rounded-2xl border text-left transition-all duration-200 flex items-center gap-3.5 cursor-pointer group ${
                  resolvedConfirmed === 'No'
                    ? 'border-rose-500 bg-rose-50/70 text-rose-950 ring-2 ring-rose-500/20 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50 bg-white text-slate-700'
                }`)}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                  resolvedConfirmed === 'No' 
                    ? 'bg-rose-600 text-white shadow-xs' 
                    : 'bg-slate-100 text-slate-400 group-hover:bg-slate-200'
                }`}>
                  <XCircle size={20} />
                </div>
                <div>
                  <div className="font-bold text-base">
                    {lang === 'bn' ? 'না' : 'No'}
                  </div>
                  <div className="text-xs text-slate-500">
                    {lang === 'bn' ? 'এখনও সমাধান হয়নি' : 'Not resolved yet'}
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Question 2: Satisfaction Rating (1 to 5) */}
          <div className="space-y-3.5 pt-1">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
              <label className="block text-sm sm:text-base font-bold text-slate-900">
                {lang === 'bn' ? (
                  <>২. আমাদের কাস্টমার সেবায় আপনি কতটা সন্তুষ্ট? <span className="text-rose-500">*</span></>
                ) : (
                  <>2. How satisfied are you with our customer support? <span className="text-rose-500">*</span></>
                )}
              </label>
              <span className="text-[11px] text-slate-400 font-medium">
                {lang === 'bn' ? '১ থেকে ৫ এর মধ্যে রেটিং দিন' : 'Rate between 1 and 5'}
              </span>
            </div>

            {/* 1 to 5 Rating Cards */}
            <div className="feedback-ratings grid grid-cols-5 gap-2.5">
              {RATING_OPTIONS.map((opt) => {
                const isSelected = rating === opt.value;
                const starsCount = opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    aria-pressed={isSelected}
                    aria-label={`${opt.value} / 5 — ${lang === 'bn' ? opt.labelBn : opt.labelEn}`}
                    onClick={() => handleSelectRating(opt.value)}
                    className={"" + (`p-3.5 rounded-2xl border text-center transition-all duration-200 flex flex-col items-center justify-between gap-2 cursor-pointer group ${
                      isSelected
                        ? `${opt.activeBg} ${opt.activeBorder} ${opt.activeText} shadow-sm`
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/70 bg-white text-slate-700'
                    }`)}
                  >
                    <span className="rating-emoji" aria-hidden="true">{opt.emoji}</span>
                    {/* Rating Number & Star Icon */}
                    <div className="flex items-center justify-center gap-1">
                      <span className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm font-extrabold transition-all ${
                        isSelected 
                          ? 'bg-indigo-600 text-white shadow-xs' 
                          : 'bg-slate-100 text-slate-700 group-hover:bg-slate-200'
                      }`}>
                        {lang === 'bn' ? toBanglaNumber(opt.value) : opt.value}
                      </span>
                    </div>

                    {/* Star Display */}
                    <div className="rating-stars flex items-center gap-0.5 my-0.5" aria-hidden="true">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star 
                          key={s} 
                          size={13} 
                          className={s <= starsCount 
                            ? 'fill-amber-400 text-amber-400' 
                            : 'text-slate-200'
                          } 
                        />
                      ))}
                    </div>

                    {/* Main Label and Description */}
                    <div>
                      <div className="font-bold text-sm leading-tight">
                        {lang === 'bn' ? opt.labelBn : opt.labelEn}
                      </div>
                      <div className="text-[10px] text-slate-400 font-medium mt-0.5">
                        {lang === 'bn' ? opt.descBn : opt.descEn}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Feedback Rating Selection Banner */}
            {rating > 0 && (
              <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl text-xs flex items-center justify-between animate-in fade-in duration-200">
                <span className="font-medium text-indigo-900">
                  {lang === 'bn' ? 'আপনার নির্বাচিত রেটিং:' : 'Your selected rating:'}
                </span>
                <span className="font-extrabold text-indigo-700 flex items-center gap-1 text-sm">
                  <Star size={14} className="fill-amber-400 text-amber-400" />
                  <span>{lang === 'bn' ? toBanglaNumber(rating) : rating} / {lang === 'bn' ? '৫' : '5'}</span>
                  <span>- {getRatingText(rating, lang)}</span>
                </span>
              </div>
            )}
          </div>

          {/* Question 3: Feedback Date (Running Date) */}
          <div className="space-y-2 pt-1">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
              <label className="text-sm sm:text-base font-bold text-slate-900">
                {lang === 'bn' ? '৩. মতামত প্রদানের তারিখ' : '3. Feedback Date'}
              </label>
              <span className="text-[11px] text-slate-400 font-medium">
                {lang === 'bn' ? 'আজকের তারিখ স্বয়ংক্রিয়ভাবে নির্বাচিত' : "Today's running date is selected"}
              </span>
            </div>
            <div className="relative">
              <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={17} />
              <input
                type="date"
                value={feedbackDate}
                onChange={(e) => setFeedbackDate(e.target.value)}
                className="w-full pl-10 pr-3.5 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
              />
            </div>
          </div>

          {/* Optional Comment */}
          <div className="space-y-2 pt-1">
            <label className="block text-sm font-bold text-slate-800">
              {lang === 'bn' ? 'অতিরিক্ত কোনো মন্তব্য বা পরামর্শ (ঐচ্ছিক)' : 'Additional comments or suggestions (Optional)'}
            </label>
            <textarea
              rows={3}
              maxLength={4000}
              value={customerComment}
              onChange={(e) => setCustomerComment(e.target.value)}
              placeholder={lang === 'bn' 
                ? 'সেবা সংক্রান্ত কোনো পরামর্শ বা বিশেষ মন্তব্য থাকলে এখানে লিখুন...' 
                : 'Share any additional thoughts or suggestions to help us improve...'}
              className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all resize-none"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-4 px-6 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold text-sm sm:text-base shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-[0.99]"
          >
            {submitting ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>{lang === 'bn' ? 'জমা দেওয়া হচ্ছে...' : 'Submitting feedback...'}</span>
              </>
            ) : (
              <>
                <Send size={18} />
                <span>{lang === 'bn' ? 'মতামত জমা দিন' : 'Submit Feedback'}</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* Footer */}
      <div className="text-center py-6 text-xs text-slate-400">
        {lang === 'bn' 
          ? `© ${toBanglaNumber(new Date().getFullYear())} টিপসই • ইনোভেস টেকনোলজিস লিমিটেড • সর্বস্বত্ব সংরক্ষিত`
          : `© ${new Date().getFullYear()} Tipsoi • Inovace Technologies Ltd. • All rights reserved`}
      </div>
    </div></FeedbackShell>
  );
};
