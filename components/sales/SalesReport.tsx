import { DrawerPortal } from '../common/DrawerPortal';
import { DataLedger, FilterDesk } from '../common/DataLedger';
import { ModuleWorkspace } from '../common/ModuleWorkspace';
import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  Download, 
  Calendar, 
  Eye, 
  Trash2, 
  Edit3, 
  X, 
  Check, 
  Building2, 
  User, 
  Phone, 
  Package, 
  BadgeDollarSign, 
  Layers, 
  PlusCircle, 
  Save, 
  Printer, 
  FileSpreadsheet,
  AlertTriangle,
  Receipt,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { salesService } from '../../services/salesService';
import { SalesRecord, SalesProductItem, PaymentStatus } from '../../types/sales';
import { dbService } from '../../services/dbService';

export const SalesReport: React.FC = () => {
  const [sales, setSales] = useState<SalesRecord[]>([]);
  const [assignedPersons, setAssignedPersons] = useState<string[]>([]);
  
  // Search and Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [selectedRep, setSelectedRep] = useState('all');
  const [selectedPaymentStatus, setSelectedPaymentStatus] = useState('all');
  const [selectedPackage, setSelectedPackage] = useState('all');

  // Pagination & Rows per page
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Modals state
  const [viewingSale, setViewingSale] = useState<SalesRecord | null>(null);
  const [editingSale, setEditingSale] = useState<SalesRecord | null>(null);
  const [deletingSaleId, setDeletingSaleId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const loadData = () => {
    const list = salesService.getSales();
    setSales(list);
  };

  useEffect(() => {
    loadData();
    // Fetch latest data from Supabase
    salesService.fetchSalesFromDb().then((fresh) => {
      if (fresh && Array.isArray(fresh)) {
        setSales(fresh);
      } else {
        loadData();
      }
    }).catch(() => {});

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

    const handleUpdate = () => loadData();
    window.addEventListener('sales-updated', handleUpdate);
    return () => window.removeEventListener('sales-updated', handleUpdate);
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Filter logic
  const filteredSales = sales.filter((sale) => {
    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchCompany = sale.company_name.toLowerCase().includes(q);
      const matchContact = sale.contact_person_name.toLowerCase().includes(q);
      const matchPhone = sale.contact_person_number.toLowerCase().includes(q);
      const matchId = sale.sale_id.toLowerCase().includes(q);
      const matchRep = sale.sold_by.toLowerCase().includes(q);
      const matchProduct = (sale.products || []).some((p) => p.name.toLowerCase().includes(q));

      if (!matchCompany && !matchContact && !matchPhone && !matchId && !matchRep && !matchProduct) {
        return false;
      }
    }

    // Date Range
    if (fromDate && sale.date < fromDate) return false;
    if (toDate && sale.date > toDate) return false;

    // Month
    if (selectedMonth !== 'all') {
      const m = sale.date.substring(5, 7);
      if (m !== selectedMonth) return false;
    }

    // Rep
    if (selectedRep !== 'all' && sale.sold_by.toLowerCase() !== selectedRep.toLowerCase()) {
      return false;
    }

    // Payment Status
    if (selectedPaymentStatus !== 'all' && sale.payment_status !== selectedPaymentStatus) {
      return false;
    }

    // SaaS Package
    if (selectedPackage !== 'all' && sale.saas_package !== selectedPackage) {
      return false;
    }

    return true;
  });

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, fromDate, toDate, selectedMonth, selectedRep, selectedPaymentStatus, selectedPackage]);

  const totalPages = Math.ceil(filteredSales.length / itemsPerPage) || 1;
  const paginatedSales = filteredSales.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Summary Metrics of filtered items
  const filteredRevenue = filteredSales.reduce((sum, s) => sum + (s.total_value || 0), 0);
  const filteredItemsCount = filteredSales.reduce(
    (sum, s) => sum + (s.products || []).reduce((pSum, p) => pSum + (p.quantity || 0), 0),
    0
  );
  const paidCount = filteredSales.filter((s) => s.payment_status === 'Paid').length;

  const handleClearFilters = () => {
    setSearchQuery('');
    setFromDate('');
    setToDate('');
    setSelectedMonth('all');
    setSelectedRep('all');
    setSelectedPaymentStatus('all');
    setSelectedPackage('all');
  };

  const handleDeleteConfirm = () => {
    if (!deletingSaleId) return;
    salesService.deleteSale(deletingSaleId);
    setDeletingSaleId(null);
    showToast('Sale record successfully removed.');
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSale) return;

    salesService.updateSale(editingSale.id, {
      date: editingSale.date,
      company_name: editingSale.company_name,
      contact_person_name: editingSale.contact_person_name,
      contact_person_number: editingSale.contact_person_number,
      products: editingSale.products,
      saas_package: editingSale.saas_package,
      saas_package_price: editingSale.saas_package_price,
      discount: editingSale.discount,
      total_value: editingSale.total_value,
      sold_by: editingSale.sold_by,
      payment_status: editingSale.payment_status,
      notes: editingSale.notes,
    });

    setEditingSale(null);
    showToast('Sale details updated successfully.');
  };

  const handleEditProductChange = (index: number, field: keyof SalesProductItem, value: any) => {
    if (!editingSale) return;
    const updatedProducts = [...editingSale.products];
    const item = { ...updatedProducts[index] };

    if (field === 'name') item.name = value;
    if (field === 'unit_price') item.unit_price = Math.max(0, Number(value) || 0);
    if (field === 'quantity') item.quantity = Math.max(1, Number(value) || 1);

    item.subtotal = item.unit_price * item.quantity;
    updatedProducts[index] = item;

    const productsSum = updatedProducts.reduce((sum, p) => sum + p.subtotal, 0);
    const newTotal = Math.max(0, productsSum + editingSale.saas_package_price - editingSale.discount);

    setEditingSale({
      ...editingSale,
      products: updatedProducts,
      total_value: newTotal,
    });
  };

  const handleAddEditProductRow = () => {
    if (!editingSale) return;
    const newProducts: SalesProductItem[] = [
      ...editingSale.products,
      {
        id: `p-${Date.now()}-${editingSale.products.length}`,
        name: '',
        unit_price: 0,
        quantity: 1,
        subtotal: 0,
      },
    ];
    setEditingSale({
      ...editingSale,
      products: newProducts,
    });
  };

  const handleRemoveEditProductRow = (index: number) => {
    if (!editingSale || editingSale.products.length <= 1) return;
    const updatedProducts = editingSale.products.filter((_, i) => i !== index);
    const productsSum = updatedProducts.reduce((sum, p) => sum + p.subtotal, 0);
    const newTotal = Math.max(0, productsSum + editingSale.saas_package_price - editingSale.discount);

    setEditingSale({
      ...editingSale,
      products: updatedProducts,
      total_value: newTotal,
    });
  };

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

  return (
    <ModuleWorkspace data-ui="v2" id="SalesReport" number="15" title="Sales ledger" description="Review orders, follow payments and keep every sale accounted for." category="Sales workspace" kind="ledger" links={[{"label":"Record a sale","path":"/sales/add"}]}><div className="v2-page-content">
      

      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-2xl border border-slate-700 text-xs font-semibold flex items-center gap-2 animate-bounce">
          <Check size={16} className="text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Filter and Control Bar Card */}
      <FilterDesk actions={<><button
              onClick={() => salesService.exportToExcel(filteredSales)}
              className="v2-button inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 transition-colors shadow-xs"
              title="Download Excel report with all product item details"
            >
              <FileSpreadsheet size={15} />
              <span>Export Excel (.xlsx)</span>
            </button></>} summary={<div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-slate-500">
              Showing: <strong className="text-slate-900 dark:text-white">{filteredSales.length}</strong> of {sales.length} transactions
            </span>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <span className="text-emerald-600 font-bold font-mono">
              Filtered Total: ৳{filteredRevenue.toLocaleString()}
            </span>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <span className="text-purple-600 font-semibold">
              {filteredItemsCount} total product units
            </span>
          </div>

          {(searchQuery || fromDate || toDate || selectedMonth !== 'all' || selectedRep !== 'all' || selectedPaymentStatus !== 'all' || selectedPackage !== 'all') && (
            <button
              onClick={handleClearFilters}
              className="v2-button text-xs text-rose-600 hover:text-rose-700 font-semibold self-start sm:self-auto"
            >
              Clear All Filters ✕
            </button>
          )}
        </div>}><div className="v2-surface bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4" data-filter-layout="">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4" data-filter-group="">
          {/* Search Box */}
          <div data-filter-field="search"><span className="filter-field-label">Search</span><div className="relative w-full md:w-96" data-filter-input-wrap="">
            <Search size={16} className="absolute left-3.5 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search company, contact person, phone, product, ID..."
              className="v2-control w-full pl-10 pr-4 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden text-slate-900 dark:text-white"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="v2-button absolute right-3 top-2.5 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                ✕
              </button>
            )}
          </div></div>

          {/* Export & Action Buttons */}
          <div className="flex items-center gap-2 self-end md:self-auto flex-wrap">
            
          </div>
        </div>

        {/* Detailed Filter Dropdowns */}
        <div className="v2-grid grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800" data-filter-group="">
          {/* Month */}
          <div data-filter-field="field">
            <label className="v2-label block text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500 mb-1">
              Month
            </label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="v2-control w-full text-xs py-1.5 px-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-hidden"
            >
              {monthsList.map((m) => (
                <option key={m.value} value={m.value} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          {/* Sales Rep */}
          <div data-filter-field="field">
            <label className="v2-label block text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500 mb-1">
              Sold By (Rep)
            </label>
            <select
              value={selectedRep}
              onChange={(e) => setSelectedRep(e.target.value)}
              className="v2-control w-full text-xs py-1.5 px-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-hidden"
            >
              <option value="all" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">All Sales Reps</option>
              {Array.from(new Set([...assignedPersons, ...sales.map((s) => s.sold_by)].filter(Boolean))).sort().map((rep) => (
                <option key={rep} value={rep} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                  {rep}
                </option>
              ))}
            </select>
          </div>

          {/* Payment Status */}
          <div data-filter-field="field">
            <label className="v2-label block text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500 mb-1">
              Payment Status
            </label>
            <select
              value={selectedPaymentStatus}
              onChange={(e) => setSelectedPaymentStatus(e.target.value)}
              className="v2-control w-full text-xs py-1.5 px-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-hidden"
            >
              <option value="all" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">All Statuses</option>
              <option value="Paid" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Paid</option>
              <option value="Partial" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Partial</option>
              <option value="Pending" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Pending</option>
              <option value="Due" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Due</option>
            </select>
          </div>

          {/* SaaS Package */}
          <div data-filter-field="field">
            <label className="v2-label block text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500 mb-1">
              SaaS Package
            </label>
            <select
              value={selectedPackage}
              onChange={(e) => setSelectedPackage(e.target.value)}
              className="v2-control w-full text-xs py-1.5 px-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-hidden"
            >
              <option value="all" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">All Packages</option>
              {Array.from(new Set(sales.map((s) => s.saas_package).filter(Boolean))).sort().map((pkg) => (
                <option key={pkg} value={pkg} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                  {pkg}
                </option>
              ))}
            </select>
          </div>

          {/* From Date */}
          <div data-filter-field="field">
            <label className="v2-label block text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500 mb-1">
              From Date
            </label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="v2-control w-full text-xs py-1.5 px-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-hidden"
            />
          </div>

          {/* To Date */}
          <div data-filter-field="field">
            <label className="v2-label block text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500 mb-1">
              To Date
            </label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="v2-control w-full text-xs py-1.5 px-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-hidden"
            />
          </div>
        </div>

        {/* Filter Summary Banner */}
        
      </div></FilterDesk>

      {/* Main Data Table */}
      <div className="v2-surface bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="v2-ledger-scroll overflow-x-auto">
          <DataLedger><table className="v2-ledger w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/70 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Company Name</th>
                <th className="py-3 px-3">Contact Person & Phone</th>
                <th className="py-3 px-4">Products (Items & Qty)</th>
                <th className="py-3 px-3">SaaS Package</th>
                <th className="py-3 px-3 font-mono">Total Value</th>
                <th className="py-3 px-3">Sold By</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-4 text-right sticky-action-header">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {filteredSales.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    No sales records found matching the current search criteria.
                  </td>
                </tr>
              ) : (
                paginatedSales.map((sale) => (
                  <tr
                    key={sale.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors group"
                  >
                    {/* Date */}
                    <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                      <span className="flex items-center gap-1.5 text-xs">
                        <Calendar size={13} className="text-slate-400" />
                        <span>{sale.date}</span>
                      </span>
                    </td>

                    {/* Company Name */}
                    <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                      {sale.company_name}
                    </td>

                    {/* Contact Person */}
                    <td className="py-3.5 px-3">
                      <div className="text-slate-800 dark:text-slate-200 font-medium">
                        {sale.contact_person_name}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        {sale.contact_person_number}
                      </div>
                    </td>

                    {/* Multiple Products Summary */}
                    <td className="py-3.5 px-4">
                      <div className="space-y-1 max-w-xs">
                        <span className="inline-block px-1.5 py-0.5 rounded-sm bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold">
                          {sale.products.length} line item{sale.products.length > 1 ? 's' : ''}
                        </span>
                        <div className="text-[11px] text-slate-600 dark:text-slate-400">
                          {sale.products.map((p, i) => (
                            <div key={i} className="truncate">
                              • {p.name} <span className="font-mono font-semibold">x{p.quantity}</span> (৳{p.unit_price.toLocaleString()})
                            </div>
                          ))}
                        </div>
                      </div>
                    </td>

                    {/* SaaS Package */}
                    <td className="py-3.5 px-3">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium whitespace-nowrap">
                        {sale.saas_package}
                      </span>
                      {sale.saas_package_price > 0 && (
                        <span className="text-[10px] text-slate-400 block font-mono mt-0.5">
                          + ৳{sale.saas_package_price.toLocaleString()}
                        </span>
                      )}
                    </td>

                    {/* Total Value (BDT) */}
                    <td className="py-3.5 px-3">
                      <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono text-sm block">
                        ৳{sale.total_value.toLocaleString()}
                      </span>
                      {sale.discount > 0 && (
                        <span className="text-[10px] text-rose-500 font-mono block">
                          -৳{sale.discount.toLocaleString()} disc.
                        </span>
                      )}
                    </td>

                    {/* Sold By (Sales Rep) */}
                    <td className="py-3.5 px-3 font-medium text-slate-800 dark:text-slate-200">
                      {sale.sold_by}
                    </td>

                    {/* Payment Status */}
                    <td className="py-3.5 px-3">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold inline-block ${
                        sale.payment_status === 'Paid'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                          : sale.payment_status === 'Partial'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                          : sale.payment_status === 'Due'
                          ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                          : 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                      }`}>
                        {sale.payment_status}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right sticky-action-cell">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setViewingSale(sale)}
                          className="v2-button p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-800 transition-colors"
                          title="View Details & Receipt"
                        >
                          <Eye size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingSale({ ...sale })}
                          className="v2-button p-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-slate-800 transition-colors"
                          title="Edit Sale"
                        >
                          <Edit3 size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingSaleId(sale.id)}
                          className="v2-button p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-800 transition-colors"
                          title="Delete Sale"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table></DataLedger>
        </div>

        {/* Pagination & Rows per page */}
        <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/30 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {filteredSales.length === 0
                ? 'Showing 0 of 0'
                : `Showing ${(currentPage - 1) * itemsPerPage + 1} to ${Math.min(currentPage * itemsPerPage, filteredSales.length)} of ${filteredSales.length}`}
            </span>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Rows per page:</span>
              <select 
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="v2-control bg-transparent text-xs font-bold text-slate-600 dark:text-slate-400 outline-none cursor-pointer border border-slate-200 dark:border-slate-700 rounded px-1.5 py-0.5"
              >
                {[10, 20, 50, 100, 500, 1000].map(v => (
                  <option key={v} value={v} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">
                    {v}
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          {totalPages > 1 && (
            <div className="flex items-center gap-1.5">
              <button 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="v2-button v2-primary p-1.5 border border-slate-200 dark:border-slate-700 rounded-lg disabled:opacity-30 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Previous Page"
              >
                <ChevronLeft size={14} />
              </button>
              <span className="text-xs font-bold px-1.5 dark:text-white">{currentPage} / {totalPages}</span>
              <button 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="v2-button v2-primary p-1.5 border border-slate-200 dark:border-slate-700 rounded-lg disabled:opacity-30 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Next Page"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* MODAL 1: VIEW SALE DETAILS / INVOICE */}
      {viewingSale && (
        <DrawerPortal><div className="v2-overlay fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="v2-surface bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="p-6 bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center backdrop-blur-xs">
                  <Receipt size={22} />
                </div>
                <div>
                  <h3 className="v2-heading text-base font-bold leading-tight">
                    Sale Receipt & Order Breakdown
                  </h3>
                  <span className="text-xs text-emerald-100 font-mono">
                    Invoice: {viewingSale.sale_id} • Date: {viewingSale.date}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setViewingSale(null)}
                className="v2-button v2-primary p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
              {/* Buyer & Seller Info */}
              <div className="v2-grid grid grid-cols-2 gap-4 text-xs">
                <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Customer Details
                  </span>
                  <p className="font-bold text-sm text-slate-900 dark:text-white">
                    {viewingSale.company_name}
                  </p>
                  <p className="text-slate-600 dark:text-slate-300">
                    Contact: {viewingSale.contact_person_name}
                  </p>
                  <p className="text-slate-600 dark:text-slate-300 font-mono">
                    Phone: {viewingSale.contact_person_number}
                  </p>
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Deal Summary
                  </span>
                  <p className="text-slate-700 dark:text-slate-300">
                    Sold By: <strong className="text-slate-900 dark:text-white">{viewingSale.sold_by}</strong>
                  </p>
                  <p className="text-slate-700 dark:text-slate-300">
                    Status:{' '}
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                      {viewingSale.payment_status}
                    </span>
                  </p>
                  <p className="text-slate-700 dark:text-slate-300">
                    SaaS Package: <strong>{viewingSale.saas_package}</strong>
                  </p>
                </div>
              </div>

              {/* Products Table */}
              <div className="space-y-2">
                <h4 className="v2-heading text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Itemized Products List ({viewingSale.products.length} Items)
                </h4>
                <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                  <DataLedger><table className="v2-ledger w-full text-xs text-left">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-800 text-[11px] font-bold text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                        <th className="py-2.5 px-3">#</th>
                        <th className="py-2.5 px-3">Product Description</th>
                        <th className="py-2.5 px-3 text-right">Unit Price</th>
                        <th className="py-2.5 px-3 text-right">Qty</th>
                        <th className="py-2.5 px-3 text-right">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {viewingSale.products.map((item, idx) => (
                        <tr key={idx}>
                          <td className="py-2.5 px-3 text-slate-400">{idx + 1}</td>
                          <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-white">
                            {item.name}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-slate-700 dark:text-slate-300">
                            ৳{item.unit_price.toLocaleString()}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-slate-700 dark:text-slate-300">
                            {item.quantity}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                            ৳{item.subtotal.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table></DataLedger>
                </div>
              </div>

              {/* Total Calculation */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/70 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2 text-xs">
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Products Subtotal:</span>
                  <span className="font-mono font-semibold text-slate-900 dark:text-white">
                    ৳{viewingSale.products.reduce((acc, p) => acc + p.subtotal, 0).toLocaleString()}
                  </span>
                </div>
                {viewingSale.saas_package_price > 0 && (
                  <div className="flex justify-between text-slate-600 dark:text-slate-400">
                    <span>SaaS Package ({viewingSale.saas_package}):</span>
                    <span className="font-mono font-semibold text-slate-900 dark:text-white">
                      + ৳{viewingSale.saas_package_price.toLocaleString()}
                    </span>
                  </div>
                )}
                {viewingSale.discount > 0 && (
                  <div className="flex justify-between text-rose-600 dark:text-rose-400">
                    <span>Discount:</span>
                    <span className="font-mono font-semibold">
                      - ৳{viewingSale.discount.toLocaleString()}
                    </span>
                  </div>
                )}
                <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center text-sm font-bold">
                  <span className="text-slate-900 dark:text-white">Final Deal Value:</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-mono text-lg">
                    ৳{viewingSale.total_value.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Notes */}
              {viewingSale.notes && (
                <div className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                  <span className="font-bold text-slate-700 dark:text-slate-200 block mb-1">Notes:</span>
                  {viewingSale.notes}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center">
              <button
                type="button"
                onClick={() => window.print()}
                className="v2-button px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 transition-colors flex items-center gap-1.5"
              >
                <Printer size={14} />
                <span>Print Invoice</span>
              </button>
              <button
                type="button"
                onClick={() => setViewingSale(null)}
                className="v2-button v2-primary px-4 py-1.5 rounded-lg text-xs font-bold bg-slate-900 dark:bg-slate-700 text-white hover:bg-slate-800 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div></DrawerPortal>
      )}

      {/* MODAL 2: EDIT SALE MODAL */}
      {editingSale && (
        <DrawerPortal><div className="v2-overlay fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="v2-surface bg-white dark:bg-slate-900 rounded-2xl max-w-3xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
            <form onSubmit={handleSaveEdit} className="v2-form">
              <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Edit3 size={18} className="text-amber-500" />
                  <h3 className="v2-heading text-sm font-bold text-slate-900 dark:text-white">
                    Edit Sale Transaction ({editingSale.sale_id})
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingSale(null)}
                  className="v2-button p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto text-xs">
                {/* Basic Details */}
                <div className="v2-grid grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="v2-label block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                      Sale Date
                    </label>
                    <input
                      type="date"
                      value={editingSale.date}
                      onChange={(e) => setEditingSale({ ...editingSale, date: e.target.value })}
                      className="v2-control w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="v2-label block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                      Company Name
                    </label>
                    <input
                      type="text"
                      value={editingSale.company_name}
                      onChange={(e) => setEditingSale({ ...editingSale, company_name: e.target.value })}
                      className="v2-control w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-medium"
                      required
                    />
                  </div>
                  <div>
                    <label className="v2-label block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                      Sold By
                    </label>
                    <select
                      value={editingSale.sold_by}
                      onChange={(e) => setEditingSale({ ...editingSale, sold_by: e.target.value })}
                      className="v2-control w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                    >
                      {Array.from(new Set([...assignedPersons, editingSale.sold_by].filter(Boolean))).map((rep) => (
                        <option key={rep} value={rep}>{rep}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="v2-grid grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="v2-label block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                      Contact Person
                    </label>
                    <input
                      type="text"
                      value={editingSale.contact_person_name}
                      onChange={(e) => setEditingSale({ ...editingSale, contact_person_name: e.target.value })}
                      className="v2-control w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="v2-label block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                      Phone Number
                    </label>
                    <input
                      type="text"
                      value={editingSale.contact_person_number}
                      onChange={(e) => setEditingSale({ ...editingSale, contact_person_number: e.target.value })}
                      className="v2-control w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-mono"
                      required
                    />
                  </div>
                </div>

                {/* Products Edit Repeater */}
                <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-700 dark:text-slate-300">
                      Product Items (Multiple)
                    </span>
                    <button
                      type="button"
                      onClick={handleAddEditProductRow}
                      className="v2-button text-xs text-indigo-600 dark:text-indigo-400 font-bold hover:underline flex items-center gap-1"
                    >
                      <PlusCircle size={13} /> + Add Item
                    </button>
                  </div>

                  <div className="space-y-2">
                    {editingSale.products.map((p, idx) => (
                      <div key={idx} className="v2-grid p-3 bg-slate-50 dark:bg-slate-800 rounded-xl grid grid-cols-12 gap-2 items-center">
                        <div className="col-span-5">
                          <input
                            type="text"
                            value={p.name}
                            onChange={(e) => handleEditProductChange(idx, 'name', e.target.value)}
                            placeholder="Product name"
                            className="v2-control w-full px-2 py-1 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-white"
                            required
                          />
                        </div>
                        <div className="col-span-3">
                          <input
                            type="number"
                            min="0"
                            value={p.unit_price}
                            onChange={(e) => handleEditProductChange(idx, 'unit_price', e.target.value)}
                            placeholder="Unit Price"
                            className="v2-control w-full px-2 py-1 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-white font-mono"
                            required
                          />
                        </div>
                        <div className="col-span-2">
                          <input
                            type="number"
                            min="1"
                            value={p.quantity}
                            onChange={(e) => handleEditProductChange(idx, 'quantity', e.target.value)}
                            placeholder="Qty"
                            className="v2-control w-full px-2 py-1 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-white font-mono"
                            required
                          />
                        </div>
                        <div className="col-span-2 flex items-center justify-between">
                          <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                            ৳{p.subtotal.toLocaleString()}
                          </span>
                          {editingSale.products.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveEditProductRow(idx)}
                              className="v2-button text-rose-500 hover:text-rose-700 p-1"
                            >
                              <X size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* SaaS & Total Values */}
                <div className="v2-grid grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  <div>
                    <label className="v2-label block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                      SaaS Package
                    </label>
                    <input
                      type="text"
                      value={editingSale.saas_package}
                      onChange={(e) => setEditingSale({ ...editingSale, saas_package: e.target.value })}
                      placeholder="Enter SaaS package"
                      className="v2-control w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="v2-label block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                      Payment Status
                    </label>
                    <select
                      value={editingSale.payment_status}
                      onChange={(e) => setEditingSale({ ...editingSale, payment_status: e.target.value as PaymentStatus })}
                      className="v2-control w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                    >
                      <option value="Paid">Paid</option>
                      <option value="Partial">Partial</option>
                      <option value="Pending">Pending</option>
                      <option value="Due">Due</option>
                    </select>
                  </div>
                  <div>
                    <label className="v2-label block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                      Total Deal Value (BDT)
                    </label>
                    <input
                      type="number"
                      value={editingSale.total_value}
                      onChange={(e) => setEditingSale({ ...editingSale, total_value: Number(e.target.value) || 0 })}
                      className="v2-control w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-emerald-600 font-bold font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingSale(null)}
                  className="v2-button px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="v2-button v2-primary px-4 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg flex items-center gap-1.5 shadow-xs"
                >
                  <Save size={14} />
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div></DrawerPortal>
      )}

      {/* MODAL 3: DELETE CONFIRMATION */}
      {deletingSaleId && (
        <DrawerPortal><div className="v2-overlay fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="v2-surface bg-white dark:bg-slate-900 rounded-2xl max-w-sm w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle size={24} />
            </div>
            <div className="text-center space-y-1">
              <h3 className="v2-heading text-sm font-bold text-slate-900 dark:text-white">
                Delete Sales Record?
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Are you sure you want to remove this transaction from the records? This action cannot be reversed.
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingSaleId(null)}
                className="v2-button w-1/2 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                className="v2-button v2-primary w-1/2 py-2 text-xs font-bold rounded-xl bg-rose-600 hover:bg-rose-700 text-white transition-colors shadow-xs"
              >
                Delete
              </button>
            </div>
          </div>
        </div></DrawerPortal>
      )}
    </div></ModuleWorkspace>
  );
};
