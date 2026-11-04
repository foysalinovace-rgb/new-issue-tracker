import React, { useEffect, useState } from 'react';
import { Activity, ArrowRight, CheckCircle2, Clock3, Radio, CalendarDays } from 'lucide-react';
import { dbService } from '../services/dbService';
import { SettingItem } from '../types';
import { ModuleWorkspace } from './common/ModuleWorkspace';
export default function DowntimeEntry() {
  const [formData, setFormData] = useState({ date: new Date().toISOString().split('T')[0], system_name: '', start_time: '09:00', end_time: '10:00', duration_minutes: 60 });
  const [systems, setSystems] = useState<SettingItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { dbService.getSettingsByCategory('system_name').then(items => { setSystems(items); if (items[0]) setFormData(old => ({ ...old, system_name: items[0].name })); }); }, []);
  useEffect(() => {
    const start = new Date(`${formData.date}T${formData.start_time}`); const end = new Date(`${formData.date}T${formData.end_time}`);
    let duration = (end.getTime() - start.getTime()) / 60000; if (duration < 0) duration += 1440;
    setFormData(old => ({ ...old, duration_minutes: Number.isFinite(duration) ? Math.round(duration) : 0 }));
  }, [formData.date, formData.start_time, formData.end_time]);
  const submit = async (e: React.FormEvent) => { e.preventDefault(); setLoading(true); setError(''); setSuccess(false); try { await dbService.saveDowntime(formData); setSuccess(true); setTimeout(() => setSuccess(false), 3000); } catch { setError('Could not save this incident. Please try again.'); } finally { setLoading(false); } };
  return <ModuleWorkspace id="DowntimeEntry" number="08" title="Incident recorder" description="Capture an interruption, its affected system and the recovery window." category="Infrastructure" kind="editor" links={[{ label: 'Incident history', path: '/downtime-reports' }]}><div className="v2-page-content"><form className="v2-form incident-editor" onSubmit={submit}>
    <div className="editor-section-heading"><span className="editor-section-no">01</span><div><h2>Incident details</h2><p>Where and when did the interruption happen?</p></div></div>
    <div className="incident-fields"><div><label htmlFor="incident-date" className="v2-label"><CalendarDays size={13} />Incident date</label><input className="v2-control" id="incident-date" required type="date" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} /></div><div><label htmlFor="incident-system" className="v2-label"><Radio size={13} />Impacted system</label><select className="v2-control" id="incident-system" required value={formData.system_name} onChange={e => setFormData({ ...formData, system_name: e.target.value })}>{!systems.length && <option value="">No systems configured</option>}{systems.map(s => <option key={s.id}>{s.name}</option>)}</select></div></div>
    <div className="editor-section-heading"><span className="editor-section-no">02</span><div><h2>Interruption window</h2><p>Overnight recovery is calculated automatically.</p></div></div>
    <div className="incident-timeline"><div className="incident-time"><span className="timeline-dot" /><label htmlFor="incident-start">Service interrupted</label><input className="v2-control" id="incident-start" type="time" required value={formData.start_time} onChange={e => setFormData({ ...formData, start_time: e.target.value })} /></div><div className="timeline-connector"><span /><Clock3 size={18} /><span /></div><div className="incident-time"><span className="timeline-dot recovered" /><label htmlFor="incident-end">Service recovered</label><input className="v2-control" id="incident-end" type="time" required value={formData.end_time} onChange={e => setFormData({ ...formData, end_time: e.target.value })} /></div></div>
    <div className="incident-duration"><div><Activity size={21} /><span>Total interruption<strong>Calculated from your time window</strong></span></div><strong>{formData.duration_minutes}<small>minutes</small></strong></div>
    {success && <div role="status" className="editor-alert"><CheckCircle2 size={15} />Downtime entry recorded!</div>}{error && <div role="alert" className="editor-alert error">{error}</div>}
    <div className="editor-submit-bar"><span>Keep your reliability history complete.</span><button type="submit" className="v2-button v2-primary" disabled={loading || !formData.system_name}>{loading ? 'Recording…' : 'Log Incident'}<ArrowRight size={14} /></button></div>
  </form></div></ModuleWorkspace>;
}
