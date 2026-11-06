import { MetricIcon } from './common/MetricIcon';
import React, { useEffect, useState } from 'react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Activity, AlertCircle, ArrowRight, ArrowUpRight, Bug, CalendarDays, Check, ChevronLeft, ChevronRight, CircleHelp, FileBarChart2, Lightbulb, Plus, Smartphone, Users } from 'lucide-react';
import { dbService } from '../services/dbService';
import { Issue, MonthlyEntry, SystemDowntime } from '../types';
import { adminAuthService } from '../services/adminAuthService';
import { CHART_COLORS } from '../constants';

const tooltip = { contentStyle: { background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '8px', fontSize: '11px', color: 'var(--ink)' }, itemStyle: { color: 'var(--ink)' } };
const Dashboard: React.FC = () => {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [monthly, setMonthly] = useState<MonthlyEntry[]>([]);
  const [downtime, setDowntime] = useState<SystemDowntime[]>([]);
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [month, setMonth] = useState(String(new Date().getMonth() + 1).padStart(2, '0'));
  const [page, setPage] = useState(1);
  const config = adminAuthService.getModuleConfig();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const [i, m, d] = await Promise.all([dbService.getIssues(), dbService.getMonthlyEntries(), dbService.getDowntime()]);
        if (active) { setIssues(i); setMonthly(m); setDowntime(d); setError(''); }
      } catch { if (active) setError('Could not load workspace data. Please refresh to try again.'); }
      finally { if (active) setLoading(false); }
    };
    load();
    window.addEventListener('local-data-changed', load);
    window.addEventListener('storage', load);
    return () => { active = false; window.removeEventListener('local-data-changed', load); window.removeEventListener('storage', load); };
  }, []);
  useEffect(() => { setPage(1); }, [year, month]);
  const inPeriod = (date: string) => typeof date === 'string' && date.startsWith(year) && (!month || date.slice(5, 7) === month);
  const filtered = issues.filter(i => inPeriod(i.issue_date || i.created_at));
  const entry = month ? monthly.find(e => e.month === `${year}-${month}`) : undefined;
  const outages = downtime.filter(d => inPeriod(d.date));
  const stats = [
    { label: 'Total issues', value: entry?.total_issues ?? filtered.length, icon: AlertCircle, color: '#16766a', bg: '#eaf5f2', iconColor: 'text-indigo-600', iconBackground: 'bg-indigo-100 dark:bg-indigo-900/20' },
    { label: 'System bugs', value: entry?.system_bugs ?? filtered.filter(i => i.issue_type === 'System Bugs').length, icon: Bug, color: '#c87d78', bg: '#fbefee', iconColor: 'text-rose-600', iconBackground: 'bg-rose-100 dark:bg-rose-900/20' },
    { label: 'Device issues', value: entry?.device_issues ?? filtered.filter(i => i.issue_type === 'Device Issues').length, icon: Smartphone, color: '#bb9551', bg: '#fbf5e9', iconColor: 'text-amber-600', iconBackground: 'bg-amber-100 dark:bg-amber-900/20' },
    { label: 'Awareness', value: entry?.awareness ?? filtered.filter(i => i.issue_type === 'Awareness').length, icon: Lightbulb, color: '#759a71', bg: '#eff6ed', iconColor: 'text-emerald-600', iconBackground: 'bg-emerald-100 dark:bg-emerald-900/20' },
    { label: 'Help requests', value: entry?.help_requests ?? filtered.filter(i => i.issue_type === 'Help Requests').length, icon: CircleHelp, color: '#6b91bb', bg: '#edf3fa', iconColor: 'text-sky-600', iconBackground: 'bg-sky-100 dark:bg-sky-900/20' },
    { label: 'System downtime', value: outages.reduce((sum, d) => sum + d.duration_minutes, 0), icon: Activity, color: '#9380b7', bg: '#f2eef8', iconColor: 'text-fuchsia-600', iconBackground: 'bg-fuchsia-100 dark:bg-fuchsia-900/20' },
  ];
  const distribution = stats.slice(1, 5).map(s => ({ name: s.label, value: Number(s.value) })).filter(d => d.value > 0);
  const status = ['Open', 'Close', 'Pending', 'In Progress', 'Done'].map(name => ({ name, count: filtered.filter(i => i.status === name).length }));
  const counts = filtered.reduce((acc, i) => { acc[i.client_name] = (acc[i.client_name] || 0) + 1; return acc; }, {} as Record<string, number>);
  const reporters = Object.entries(counts).filter(([, count]) => count >= 2).sort((a, b) => b[1] - a[1]);
  const pages = Math.max(1, Math.ceil(reporters.length / 5));
  const timelineMap = new Map<string, number>();
  outages.forEach(d => timelineMap.set(d.date, (timelineMap.get(d.date) || 0) + d.duration_minutes));
  const timeline = Array.from(timelineMap).sort(([a], [b]) => a.localeCompare(b)).map(([date, duration]) => ({ date: month ? date.slice(8, 10) : date.slice(5), duration }));
  const recent = [...filtered].sort((a, b) => (b.created_at || '').localeCompare(a.created_at || '')).slice(0, 5);
  const periodLabel = month ? new Date(Number(year), Number(month) - 1).toLocaleDateString('en', { month: 'long', year: 'numeric' }) : year;

  return <div className="overview" aria-busy={loading}>
    <div className="overview-heading">
      <div><div className="eyebrow"><span className="status-dot" /> YOUR OPERATIONS AT A GLANCE</div><h1>Workspace overview<span style={{ color: '#91a29e' }}>.</span></h1><p>A clear view of your issues, customers and system performance.</p></div>
      
    </div>
    {error && <div role="alert" className="p-3 bg-rose-50 text-rose-700 rounded-lg text-xs">{error}</div>}
    <div className="overview-toolbar"><div className="overview-tab"><LayoutIcon />Performance overview</div><div className="date-filter"><CalendarDays size={13} /><select aria-label="Filter year" value={year} onChange={e => setYear(e.target.value)}>{Array.from(new Set([new Date().getFullYear(), ...issues.map(i => Number((i.issue_date || i.created_at).slice(0, 4))), ...Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i)])).filter(Number.isFinite).sort((a, b) => b - a).map(y => <option key={y} value={y}>{y}</option>)}</select><span style={{ color: 'var(--line)' }}>/</span><select aria-label="Filter month" value={month} onChange={e => setMonth(e.target.value)}><option value="">All months</option>{Array.from({ length: 12 }, (_, i) => <option key={i} value={String(i + 1).padStart(2, '0')}>{new Date(2000, i).toLocaleString('en', { month: 'long' })}</option>)}</select></div></div>
    <div className="metric-grid">{stats.map((stat, i) => <div className="metric-card group" key={stat.label}><div className="metric-top"><MetricIcon icon={stat.icon} color={stat.iconColor} background={stat.iconBackground} /><span className="metric-index">0{i + 1}</span></div><div className="metric-label">{stat.label}</div><div className="metric-value">{loading ? '—' : stat.value}{i === 5 && <span style={{ fontSize: 12, fontWeight: 400, letterSpacing: 0, color: 'var(--muted)', marginLeft: 5 }}>min</span>}</div></div>)}</div>
    <div className="chart-row">
      <section className="panel"><div className="panel-heading"><div><h3>Issue distribution</h3><p>Breakdown by issue type</p></div><span className="status-badge">{periodLabel}</span></div><div className="chart-body">{distribution.length ? <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={distribution} cx="50%" cy="45%" innerRadius={49} outerRadius={70} paddingAngle={4} dataKey="value" stroke="none">{distribution.map((_, i) => <Cell key={i} fill={CHART_COLORS[i]} />)}</Pie><Tooltip {...tooltip} /><Legend iconType="circle" iconSize={6} wrapperStyle={{ fontSize: 9 }} /></PieChart></ResponsiveContainer> : <div className="chart-empty"><div className="empty-ring">0</div><p>No issues in this period</p></div>}</div></section>
      <section className="panel"><div className="panel-heading"><div><h3>Status breakdown</h3><p>Where your issues stand</p></div><Activity size={15} className="text-slate-400" /></div><div className="chart-body"><ResponsiveContainer width="100%" height="100%"><BarChart data={status} margin={{ top: 10, left: -24, right: 0, bottom: 0 }}><CartesianGrid strokeDasharray="3 4" vertical={false} stroke="var(--line)" /><XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 8, fill: 'var(--muted)' }} /><YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: 'var(--muted)' }} /><Tooltip {...tooltip} cursor={{ fill: 'var(--soft)' }} /><Bar dataKey="count" name="Issues" fill="#258f80" radius={[4, 4, 0, 0]} barSize={23}>{status.map((_, i) => <Cell key={i} fill={['#258f80', '#98a8b5', '#d7b46f', '#899bc0', '#7db79c'][i]} />)}</Bar></BarChart></ResponsiveContainer></div></section>
      <section className="panel"><div className="panel-heading"><div><h3>Frequent reporters</h3><p>Customers with 2 or more issues</p></div><Users size={15} className="text-slate-400" /></div>{reporters.length ? <div className="reporter-list">{reporters.slice((page - 1) * 5, page * 5).map(([name, count]) => <div key={name} className="reporter-row"><span className="reporter-avatar">{name.slice(0, 2).toUpperCase()}</span><strong>{name}</strong><span>{count} issues</span></div>)}{pages > 1 && <div className="flex items-center justify-between pt-3 text-xs"><button className="icon-button" aria-label="Previous reporters" onClick={() => setPage(p => p - 1)} disabled={page === 1}><ChevronLeft size={14} /></button><span>{page} / {pages}</span><button className="icon-button" aria-label="Next reporters" onClick={() => setPage(p => p + 1)} disabled={page === pages}><ChevronRight size={14} /></button></div>}</div> : <div className="empty-state" style={{ minHeight: 205 }}><Users /><strong>All clear for now</strong><p>Customers with repeated issues will appear here.</p></div>}</section>
    </div>
    <section className="panel"><div className="panel-heading"><div><h3>System downtime timeline</h3><p>Daily downtime across your systems · {periodLabel}</p></div></div><div style={{ height: 185, padding: '0 20px 14px' }}><ResponsiveContainer width="100%" height="100%"><AreaChart data={timeline.length ? timeline : [{ date: '01', duration: 0 }, { date: month ? String(new Date(Number(year), Number(month), 0).getDate()) : '12', duration: 0 }]} margin={{ left: -22, top: 10, right: 8, bottom: 0 }}><defs><linearGradient id="downtimeFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#258f80" stopOpacity={0.16} /><stop offset="100%" stopColor="#258f80" stopOpacity={0.01} /></linearGradient></defs><CartesianGrid strokeDasharray="3 4" vertical={false} stroke="var(--line)" /><XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: 'var(--muted)' }} /><YAxis axisLine={false} tickLine={false} unit="m" tick={{ fontSize: 9, fill: 'var(--muted)' }} /><Tooltip {...tooltip} labelFormatter={label => `${month ? 'Day' : 'Date'} ${label}`} /><Area type="monotone" dataKey="duration" name="Downtime (min)" stroke="#258f80" strokeWidth={2} fill="url(#downtimeFill)" /></AreaChart></ResponsiveContainer></div></section>
    <section className="panel"><div className="panel-heading"><div><h3>Recent issues</h3><p>Your latest activity in this period</p></div></div>{recent.length ? <div className="recent-table"><table><thead><tr><th>Customer</th><th>Type</th><th>Assigned to</th><th>Status</th></tr></thead><tbody>{recent.map(issue => <tr key={issue.id}><td className="font-medium">{issue.client_name}</td><td>{issue.issue_type}</td><td>{issue.assigned_person}</td><td><span className="status-badge">{issue.status}</span></td></tr>)}</tbody></table></div> : <div className="empty-state"><FileBarChart2 /><strong>Your next issue starts here</strong><p>Create an issue to track progress and bring your workspace to life.</p></div>}</section>
  </div>;
};
const LayoutIcon = () => <Activity size={13} />;
export default Dashboard;
