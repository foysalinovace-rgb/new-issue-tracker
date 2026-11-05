import { ModuleWorkspace } from './common/ModuleWorkspace';
import React, { useState } from 'react';
import { 
  Megaphone, 
  Calendar, 
  Clock, 
  MapPin, 
  BookOpen, 
  Languages, 
  Copy, 
  Check, 
  Sparkles, 
  FileText 
} from 'lucide-react';

const BN_MONTHS = ['', 'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'];
const EN_MONTHS = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const D_MAP: { [key: string]: string } = {
  '0': '০', '1': '১', '2': '২', '3': '৩', '4': '৪', '5': '৫', '6': '৬', '7': '৭', '8': '৮', '9': '৯'
};

function toBn(n: string | number): string {
  return String(n).replace(/[0-9]/g, d => D_MAP[d] || d);
}

function ordinal(n: number) {
  if (n > 3 && n < 21) return n + 'th';
  switch (n % 10) {
    case 1:  return n + "st";
    case 2:  return n + "nd";
    case 3:  return n + "rd";
    default: return n + "th";
  }
}

function getTimeLabelBn(hour: string, ampm: string): string {
  const h = parseInt(hour, 10);
  if (isNaN(h)) return '';
  if (ampm === 'AM') {
    return h >= 5 ? 'সকাল' : 'রাত';
  } else {
    if (h === 12) return 'দুপুর';
    if (h <= 3) return 'দুপুর';
    if (h <= 6) return 'বিকাল';
    if (h <= 8) return 'সন্ধ্যা';
    return 'রাত';
  }
}

const MODE_BN = { online: 'অনলাইনে', offline: 'অফলাইনে', classroom: 'ক্লাসরুমে সরাসরি' };
const MODE_EN = { online: 'Online', offline: 'Offline', classroom: 'In-person (Classroom)' };

export default function NoticeGenerator() {
  // Get today's default date in YYYY-MM-DD
  const today = new Date().toISOString().split('T')[0];

  const [dateVal, setDateVal] = useState(today);
  const [hour, setHour] = useState('');
  const [minute, setMinute] = useState('00');
  const [ampm, setAmpm] = useState('AM');
  const [modeKey, setModeKey] = useState<'online' | 'offline' | 'classroom'>('online');
  const [topicBn, setTopicBn] = useState('');
  const [topicEn, setTopicEn] = useState('');

  // Generated notices
  const [generatedBn, setGeneratedBn] = useState('');
  const [generatedEn, setGeneratedEn] = useState('');
  const [isVisible, setIsVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<'bn' | 'en'>('bn');

  // Copy success states
  const [copiedBn, setCopiedBn] = useState(false);
  const [copiedEn, setCopiedEn] = useState(false);

  const handleGenerate = () => {
    if (!dateVal) {
      alert('দয়া করে একটি সঠিক তারিখ নির্বাচন করুন।\nPlease select a valid date.');
      return;
    }
    if (!hour) {
      alert('দয়া করে ঘণ্টা নির্বাচন করুন।\nPlease select an hour.');
      return;
    }

    const [year, monthStr, dayStr] = dateVal.split('-').map(Number);
    const day = dayStr || 1;
    const month = monthStr || 1;

    const currentTopicBn = topicBn.trim() || 'সফটওয়্যার ট্রেনিং';
    const currentTopicEn = topicEn.trim() || 'Software Training';

    // Bengali notice formatting
    const bnMin = minute !== '00' ? `:${toBn(minute)}` : '';
    const bnLabel = getTimeLabelBn(hour, ampm);
    const bnTime = `${bnLabel} ${toBn(hour)}${bnMin}:০০ টায়`;
    const bnText = `${toBn(day)} ${BN_MONTHS[month]} ${bnTime} ${MODE_BN[modeKey]} ${currentTopicBn} অনুষ্ঠিত হবে। উক্ত ট্রেনিংয়ে নির্ধারিত সময়ে আপনার অংশগ্রহণের জন্য বিনীত অনুরোধ রইলো। আপনার উপস্থিতি আমাদের জন্য অত্যন্ত মূল্যবান।`;

    // English notice formatting
    const enMin = minute !== '00' ? `:${minute}` : ':00';
    const enTime = `${hour}${enMin} ${ampm}`;
    const enText = `${MODE_EN[modeKey]} ${currentTopicEn} will be held on ${ordinal(day)} ${EN_MONTHS[month]} at ${enTime}. You are requested to join the training at the scheduled time.`;

    setGeneratedBn(bnText);
    setGeneratedEn(enText);
    setIsVisible(true);

    // Reset copy indicator states
    setCopiedBn(false);
    setCopiedEn(false);
  };

  const handleCopy = (lang: 'bn' | 'en') => {
    const textToCopy = lang === 'bn' ? generatedBn : generatedEn;
    
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(textToCopy).then(() => {
        if (lang === 'bn') {
          setCopiedBn(true);
          setTimeout(() => setCopiedBn(false), 2000);
        } else {
          setCopiedEn(true);
          setTimeout(() => setCopiedEn(false), 2000);
        }
      });
    } else {
      // Fallback
      const ta = document.createElement('textarea');
      ta.value = textToCopy;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand('copy');
        if (lang === 'bn') {
          setCopiedBn(true);
          setTimeout(() => setCopiedBn(false), 2000);
        } else {
          setCopiedEn(true);
          setTimeout(() => setCopiedEn(false), 2000);
        }
      } catch (err) {
        alert('কপি করতে পারেনি। অনুগ্রহ করে টেক্সটটি সিলেক্ট করে ম্যানুয়ালি কপি করুন।');
      }
      document.body.removeChild(ta);
    }
  };

  return <ModuleWorkspace id="NoticeGenerator" number="10" title="Notice studio" description="Create polished notices in Bengali and English from one simple brief." category="Workspace tools" kind="studio"><div className="v2-page-content">
    <div className="notice-studio-layout">
      <div className="notice-composer"><div className="studio-section-caption"><span>01 / COMPOSE</span><Megaphone size={15} /></div><h2>Build your notice</h2><p className="studio-description">Set the schedule, location and topic. We’ll prepare both languages.</p>
        <div className="notice-field"><label htmlFor="notice-date" className="v2-label">Scheduled date</label><input className="v2-control" id="notice-date" type="date" value={dateVal} onChange={e => setDateVal(e.target.value)} /></div>
        <div className="notice-field"><label className="v2-label">Start time</label><div className="notice-time-controls"><select aria-label="Hour" className="v2-control" value={hour} onChange={e => setHour(e.target.value)}><option value="">Hour</option>{Array.from({ length: 12 }, (_, i) => <option key={i} value={i + 1}>{i + 1}</option>)}</select><select aria-label="Minutes" className="v2-control" value={minute} onChange={e => setMinute(e.target.value)}>{['00', '15', '30', '45'].map(m => <option key={m} value={m}>:{m}</option>)}</select><select aria-label="AM or PM" className="v2-control" value={ampm} onChange={e => setAmpm(e.target.value)}><option>AM</option><option>PM</option></select></div></div>
        <fieldset className="notice-field"><legend className="v2-label">Training mode</legend><div className="notice-mode-options">{(['online', 'offline', 'classroom'] as const).map(mode => <button type="button" key={mode} className={modeKey === mode ? 'selected' : ''} aria-pressed={modeKey === mode} onClick={() => setModeKey(mode)}>{mode === 'classroom' ? 'Classroom' : mode === 'online' ? 'Online' : 'Offline'}</button>)}</div></fieldset>
        <div className="notice-field"><label htmlFor="notice-topic-bn" className="v2-label">Topic in Bengali <span>বাংলা</span></label><input id="notice-topic-bn" className="v2-control font-bangla" placeholder="সফটওয়্যার ট্রেনিং" value={topicBn} onChange={e => setTopicBn(e.target.value)} /></div>
        <div className="notice-field"><label htmlFor="notice-topic-en" className="v2-label">Topic in English <span>EN</span></label><input id="notice-topic-en" className="v2-control" placeholder="Software Training" value={topicEn} onChange={e => setTopicEn(e.target.value)} /></div>
        <button className="v2-button v2-primary notice-generate" onClick={handleGenerate}><Sparkles size={14} />Generate notice<ChevronRightIcon /></button>
      </div>
      <div className="notice-preview-desk"><div className="studio-section-caption"><span>02 / PREVIEW</span><FileText size={15} /></div><div className="notice-preview-toolbar"><h2>Your notice, ready to share</h2><div><button className={activeTab === 'bn' ? 'selected' : ''} onClick={() => setActiveTab('bn')}>বাংলা</button><button className={activeTab === 'en' ? 'selected' : ''} onClick={() => setActiveTab('en')}>English</button></div></div>
        <div className={`notice-paper ${isVisible ? 'has-content' : ''}`}><div className="notice-paper-top"><span>Inovace Technologies Ltd.</span><span>OFFICIAL NOTICE</span></div>{isVisible ? <><span className="notice-paper-kicker">{activeTab === 'bn' ? 'প্রশিক্ষণের নোটিশ' : 'TRAINING ANNOUNCEMENT'}</span><h3>{activeTab === 'bn' ? topicBn.trim() || 'সফটওয়্যার ট্রেনিং' : topicEn.trim() || 'Software Training'}</h3><div className="notice-paper-rule" /><p className={activeTab === 'bn' ? 'font-bangla' : ''}>{activeTab === 'bn' ? generatedBn : generatedEn}</p><div className="notice-paper-sign">{activeTab === 'bn' ? 'ধন্যবাদান্তে, Inovace Technologies Ltd. টিম' : 'With regards, The Inovace Technologies Ltd. Team'}</div></> : <div className="notice-paper-empty"><Languages size={37} strokeWidth={1} /><h3>Your words, beautifully prepared.</h3><p>Complete the brief and generate a notice.<br />Bengali and English versions will appear here.</p></div>}<div className="notice-paper-bottom"><span>COMMUNICATIONS DESK</span><span>{activeTab === 'bn' ? 'BN' : 'EN'} / 01</span></div></div>
        {isVisible && <button className="notice-copy" onClick={() => handleCopy(activeTab)}>{(activeTab === 'bn' ? copiedBn : copiedEn) ? <Check size={14} /> : <Copy size={14} />}{(activeTab === 'bn' ? copiedBn : copiedEn) ? 'Copied to clipboard' : activeTab === 'bn' ? 'Copy Bengali notice' : 'Copy English notice'}</button>}
      </div>
    </div>
  </div></ModuleWorkspace>;
}
const ChevronRightIcon = () => <span aria-hidden="true">→</span>;
