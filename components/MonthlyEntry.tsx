import React, { useState } from 'react';
import { CalendarDays, ArrowRight, CheckCircle2, Layers, Bug, Smartphone, Lightbulb, LifeBuoy } from 'lucide-react';
import { dbService } from '../services/dbService';
import { ModuleWorkspace } from './common/ModuleWorkspace';

const fields = [
  { key: 'total_issues', label: 'Total issues', note: 'All issues reported this month', icon: Layers },
  { key: 'system_bugs', label: 'System bugs', note: 'Software and platform incidents', icon: Bug },
  { key: 'device_issues', label: 'Device issues', note: 'Hardware and connected devices', icon: Smartphone },
  { key: 'awareness', label: 'Awareness', note: 'Customer guidance and education', icon: Lightbulb },
  { key: 'help_requests', label: 'Help requests', note: 'Support requests and assistance', icon: LifeBuoy },
] as const;
export default function MonthlyEntry() {
  const [formData, setFormData] = useState({ month: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`, total_issues: 0, system_bugs: 0, device_issues: 0, awareness: 0, help_requests: 0 });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setIsLoading(true); setError(''); setSuccess(false);
    try { await dbService.saveMonthlyEntry(formData); setSuccess(true); setTimeout(() => setSuccess(false), 3000); }
    catch { setError('Failed to save entry. Please try again.'); } finally { setIsLoading(false); }
  };
  return <ModuleWorkspace id="MonthlyEntry" number="06" title="Monthly metrics" description="Close the month with a clear, complete operational snapshot." category="Reporting desk" kind="editor" links={[{ label: 'Monthly reports', path: '/monthly-reports' }]}><div className="v2-page-content">
    <form className="v2-form metric-entry-editor" onSubmit={submit}>
      <div className="editor-section-heading"><span className="editor-section-no">01</span><div><h2>Reporting period</h2><p>Select the month this snapshot belongs to.</p></div></div>
      <div className="period-picker"><CalendarDays size={23} /><div><label className="v2-label" htmlFor="metrics-month">Target month</label><input className="v2-control" id="metrics-month" type="month" required value={formData.month} onChange={e => setFormData({ ...formData, month: e.target.value })} /></div><span>MONTHLY<br /><strong>SNAPSHOT</strong></span></div>
      <div className="editor-section-heading"><span className="editor-section-no">02</span><div><h2>Monthly Aggregate Entry</h2><p>Enter the totals for each operational category.</p></div></div>
      <div className="metric-entry-rows">{fields.map((field, i) => <div className={`metric-entry-row ${i === 0 ? 'is-total' : ''}`} key={field.key}><span className="entry-row-icon"><field.icon size={17} /></span><label htmlFor={`metric-${field.key}`}><strong>{field.label}</strong><small>{field.note}</small></label><input id={`metric-${field.key}`} aria-label={field.label} className="v2-control" type="number" min={0} required value={formData[field.key]} onChange={e => setFormData({ ...formData, [field.key]: parseInt(e.target.value) || 0 })} /><span className="entry-unit">issues</span></div>)}</div>
      {error && <div role="alert" className="editor-alert error">{error}</div>}{success && <div role="status" className="editor-alert"><CheckCircle2 size={15} />Monthly data saved!</div>}
      <div className="editor-submit-bar"><span>One snapshot. A clearer month.</span><button type="submit" disabled={isLoading} className="v2-button v2-primary">{isLoading ? 'Saving…' : 'Save Monthly Summary'}<ArrowRight size={14} /></button></div>
    </form>
  </div></ModuleWorkspace>;
}
