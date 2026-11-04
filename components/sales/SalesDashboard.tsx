import { DataLedger, FilterDesk } from '../common/DataLedger';
import { ModuleWorkspace } from '../common/ModuleWorkspace';
import React, { useState, useEffect } from 'react';
import { 
  BadgeDollarSign, 
  TrendingUp, 
  Users, 
  ShoppingBag, 
  Award, 
  Calendar, 
  Filter, 
  ArrowUpRight, 
  PlusCircle, 
  CheckCircle, 
  AlertCircle,
  FileText,
  Clock,
  Sparkles
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  BarChart, 
  Bar, 
  LabelList,
  PieChart, 
  Pie, 
  Cell, 
  Legend 
} from 'recharts';
import { salesService } from '../../services/salesService';
import { SalesRecord, SalesMetrics } from '../../types/sales';
import { dbService } from '../../services/dbService';

const COLORS = ['#10b981', '#258f80', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4', '#f97316'];

export const SalesDashboard: React.FC = () => {
  const [sales, setSales] = useState<SalesRecord[]>([]);
  const [assignedPersons, setAssignedPersons] = useState<string[]>([]);
  const [metrics, setMetrics] = useState<SalesMetrics>(() => salesService.getSalesMetrics());

  // Filters
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [selectedRep, setSelectedRep] = useState<string>('all');

  const loadData = () => {
    const list = salesService.getSales();
    setSales(list);
    const m = salesService.getSalesMetrics(selectedMonth, selectedRep, selectedYear);
    setMetrics(m);
  };

  useEffect(() => {
    dbService.getSettingsByCategory('assigned_person').then((items) => {
      const names = items.map((i) => i.name).filter(Boolean);
      if (names.length > 0) {
        setAssignedPersons(names);
      } else {
        setAssignedPersons(['Fuad', 'Rahat', 'Foysal', 'Taqi', 'Fariha']);
      }
    }).catch(() => {
      setAssignedPersons(['Fuad', 'Rahat', 'Foysal', 'Taqi', 'Fariha']);
    });

    // Fetch latest sales from Supabase
    salesService.fetchSalesFromDb().then((fresh) => {
      if (fresh && Array.isArray(fresh)) {
        setSales(fresh);
        setMetrics(salesService.getSalesMetrics(selectedMonth, selectedRep, selectedYear));
      } else {
        loadData();
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    loadData();
    const handleUpdate = () => loadData();
    window.addEventListener('sales-updated', handleUpdate);
    return () => window.removeEventListener('sales-updated', handleUpdate);
  }, [selectedYear, selectedMonth, selectedRep]);

  const monthsList = [
    { value: 'all', label: 'All Months' },
    { value: '01', label: 'January' },
    { value: '02', label: 'February' },
    { value: '03', label: 'March' },
    { value: '04', label: 'April' },
    { value: '05', label: 'May' },
    { value: '06', label: 'June' },
    { value: '07', label: 'July' },
    { value: '08', label: 'August' },
    { value: '09', label: 'September' },
    { value: '10', label: 'October' },
    { value: '11', label: 'November' },
    { value: '12', label: 'December' },
  ];

  const years = ['all', '2026', '2025', '2024'];

  const recentSales = sales.slice(0, 10);

  return (
    <ModuleWorkspace data-ui="v2" id="SalesDashboard" number="13" title="Revenue overview" description="The full picture of your deals, products and commercial performance." category="Sales workspace" kind="insights" links={[{"label":"Record a sale","path":"/sales/add"},{"label":"Sales ledger","path":"/sales/report"}]}><div className="v2-page-content">
      

      {/* Filter Toolbar */}
      <FilterDesk><div className="v2-surface bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4" data-filter-layout="">
        <div className="flex items-center gap-2">
          <Filter size={16} className="text-slate-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Sales Filters:
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2.5" data-filter-group="">
          {/* Year */}
          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700" data-filter-field="field">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Year:</span>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="v2-control bg-transparent text-xs font-semibold text-slate-800 dark:text-slate-200 outline-none cursor-pointer"
            >
              <option value="all" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">All Years</option>
              {years.filter(y => y !== 'all').map((yr) => (
                <option key={yr} value={yr} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">{yr}</option>
              ))}
            </select>
          </div>

          {/* Month */}
          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700" data-filter-field="field">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Month:</span>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="v2-control bg-transparent text-xs font-semibold text-slate-800 dark:text-slate-200 outline-none cursor-pointer"
            >
              {monthsList.map((m) => (
                <option key={m.value} value={m.value} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">{m.label}</option>
              ))}
            </select>
          </div>

          {/* Sales Rep */}
          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700" data-filter-field="field">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Rep:</span>
            <select
              value={selectedRep}
              onChange={(e) => setSelectedRep(e.target.value)}
              className="v2-control bg-transparent text-xs font-semibold text-slate-800 dark:text-slate-200 outline-none cursor-pointer"
            >
              <option value="all" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">All Reps</option>
              {Array.from(new Set([...assignedPersons, ...sales.map((s) => s.sold_by)].filter(Boolean))).sort().map((rep) => (
                <option key={rep} value={rep} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">{rep}</option>
              ))}
            </select>
          </div>

          {(selectedYear !== 'all' || selectedMonth !== 'all' || selectedRep !== 'all') && (
            <button
              onClick={() => {
                setSelectedYear('all');
                setSelectedMonth('all');
                setSelectedRep('all');
              }}
              className="v2-button px-2.5 py-1 rounded-lg text-xs font-semibold text-rose-600 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 transition-colors"
            >
              Reset ✕
            </button>
          )}
        </div>
      </div></FilterDesk>

      {/* Top Key Metrics KPI Grid */}
      <div className="v2-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Total Sales Revenue */}
        <div className="v2-surface bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Total Sales Revenue
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <BadgeDollarSign size={18} />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-2 font-mono">
            ৳{metrics.totalRevenue.toLocaleString()}
          </p>
          <div className="flex items-center gap-2 mt-2 text-[11px]">
            <span className="text-emerald-600 font-semibold">
              Paid: ৳{metrics.paidRevenue.toLocaleString()}
            </span>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <span className="text-amber-600 font-medium">
              Due: ৳{metrics.dueRevenue.toLocaleString()}
            </span>
          </div>
        </div>

        {/* 2. Total Deals Closed */}
        <div className="v2-surface bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Deals Closed
            </span>
            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <TrendingUp size={18} />
            </div>
          </div>
          <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-2 font-mono">
            {metrics.totalDeals}
          </p>
          <p className="text-[11px] text-slate-400 mt-2">
            Average Deal: <strong className="text-slate-700 dark:text-slate-300">৳{metrics.averageDealValue.toLocaleString()}</strong>
          </p>
        </div>

        {/* 3. Products & Hardware Units Sold */}
        <div className="v2-surface bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Products Sold
            </span>
            <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <ShoppingBag size={18} />
            </div>
          </div>
          <p className="text-2xl font-black text-purple-600 dark:text-purple-400 mt-2 font-mono">
            {metrics.totalProductsSold} Units
          </p>
          <p className="text-[11px] text-slate-400 mt-2">
            Across {metrics.topProducts.length} product catalogs
          </p>
        </div>

        {/* 4. Top Sales Representative */}
        <div className="v2-surface bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Top Sales Rep
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Award size={18} />
            </div>
          </div>
          <p className="text-base font-bold text-slate-900 dark:text-white mt-2 truncate">
            {metrics.topSalesRep}
          </p>
          <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-2 flex items-center gap-1">
            <Sparkles size={11} /> Highest revenue closer
          </p>
        </div>
      </div>

      {/* Analytics Charts Grid */}
      <div className="v2-grid grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Chart 1: Revenue Over Time */}
        <div className="v2-surface bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="v2-heading text-sm font-bold text-slate-900 dark:text-white">
                Monthly Revenue Trend (BDT)
              </h3>
              <p className="text-xs text-slate-400">Total closed value trajectory by month</p>
            </div>
            <span className="text-xs font-mono font-bold text-emerald-600">
              ৳{metrics.totalRevenue.toLocaleString()}
            </span>
          </div>

          <div className="h-64 w-full">
            {metrics.monthlyRevenue.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={metrics.monthlyRevenue}>
                  <defs>
                    <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.15} />
                  <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} />
                  <YAxis 
                    stroke="#94a3b8" 
                    fontSize={11} 
                    tickFormatter={(val) => `৳${(val / 1000).toFixed(0)}k`} 
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#1e293b',
                      borderRadius: '12px',
                      color: '#fff',
                      fontSize: '12px'
                    }}
                    formatter={(val: any) => [`৳${Number(val).toLocaleString()}`, 'Revenue']}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#revenueGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                No monthly sales data matching filters.
              </div>
            )}
          </div>
        </div>

        {/* Chart 2: Sales by Representative */}
        <div className="v2-surface bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="v2-heading text-sm font-bold text-slate-900 dark:text-white">
                Revenue by Sales Representative
              </h3>
              <p className="text-xs text-slate-400">Total BDT closed per sales executive</p>
            </div>
            <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
              {metrics.salesByRep.length} Reps active
            </span>
          </div>

          <div className="h-64 w-full">
            {metrics.salesByRep.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={metrics.salesByRep} layout="vertical" margin={{ left: 10, right: 85, top: 5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#334155" opacity={0.15} />
                  <XAxis 
                    type="number" 
                    stroke="#94a3b8" 
                    fontSize={11} 
                    tickFormatter={(val) => `৳${(val / 1000).toFixed(0)}k`} 
                  />
                  <YAxis type="category" dataKey="rep" stroke="#94a3b8" fontSize={11} width={85} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#1e293b',
                      borderRadius: '12px',
                      color: '#fff',
                      fontSize: '12px'
                    }}
                    formatter={(val: any) => [`৳${Number(val).toLocaleString()}`, 'Closed Revenue']}
                  />
                  <Bar dataKey="revenue" fill="#258f80" radius={[0, 6, 6, 0]}>
                    <LabelList 
                      dataKey="revenue" 
                      position="right" 
                      formatter={(val: any) => `৳${Number(val || 0).toLocaleString()}`} 
                      className="text-[11px] font-bold fill-indigo-600 dark:fill-indigo-400"
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                No representative data available.
              </div>
            )}
          </div>

          {/* Detailed Sales Representative Revenue List */}
          {metrics.salesByRep.length > 0 && (
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <span>Sales Representative</span>
                <span>Sold Amount (BDT)</span>
              </div>
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {metrics.salesByRep.map((item, idx) => {
                  const totalRev = metrics.totalRevenue || 1;
                  const pct = Math.round((item.revenue / totalRev) * 100);
                  return (
                    <div 
                      key={item.rep} 
                      className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 flex items-center justify-between gap-3 hover:border-indigo-200 dark:hover:border-indigo-800 transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                            {item.rep}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            {item.deals} {item.deals === 1 ? 'deal' : 'deals'} • {pct}% of total sales
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-xs font-mono font-black text-indigo-600 dark:text-indigo-400 block">
                          ৳{item.revenue.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Chart 3: Top Selling Products */}
        <div className="v2-surface bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="v2-heading text-sm font-bold text-slate-900 dark:text-white">
                Top Products by Revenue & Qty
              </h3>
              <p className="text-xs text-slate-400">Best-selling hardware devices and modules</p>
            </div>
          </div>

          <div className="space-y-3 pt-1">
            {metrics.topProducts.slice(0, 5).map((prod, idx) => {
              const maxRev = metrics.topProducts[0]?.revenue || 1;
              const pct = Math.min(100, Math.round((prod.revenue / maxRev) * 100));

              return (
                <div key={prod.name} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-xs">
                      #{idx + 1} {prod.name}
                    </span>
                    <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
                      ৳{prod.revenue.toLocaleString()} ({prod.quantity} pcs)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Chart 4: SaaS Package Distribution */}
        <div className="v2-surface bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="v2-heading text-sm font-bold text-slate-900 dark:text-white">
                SaaS Package Distribution
              </h3>
              <p className="text-xs text-slate-400">Recurring software subscription tier share</p>
            </div>
          </div>

          <div className="h-64 w-full flex items-center justify-center">
            {metrics.packageBreakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={metrics.packageBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="revenue"
                    nameKey="name"
                  >
                    {metrics.packageBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#1e293b',
                      borderRadius: '12px',
                      color: '#fff',
                      fontSize: '12px'
                    }}
                    formatter={(val: any) => [`৳${Number(val).toLocaleString()}`, 'Revenue']}
                  />
                  <Legend 
                    verticalAlign="bottom" 
                    height={36} 
                    formatter={(value) => <span className="text-[11px] text-slate-700 dark:text-slate-300">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-slate-400 text-xs">No package data available.</div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Sales Table */}
      <div className="v2-surface bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="v2-heading text-sm font-bold text-slate-900 dark:text-white">
              Recent Sales Deals
            </h3>
            <p className="text-xs text-slate-400">Latest client transactions and orders</p>
          </div>
          
        </div>

        <div className="v2-ledger-scroll overflow-x-auto">
          <DataLedger><table className="v2-ledger w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/60 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Company Name</th>
                <th className="py-3 px-3">Contact Person</th>
                <th className="py-3 px-3">Products (Items)</th>
                <th className="py-3 px-3">SaaS Package</th>
                <th className="py-3 px-3">Total Value</th>
                <th className="py-3 px-3">Sold By</th>
                <th className="py-3 px-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {recentSales.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <ShoppingBag size={32} className="text-slate-300 dark:text-slate-700" />
                      <p className="font-semibold text-slate-600 dark:text-slate-400">No sales recorded yet</p>
                      <p className="text-xs text-slate-400">Add your first sales deal to view real-time metrics and charts</p>
                      
                    </div>
                  </td>
                </tr>
              ) : (
                recentSales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                    {sale.date}
                  </td>
                  <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                    {sale.company_name}
                  </td>
                  <td className="py-3.5 px-3">
                    <span className="text-slate-800 dark:text-slate-200 block">{sale.contact_person_name}</span>
                    <span className="text-[10px] text-slate-400 font-mono">{sale.contact_person_number}</span>
                  </td>
                  <td className="py-3.5 px-3 text-slate-600 dark:text-slate-400">
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {sale.products.length} line items
                    </span>
                    <span className="text-[10px] text-slate-400 block truncate max-w-[180px]">
                      {sale.products.map(p => `${p.name} (x${p.quantity})`).join(', ')}
                    </span>
                  </td>
                  <td className="py-3.5 px-3">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium">
                      {sale.saas_package}
                    </span>
                  </td>
                  <td className="py-3.5 px-3 font-bold text-emerald-600 dark:text-emerald-400 font-mono text-sm">
                    ৳{sale.total_value.toLocaleString()}
                  </td>
                  <td className="py-3.5 px-3 font-medium text-slate-800 dark:text-slate-200">
                    {sale.sold_by}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      sale.payment_status === 'Paid'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                        : sale.payment_status === 'Partial'
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                        : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                    }`}>
                      {sale.payment_status}
                    </span>
                  </td>
                </tr>
              )))}
            </tbody>
          </table></DataLedger>
        </div>
      </div>
    </div></ModuleWorkspace>
  );
};

