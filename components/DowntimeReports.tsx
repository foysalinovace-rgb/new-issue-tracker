import { downloadStyledReport } from '../lib/excelReport';
import { DrawerPortal } from './common/DrawerPortal';
import { DataLedger, FilterDesk } from './common/DataLedger';
import { ModuleWorkspace } from './common/ModuleWorkspace';

import React, { useState, useEffect } from 'react';
import { dbService } from '../services/dbService';
import { SystemDowntime } from '../types';
import { SYSTEMS } from '../constants';
import { Trash2, AlertTriangle, Calendar, Filter, Edit2, X, Activity, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';

const DowntimeReports: React.FC = () => {
  const [data, setData] = useState<SystemDowntime[]>([]);
  const [systemFilter, setSystemFilter] = useState('All');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<{show: boolean, id: string | null}>({ show: false, id: null });
  const [editingItem, setEditingItem] = useState<SystemDowntime | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const records = await dbService.getDowntime();
    setData(records.sort((a, b) => b.date.localeCompare(a.date)));
  };

  const handleDelete = (id: string) => {
    setShowDeleteConfirm({ show: true, id });
  };

  const confirmDelete = async () => {
    if (showDeleteConfirm.id) {
      await dbService.deleteDowntime(showDeleteConfirm.id);
      setShowDeleteConfirm({ show: false, id: null });
      loadData();
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingItem) {
      // Recalculate duration before saving
      const start = new Date(`${editingItem.date}T${editingItem.start_time}`);
      const end = new Date(`${editingItem.date}T${editingItem.end_time}`);
      let diff = (end.getTime() - start.getTime()) / (1000 * 60);
      if (diff < 0) diff += 1440;
      
      const updatedItem = {
        ...editingItem,
        duration_minutes: Math.round(diff)
      };

      await dbService.updateDowntime(editingItem.id, updatedItem);
      setEditingItem(null);
      loadData();
    }
  };

  const formatTo12h = (time24: string) => {
    if (!time24) return '';
    const [hours, minutes] = time24.split(':');
    let h = parseInt(hours);
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12;
    h = h ? h : 12; // the hour '0' should be '12'
    return `${h}:${minutes} ${ampm}`;
  };

  const filteredData = data.filter(d => {
    const matchesSystem = systemFilter === 'All' || d.system_name === systemFilter;
    const matchesFrom = fromDate ? d.date >= fromDate : true;
    const matchesTo = toDate ? d.date <= toDate : true;
    return matchesSystem && matchesFrom && matchesTo;
  });

  const exportExcel = () => {
    const headers = [
      'Incident Date',
      'Impacted System',
      'Start Time',
      'End Time',
      'Duration (Minutes)',
      'System Log Time'
    ];

    const rows = filteredData.map(d => [
      d.date || '',
      d.system_name || '',
      formatTo12h(d.start_time),
      formatTo12h(d.end_time),
      d.duration_minutes || 0,
      d.created_at ? new Date(d.created_at).toLocaleString() : ''
    ]);

    const totalDuration = filteredData.reduce((acc, curr) => acc + (curr.duration_minutes || 0), 0);

    // Append summary total row
    if (rows.length > 0) {
      rows.push([
        'TOTAL INCIDENTS: ' + rows.length,
        'ALL IMPACTED SYSTEMS',
        '-',
        '-',
        totalDuration,
        'TOTAL DOWNTIME (MINS)'
      ]);
    }

    // Create workbook and worksheet
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);

    // Set column widths for a polished layout
    const wscols = [
      { wch: 18 },  // Incident Date
      { wch: 28 },  // Impacted System
      { wch: 16 },  // Start Time
      { wch: 16 },  // End Time
      { wch: 22 },  // Duration (Minutes)
      { wch: 28 }   // System Log Time
    ];
    ws['!cols'] = wscols;

    if (rows.length > 1) {
      // Auto filter on data rows (excluding the summary row)
      ws['!autofilter'] = { ref: `A1:F${rows.length}` };
    }

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Downtime Report");

    // Save file with current date appended
    const today = new Date().toISOString().split('T')[0];
    downloadStyledReport(wb, `Downtime_Report_${today}.xlsx`);
  };

  const totalDowntime = filteredData.reduce((acc, curr) => acc + curr.duration_minutes, 0);

  return (
    <ModuleWorkspace data-ui="v2" id="DowntimeReports" number="09" title="Service reliability" description="Investigate interruptions and monitor how your systems recover." category="Infrastructure" kind="ledger" links={[{"label":"Log incident","path":"/downtime-entry"}]}><div className="v2-page-content">
      {/* Metrics Summary */}
      <div className="v2-grid grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="v2-surface bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Total Downtime</p>
          <div className="flex items-end gap-2">
            <h3 className="v2-heading text-3xl font-bold text-rose-600 dark:text-rose-500">{totalDowntime}</h3>
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Minutes</span>
          </div>
        </div>
        <div className="v2-surface bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Total Incidents</p>
          <h3 className="v2-heading text-3xl font-bold text-slate-900 dark:text-white">{filteredData.length}</h3>
        </div>
        <div className="v2-surface bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Average Duration</p>
          <h3 className="v2-heading text-3xl font-bold text-slate-900 dark:text-white">
            {filteredData.length > 0 ? (totalDowntime / filteredData.length).toFixed(1) : 0} <span className="text-sm font-medium text-slate-500 dark:text-slate-400">m</span>
          </h3>
        </div>
      </div>

      {/* Filter Toolbar */}
      <FilterDesk actions={<><button
          onClick={exportExcel}
          className="v2-button v2-primary px-4 py-2 bg-rose-600 dark:bg-rose-700 hover:bg-rose-700 dark:hover:bg-rose-600 text-white font-bold rounded-xl shadow-lg hover:shadow-rose-500/20 transition-all flex items-center gap-2 text-sm cursor-pointer ml-auto"
          title="Export report to Excel"
        >
          <FileSpreadsheet size={16} />
          Export Excel
        </button></>}><div className="v2-surface bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-wrap items-center gap-4" data-filter-layout="">
        <div data-filter-field="field"><span className="filter-field-label">System</span><div className="flex items-center gap-2 flex-1 min-w-[200px]" data-filter-input-wrap="">
          <Filter size={16} className="text-slate-400" />
          <select 
            value={systemFilter}
            onChange={(e) => setSystemFilter(e.target.value)}
            className="v2-control flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-rose-500"
          >
            <option value="All">All Systems</option>
            {SYSTEMS.map(s => <option key={s} value={s} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">{s}</option>)}
          </select>
        </div></div>
        <div className="flex items-center gap-2" data-filter-group="">
          <Calendar size={16} className="text-slate-400" />
          <div data-filter-field="field"><span className="filter-field-label">Date</span><input 
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="v2-control bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-white"
          /></div>
          <span className="text-slate-400 font-medium">to</span>
          <div data-filter-field="field"><span className="filter-field-label">Date</span><input 
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="v2-control bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-white"
          /></div>
        </div>
        
      </div></FilterDesk>

      {/* Table */}
      <div className="v2-surface bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="v2-ledger-scroll overflow-x-auto">
          <DataLedger><table className="v2-ledger w-full text-left">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Date</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">System</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Start Time</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">End Time</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Duration</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {filteredData.length > 0 ? filteredData.map(d => (
                <tr key={d.id} className="hover:bg-rose-50/10 dark:hover:bg-rose-900/5 transition-colors">
                  <td className="px-6 py-4 text-sm font-semibold text-slate-900 dark:text-white">{new Date(d.date).toLocaleDateString(undefined, { dateStyle: 'medium' })}</td>
                  <td className="px-6 py-4">
                    <span className="text-xs px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-md font-bold">
                      {d.system_name}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">{formatTo12h(d.start_time)}</td>
                  <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">{formatTo12h(d.end_time)}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-rose-600">{d.duration_minutes} min</span>
                      {d.duration_minutes > 120 && <AlertTriangle size={14} className="text-rose-500" />}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button 
                        onClick={() => setEditingItem(d)}
                        className="v2-button p-2 text-slate-400 hover:text-indigo-600 transition-colors"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => handleDelete(d.id)}
                        className="v2-button p-2 text-slate-400 hover:text-rose-600 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">No downtime incidents recorded for this period.</td>
                </tr>
              )}
            </tbody>
          </table></DataLedger>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm.show && (
        <DrawerPortal><div className="v2-overlay fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="v2-surface bg-white dark:bg-slate-900 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200">
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-full flex items-center justify-center mx-auto mb-6">
                <Trash2 size={32} />
              </div>
              <h3 className="v2-heading text-xl font-bold text-slate-900 dark:text-white mb-2">Delete Record</h3>
              <p className="text-slate-500 dark:text-slate-400">
                Are you sure you want to delete this downtime record? This action cannot be undone.
              </p>
              <div className="flex gap-3 mt-8">
                <button 
                  onClick={() => setShowDeleteConfirm({ show: false, id: null })}
                  className="v2-button flex-1 px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={confirmDelete}
                  className="v2-button v2-primary flex-1 px-4 py-3 bg-rose-600 text-white font-bold rounded-xl shadow-lg hover:bg-rose-700 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div></DrawerPortal>
      )}

      {/* Edit Modal */}
      {editingItem && (
        <DrawerPortal><div className="v2-overlay fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="v2-surface bg-white dark:bg-slate-900 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-rose-50 dark:bg-rose-900/20 text-rose-600 rounded-xl flex items-center justify-center">
                  <Activity size={20} />
                </div>
                <h3 className="v2-heading font-bold text-lg dark:text-white">Edit Downtime</h3>
              </div>
              <button 
                onClick={() => setEditingItem(null)} 
                className="v2-button p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleUpdate} className="v2-form p-8 space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="v2-label text-sm font-semibold text-slate-700 dark:text-slate-300">Incident Date</label>
                  <input 
                    type="date"
                    value={editingItem.date}
                    onChange={(e) => setEditingItem({...editingItem, date: e.target.value})}
                    className="v2-control w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl dark:text-white focus:ring-2 focus:ring-rose-500 outline-none"
                  />
                </div>

                <div className="space-y-2">
                  <label className="v2-label text-sm font-semibold text-slate-700 dark:text-slate-300">Impacted System</label>
                  <select 
                    value={editingItem.system_name}
                    onChange={(e) => setEditingItem({...editingItem, system_name: e.target.value})}
                    className="v2-control w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl dark:text-white focus:ring-2 focus:ring-rose-500 outline-none"
                  >
                    {SYSTEMS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                <div className="v2-grid grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="v2-label text-sm font-semibold text-slate-700 dark:text-slate-300">Start Time</label>
                    <input 
                      type="time"
                      value={editingItem.start_time}
                      onChange={(e) => setEditingItem({...editingItem, start_time: e.target.value})}
                      className="v2-control w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl dark:text-white focus:ring-2 focus:ring-rose-500 outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="v2-label text-sm font-semibold text-slate-700 dark:text-slate-300">End Time</label>
                    <input 
                      type="time"
                      value={editingItem.end_time}
                      onChange={(e) => setEditingItem({...editingItem, end_time: e.target.value})}
                      className="v2-control w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl dark:text-white focus:ring-2 focus:ring-rose-500 outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button 
                  type="button" 
                  onClick={() => setEditingItem(null)} 
                  className="v2-button flex-1 px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="v2-button v2-primary flex-1 px-4 py-3 bg-rose-600 text-white font-bold rounded-xl shadow-lg hover:bg-rose-700 transition-colors"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div></DrawerPortal>
      )}

      {/* Edit Modal */}
      {editingItem && (
        <DrawerPortal><div className="v2-overlay fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="v2-surface bg-white dark:bg-slate-900 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-rose-50 dark:bg-rose-900/20 text-rose-600 rounded-xl flex items-center justify-center">
                  <Activity size={20} />
                </div>
                <h3 className="v2-heading font-bold text-lg dark:text-white">Edit Downtime</h3>
              </div>
              <button 
                onClick={() => setEditingItem(null)} 
                className="v2-button p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleUpdate} className="v2-form p-8 space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="v2-label text-sm font-semibold text-slate-700 dark:text-slate-300">Incident Date</label>
                  <input 
                    type="date"
                    value={editingItem.date}
                    onChange={(e) => setEditingItem({...editingItem, date: e.target.value})}
                    className="v2-control w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl dark:text-white focus:ring-2 focus:ring-rose-500 outline-none"
                  />
                </div>

                <div className="space-y-2">
                  <label className="v2-label text-sm font-semibold text-slate-700 dark:text-slate-300">Impacted System</label>
                  <select 
                    value={editingItem.system_name}
                    onChange={(e) => setEditingItem({...editingItem, system_name: e.target.value})}
                    className="v2-control w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl dark:text-white focus:ring-2 focus:ring-rose-500 outline-none"
                  >
                    {SYSTEMS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                <div className="v2-grid grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="v2-label text-sm font-semibold text-slate-700 dark:text-slate-300">Start Time</label>
                    <input 
                      type="time"
                      value={editingItem.start_time}
                      onChange={(e) => setEditingItem({...editingItem, start_time: e.target.value})}
                      className="v2-control w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl dark:text-white focus:ring-2 focus:ring-rose-500 outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="v2-label text-sm font-semibold text-slate-700 dark:text-slate-300">End Time</label>
                    <input 
                      type="time"
                      value={editingItem.end_time}
                      onChange={(e) => setEditingItem({...editingItem, end_time: e.target.value})}
                      className="v2-control w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl dark:text-white focus:ring-2 focus:ring-rose-500 outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button 
                  type="button" 
                  onClick={() => setEditingItem(null)} 
                  className="v2-button flex-1 px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="v2-button v2-primary flex-1 px-4 py-3 bg-rose-600 text-white font-bold rounded-xl shadow-lg hover:bg-rose-700 transition-colors"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div></DrawerPortal>
      )}

      {/* Edit Modal */}
      {editingItem && (
        <DrawerPortal><div className="v2-overlay fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="v2-surface bg-white dark:bg-slate-900 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-rose-50 dark:bg-rose-900/20 text-rose-600 rounded-xl flex items-center justify-center">
                  <Activity size={20} />
                </div>
                <h3 className="v2-heading font-bold text-lg dark:text-white">Edit Downtime</h3>
              </div>
              <button 
                onClick={() => setEditingItem(null)} 
                className="v2-button p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleUpdate} className="v2-form p-8 space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="v2-label text-sm font-semibold text-slate-700 dark:text-slate-300">Incident Date</label>
                  <input 
                    type="date"
                    value={editingItem.date}
                    onChange={(e) => setEditingItem({...editingItem, date: e.target.value})}
                    className="v2-control w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl dark:text-white focus:ring-2 focus:ring-rose-500 outline-none"
                  />
                </div>

                <div className="space-y-2">
                  <label className="v2-label text-sm font-semibold text-slate-700 dark:text-slate-300">Impacted System</label>
                  <select 
                    value={editingItem.system_name}
                    onChange={(e) => setEditingItem({...editingItem, system_name: e.target.value})}
                    className="v2-control w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl dark:text-white focus:ring-2 focus:ring-rose-500 outline-none"
                  >
                    {SYSTEMS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                <div className="v2-grid grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="v2-label text-sm font-semibold text-slate-700 dark:text-slate-300">Start Time</label>
                    <input 
                      type="time"
                      value={editingItem.start_time}
                      onChange={(e) => setEditingItem({...editingItem, start_time: e.target.value})}
                      className="v2-control w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl dark:text-white focus:ring-2 focus:ring-rose-500 outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="v2-label text-sm font-semibold text-slate-700 dark:text-slate-300">End Time</label>
                    <input 
                      type="time"
                      value={editingItem.end_time}
                      onChange={(e) => setEditingItem({...editingItem, end_time: e.target.value})}
                      className="v2-control w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl dark:text-white focus:ring-2 focus:ring-rose-500 outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button 
                  type="button" 
                  onClick={() => setEditingItem(null)} 
                  className="v2-button flex-1 px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="v2-button v2-primary flex-1 px-4 py-3 bg-rose-600 text-white font-bold rounded-xl shadow-lg hover:bg-rose-700 transition-colors"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div></DrawerPortal>
      )}
    </div></ModuleWorkspace>
  );
};

export default DowntimeReports;
