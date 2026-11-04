import { downloadStyledReport } from '../lib/excelReport';
import { SalesRecord, SalesProductItem, SalesMetrics, PaymentStatus } from '../types/sales';
import * as XLSX from 'xlsx';
import { supabase } from '../lib/supabase';

const STORAGE_KEY = 'app_sales_records_v1';

export const SALES_TABLE_SQL = `-- 1. Create the sales table in Supabase
CREATE TABLE IF NOT EXISTS public.sales (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    sale_id TEXT NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    company_name TEXT NOT NULL,
    contact_person_name TEXT NOT NULL,
    contact_person_number TEXT NOT NULL,
    products JSONB NOT NULL DEFAULT '[]'::jsonb,
    saas_package TEXT DEFAULT 'None (Hardware Only)',
    saas_package_price NUMERIC(12, 2) DEFAULT 0,
    discount NUMERIC(12, 2) DEFAULT 0,
    total_value NUMERIC(12, 2) DEFAULT 0,
    sold_by TEXT NOT NULL,
    payment_status TEXT NOT NULL DEFAULT 'Paid',
    notes TEXT DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS Policies to allow read, insert, update, delete for public anon & authenticated users
CREATE POLICY "Allow anon and auth read on sales" 
    ON public.sales FOR SELECT 
    TO anon, authenticated 
    USING (true);

CREATE POLICY "Allow anon and auth insert on sales" 
    ON public.sales FOR INSERT 
    TO anon, authenticated 
    WITH CHECK (true);

CREATE POLICY "Allow anon and auth update on sales" 
    ON public.sales FOR UPDATE 
    TO anon, authenticated 
    USING (true);

CREATE POLICY "Allow anon and auth delete on sales" 
    ON public.sales FOR DELETE 
    TO anon, authenticated 
    USING (true);

-- 4. Create Indexes for faster searches and metrics
CREATE INDEX IF NOT EXISTS idx_sales_date ON public.sales (date DESC);
CREATE INDEX IF NOT EXISTS idx_sales_sale_id ON public.sales (sale_id);
CREATE INDEX IF NOT EXISTS idx_sales_company ON public.sales (company_name);
CREATE INDEX IF NOT EXISTS idx_sales_sold_by ON public.sales (sold_by);
CREATE INDEX IF NOT EXISTS idx_sales_payment_status ON public.sales (payment_status);`;

function mapRecordToDbRow(record: SalesRecord) {
  return {
    id: record.id,
    sale_id: record.sale_id,
    date: record.date || new Date().toISOString().split('T')[0],
    company_name: record.company_name,
    contact_person_name: record.contact_person_name,
    contact_person_number: record.contact_person_number,
    products: record.products || [],
    saas_package: record.saas_package || 'None (Hardware Only)',
    saas_package_price: Number(record.saas_package_price) || 0,
    discount: Number(record.discount) || 0,
    total_value: Number(record.total_value) || 0,
    sold_by: record.sold_by,
    payment_status: record.payment_status || 'Paid',
    notes: record.notes || '',
    created_at: record.created_at || new Date().toISOString(),
    updated_at: record.updated_at || new Date().toISOString(),
  };
}

function mapDbRowToRecord(row: any): SalesRecord {
  return {
    id: String(row.id),
    sale_id: row.sale_id || `SL-${row.id}`,
    date: row.date ? String(row.date).split('T')[0] : new Date().toISOString().split('T')[0],
    company_name: row.company_name || '',
    contact_person_name: row.contact_person_name || '',
    contact_person_number: row.contact_person_number || '',
    products: Array.isArray(row.products)
      ? row.products.map((p: any) => ({
          id: p.id || `p-${Date.now()}`,
          name: p.name || '',
          unit_price: Number(p.unit_price) || 0,
          quantity: Number(p.quantity) || 1,
          subtotal: Number(p.subtotal) || (Number(p.unit_price) || 0) * (Number(p.quantity) || 1),
        }))
      : (typeof row.products === 'string' ? JSON.parse(row.products || '[]') : []),
    saas_package: row.saas_package || 'None (Hardware Only)',
    saas_package_price: Number(row.saas_package_price) || 0,
    discount: Number(row.discount) || 0,
    total_value: Number(row.total_value) || 0,
    sold_by: row.sold_by || '',
    payment_status: (row.payment_status as PaymentStatus) || 'Paid',
    notes: row.notes || '',
    created_at: row.created_at || new Date().toISOString(),
    updated_at: row.updated_at || new Date().toISOString(),
  };
}

export const POPULAR_PRODUCTS = [
  { name: 'Biometric Attendance Device (IN-Bio 400)', defaultPrice: 16500 },
  { name: 'Face Recognition Terminal (FacePass Pro)', defaultPrice: 28500 },
  { name: 'RFID Smart Cards (Pack of 100)', defaultPrice: 3500 },
  { name: 'Access Control Magnetic Door Lock Kit', defaultPrice: 8500 },
  { name: 'Cloud HRM & Payroll Software License', defaultPrice: 45000 },
  { name: 'Mobile Attendance App Addon (Android/iOS)', defaultPrice: 12000 },
  { name: 'GPS Vehicle Tracking Device (Fleet Pro)', defaultPrice: 6500 },
  { name: 'Thermal Receipt / Token Printer', defaultPrice: 9500 },
  { name: 'Annual Maintenance Contract (AMC)', defaultPrice: 24000 },
  { name: 'On-site Installation & Training Package', defaultPrice: 8000 },
];

export const SAAS_PACKAGES = [
  { name: 'Starter (Up to 50 Users)', price: 3500 },
  { name: 'Professional (Up to 250 Users)', price: 8500 },
  { name: 'Enterprise (Unlimited Users)', price: 18000 },
  { name: 'Custom Enterprise Suite', price: 35000 },
  { name: 'None (Hardware Only)', price: 0 },
];

export const SALES_REPRESENTATIVES = [
  'Fuad',
  'Rahat',
  'Foysal',
  'Taqi',
  'Fariha',
];

// Legacy dummy sale IDs to purge from cache if any exist - strictly never filter real sales
export const DUMMY_SALE_IDS = new Set<string>([
  'mock-sale-001', 'mock-sale-002', 'demo-sale-1'
]);

const INITIAL_SALES: SalesRecord[] = [];

export const salesService = {
  // Flag to avoid duplicate background fetches on initial mount
  _hasAttemptedDbFetch: false,

  async fetchSalesFromDb(): Promise<SalesRecord[]> {
    try {
      const { data, error } = await supabase
        .from('sales')
        .select('*')
        .order('date', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) {
        if (error.code === 'PGRST205') {
          console.warn("Supabase 'sales' table does not exist yet in schema cache. Please run SQL schema in Supabase SQL Editor.");
        } else {
          console.error('Error fetching sales from Supabase:', error);
        }
        return this.getSales();
      }

      if (data && data.length >= 0) {
        const dbRecords = data
          .map(mapDbRowToRecord)
          .filter((r) => !DUMMY_SALE_IDS.has(r.id) && !DUMMY_SALE_IDS.has(r.sale_id));

        // Merge with any existing local records to avoid losing freshly added sales
        const local = this.getSalesLocalOnly();
        const map = new Map<string, SalesRecord>();
        local.forEach((r) => {
          if (!DUMMY_SALE_IDS.has(r.id) && !DUMMY_SALE_IDS.has(r.sale_id)) {
            map.set(r.id, r);
          }
        });
        dbRecords.forEach((r) => {
          map.set(r.id, r);
        });

        const merged = Array.from(map.values()).sort((a, b) => {
          const dComp = (b.date || '').localeCompare(a.date || '');
          if (dComp !== 0) return dComp;
          return (b.created_at || '').localeCompare(a.created_at || '');
        });

        // Persist fresh combined data to local storage
        this.saveSales(merged);
        return merged;
      }
    } catch (err) {
      console.error('Failed to fetch sales from Supabase:', err);
    }
    return this.getSales();
  },

  async saveToSupabase(record: SalesRecord): Promise<{ success: boolean; error?: string; isTableMissing?: boolean }> {
    try {
      const payload = mapRecordToDbRow(record);
      const { error } = await supabase
        .from('sales')
        .upsert([payload], { onConflict: 'id' });

      if (error) {
        console.warn('Supabase sales upsert response:', error);
        return {
          success: false,
          error: error.message,
          isTableMissing: error.code === 'PGRST205',
        };
      }

      return { success: true };
    } catch (err: any) {
      console.error('Supabase sales save exception:', err);
      return {
        success: false,
        error: err?.message || 'Unexpected network or database error',
      };
    }
  },

  async updateInSupabase(record: SalesRecord): Promise<void> {
    try {
      const payload = mapRecordToDbRow(record);
      const { error } = await supabase
        .from('sales')
        .update(payload)
        .eq('id', record.id);

      if (error && error.code !== 'PGRST205') {
        console.error('Error updating sale in Supabase:', error);
      }
    } catch (err) {
      console.error('Exception updating sale in Supabase:', err);
    }
  },

  async deleteFromSupabase(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('sales')
        .delete()
        .or(`id.eq.${id},sale_id.eq.${id}`);

      if (error && error.code !== 'PGRST205') {
        console.error('Error deleting sale from Supabase:', error);
      }
    } catch (err) {
      console.error('Exception deleting sale from Supabase:', err);
    }
  },

  async syncLocalToSupabase(): Promise<{ synced: number; error?: string; isTableMissing?: boolean }> {
    try {
      const current = this.getSales();
      if (current.length === 0) return { synced: 0 };

      const payloads = current.map(mapRecordToDbRow);
      const { error } = await supabase
        .from('sales')
        .upsert(payloads, { onConflict: 'id' });

      if (error) {
        return {
          synced: 0,
          error: error.message,
          isTableMissing: error.code === 'PGRST205',
        };
      }

      return { synced: current.length };
    } catch (err: any) {
      return { synced: 0, error: err?.message };
    }
  },

  getSalesLocalOnly(): SalesRecord[] {
    try {
      if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
        const data = localStorage.getItem(STORAGE_KEY);
        if (data) {
          const parsed = JSON.parse(data);
          if (Array.isArray(parsed)) {
            return parsed.filter(
              (p: any) => !DUMMY_SALE_IDS.has(p.id) && !DUMMY_SALE_IDS.has(p.sale_id)
            );
          }
        }
      }
    } catch (e) {
      console.error('Failed to load sales from storage', e);
    }
    return [];
  },

  getSales(): SalesRecord[] {
    const list = this.getSalesLocalOnly();

    if (!this._hasAttemptedDbFetch && typeof window !== 'undefined') {
      this._hasAttemptedDbFetch = true;
      this.fetchSalesFromDb().catch(() => {});
    }
    return list;
  },

  saveSales(sales: SalesRecord[]): void {
    try {
      if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
        const filtered = sales.filter((s) => !DUMMY_SALE_IDS.has(s.id) && !DUMMY_SALE_IDS.has(s.sale_id));
        localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
        window.dispatchEvent(new CustomEvent('sales-updated'));
      }
    } catch (e) {
      console.error('Failed to save sales to storage', e);
    }
  },

  getSaleById(id: string): SalesRecord | undefined {
    const list = this.getSales();
    return list.find((s) => s.id === id || s.sale_id === id);
  },

  createSaleRecord(saleData: {
    date: string;
    company_name: string;
    contact_person_name: string;
    contact_person_number: string;
    products: SalesProductItem[];
    saas_package: string;
    saas_package_price?: number;
    discount?: number;
    total_value?: number;
    sold_by: string;
    payment_status: 'Paid' | 'Partial' | 'Pending' | 'Due';
    notes?: string;
  }): SalesRecord {
    const current = this.getSalesLocalOnly();
    const id = `sale-${Date.now()}`;
    const year = saleData.date ? saleData.date.substring(0, 4) : String(new Date().getFullYear());
    
    // Find highest index among existing sales for this year to prevent collisions
    let maxNum = 0;
    current.forEach((s) => {
      if (s.sale_id && s.sale_id.startsWith(`SL-${year}-`)) {
        const parts = s.sale_id.split('-');
        const n = parseInt(parts[2], 10);
        if (!isNaN(n) && n > maxNum) {
          maxNum = n;
        }
      }
    });
    const nextNum = Math.max(current.length, maxNum) + 1;
    const sale_id = `SL-${year}-${String(nextNum).padStart(3, '0')}`;

    // Calculate product subtotals if not present
    const productsWithSubtotal = (saleData.products || []).map((p, idx) => ({
      id: p.id || `p-${Date.now()}-${idx}`,
      name: p.name.trim(),
      unit_price: Number(p.unit_price) || 0,
      quantity: Number(p.quantity) || 1,
      subtotal: (Number(p.unit_price) || 0) * (Number(p.quantity) || 1),
    }));

    const productsSum = productsWithSubtotal.reduce((acc, p) => acc + p.subtotal, 0);
    const saasPrice = Number(saleData.saas_package_price) || 0;
    const discount = Number(saleData.discount) || 0;
    const calculatedTotal = saleData.total_value !== undefined && saleData.total_value !== null
      ? Number(saleData.total_value)
      : Math.max(0, productsSum + saasPrice - discount);

    return {
      id,
      sale_id,
      date: saleData.date || new Date().toISOString().split('T')[0],
      company_name: saleData.company_name.trim(),
      contact_person_name: saleData.contact_person_name.trim(),
      contact_person_number: saleData.contact_person_number.trim(),
      products: productsWithSubtotal,
      saas_package: saleData.saas_package || 'None (Hardware Only)',
      saas_package_price: saasPrice,
      discount,
      total_value: calculatedTotal,
      sold_by: saleData.sold_by.trim(),
      payment_status: saleData.payment_status || 'Paid',
      notes: saleData.notes?.trim() || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  },

  addSale(saleData: {
    date: string;
    company_name: string;
    contact_person_name: string;
    contact_person_number: string;
    products: SalesProductItem[];
    saas_package: string;
    saas_package_price?: number;
    discount?: number;
    total_value?: number;
    sold_by: string;
    payment_status: 'Paid' | 'Partial' | 'Pending' | 'Due';
    notes?: string;
  }): SalesRecord {
    const newRecord = this.createSaleRecord(saleData);
    const current = this.getSalesLocalOnly();
    const updatedList = [newRecord, ...current];
    this.saveSales(updatedList);

    // Save to Supabase asynchronously in background
    this.saveToSupabase(newRecord).catch((err) => {
      console.warn('Background Supabase save encountered:', err);
    });

    return newRecord;
  },

  async addSaleAsync(saleData: {
    date: string;
    company_name: string;
    contact_person_name: string;
    contact_person_number: string;
    products: SalesProductItem[];
    saas_package: string;
    saas_package_price?: number;
    discount?: number;
    total_value?: number;
    sold_by: string;
    payment_status: 'Paid' | 'Partial' | 'Pending' | 'Due';
    notes?: string;
  }): Promise<{ record: SalesRecord; supabaseSaved: boolean; error?: string; isTableMissing?: boolean }> {
    const newRecord = this.createSaleRecord(saleData);
    const current = this.getSalesLocalOnly();
    const updatedList = [newRecord, ...current];
    this.saveSales(updatedList);

    const res = await this.saveToSupabase(newRecord);
    return {
      record: newRecord,
      supabaseSaved: res.success,
      error: res.error,
      isTableMissing: res.isTableMissing,
    };
  },

  updateSale(id: string, updated: Partial<SalesRecord>): SalesRecord | null {
    const current = this.getSales();
    const index = current.findIndex((s) => s.id === id);
    if (index === -1) return null;

    const existing = current[index];
    const products = updated.products
      ? updated.products.map((p) => ({
          ...p,
          subtotal: (Number(p.unit_price) || 0) * (Number(p.quantity) || 1),
        }))
      : existing.products;

    const productsSum = products.reduce((acc, p) => acc + p.subtotal, 0);
    const saasPrice = updated.saas_package_price !== undefined
      ? Number(updated.saas_package_price)
      : existing.saas_package_price;
    const discount = updated.discount !== undefined
      ? Number(updated.discount)
      : existing.discount;

    const total_value = updated.total_value !== undefined
      ? Number(updated.total_value)
      : Math.max(0, productsSum + saasPrice - discount);

    const merged: SalesRecord = {
      ...existing,
      ...updated,
      products,
      saas_package_price: saasPrice,
      discount,
      total_value,
      updated_at: new Date().toISOString(),
    };

    current[index] = merged;
    this.saveSales(current);

    // Update in Supabase
    this.updateInSupabase(merged);

    return merged;
  },

  deleteSale(id: string): boolean {
    const current = this.getSales();
    const filtered = current.filter((s) => s.id !== id && s.sale_id !== id);
    if (filtered.length !== current.length) {
      this.saveSales(filtered);
      // Delete in Supabase
      this.deleteFromSupabase(id);
      return true;
    }
    return false;
  },

  getSalesMetrics(monthFilter?: string, repFilter?: string, yearFilter?: string): SalesMetrics {
    let list = this.getSales();

    if (yearFilter && yearFilter !== 'all') {
      list = list.filter((s) => s.date.startsWith(yearFilter));
    }

    if (monthFilter && monthFilter !== 'all') {
      list = list.filter((s) => {
        const m = s.date.substring(5, 7);
        return m === monthFilter;
      });
    }

    if (repFilter && repFilter !== 'all') {
      list = list.filter((s) => s.sold_by.toLowerCase() === repFilter.toLowerCase());
    }

    const totalRevenue = list.reduce((acc, s) => acc + (s.total_value || 0), 0);
    const totalDeals = list.length;
    const averageDealValue = totalDeals > 0 ? Math.round(totalRevenue / totalDeals) : 0;

    let totalProductsSold = 0;
    const productStats: Record<string, { quantity: number; revenue: number }> = {};
    const repStats: Record<string, { revenue: number; deals: number }> = {};
    const packageStats: Record<string, { count: number; revenue: number }> = {};
    const monthlyMap: Record<string, { revenue: number; deals: number }> = {};

    let paidRevenue = 0;
    let dueRevenue = 0;

    list.forEach((sale) => {
      if (sale.payment_status === 'Paid') {
        paidRevenue += sale.total_value;
      } else {
        dueRevenue += sale.total_value;
      }

      // Products breakdown
      (sale.products || []).forEach((item) => {
        const qty = Number(item.quantity) || 0;
        const sub = Number(item.subtotal) || 0;
        totalProductsSold += qty;

        if (!productStats[item.name]) {
          productStats[item.name] = { quantity: 0, revenue: 0 };
        }
        productStats[item.name].quantity += qty;
        productStats[item.name].revenue += sub;
      });

      // Rep breakdown
      const rep = sale.sold_by || 'Unassigned';
      if (!repStats[rep]) {
        repStats[rep] = { revenue: 0, deals: 0 };
      }
      repStats[rep].revenue += sale.total_value;
      repStats[rep].deals += 1;

      // Package breakdown
      const pkg = sale.saas_package || 'None';
      if (!packageStats[pkg]) {
        packageStats[pkg] = { count: 0, revenue: 0 };
      }
      packageStats[pkg].count += 1;
      packageStats[pkg].revenue += sale.total_value;

      // Monthly map (YYYY-MM)
      const ym = sale.date.substring(0, 7);
      if (!monthlyMap[ym]) {
        monthlyMap[ym] = { revenue: 0, deals: 0 };
      }
      monthlyMap[ym].revenue += sale.total_value;
      monthlyMap[ym].deals += 1;
    });

    // Top Sales Rep
    let topSalesRep = 'N/A';
    let maxRepRevenue = -1;
    Object.entries(repStats).forEach(([rep, data]) => {
      if (data.revenue > maxRepRevenue) {
        maxRepRevenue = data.revenue;
        topSalesRep = `${rep} (৳${data.revenue.toLocaleString()})`;
      }
    });

    // Monthly sorted
    const monthlyRevenue = Object.entries(monthlyMap)
      .map(([month, data]) => ({
        month,
        revenue: data.revenue,
        deals: data.deals,
      }))
      .sort((a, b) => a.month.localeCompare(b.month));

    // Sales by Rep sorted
    const salesByRep = Object.entries(repStats)
      .map(([rep, data]) => ({
        rep,
        revenue: data.revenue,
        deals: data.deals,
      }))
      .sort((a, b) => b.revenue - a.revenue);

    // Top Products sorted
    const topProducts = Object.entries(productStats)
      .map(([name, data]) => ({
        name,
        quantity: data.quantity,
        revenue: data.revenue,
      }))
      .sort((a, b) => b.revenue - a.revenue);

    // Package breakdown sorted
    const packageBreakdown = Object.entries(packageStats)
      .map(([name, data]) => ({
        name,
        count: data.count,
        revenue: data.revenue,
      }))
      .sort((a, b) => b.revenue - a.revenue);

    return {
      totalRevenue,
      totalDeals,
      averageDealValue,
      topSalesRep,
      totalProductsSold,
      paidRevenue,
      dueRevenue,
      monthlyRevenue,
      salesByRep,
      topProducts,
      packageBreakdown,
    };
  },

  exportToExcel(sales: SalesRecord[]): void {
    const rows = sales.map((s, idx) => ({
      'SL #': idx + 1,
      'Sale ID': s.sale_id,
      'Date': s.date,
      'Company Name': s.company_name,
      'Contact Person': s.contact_person_name,
      'Contact Phone': s.contact_person_number,
      'Products Summary': (s.products || [])
        .map((p) => `${p.name} (Qty: ${p.quantity}, ৳${p.unit_price} each = ৳${p.subtotal})`)
        .join('; '),
      'Total Products Qty': (s.products || []).reduce((acc, p) => acc + (p.quantity || 0), 0),
      'SaaS Package': s.saas_package,
      'Package Fee (BDT)': s.saas_package_price,
      'Discount (BDT)': s.discount,
      'Total Value (BDT)': s.total_value,
      'Sold By': s.sold_by,
      'Payment Status': s.payment_status,
      'Notes': s.notes || '',
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    worksheet['!cols'] = [
      { wch: 8 },  // SL #
      { wch: 18 }, // Sale ID
      { wch: 14 }, // Date
      { wch: 28 }, // Company Name
      { wch: 22 }, // Contact Person
      { wch: 18 }, // Contact Phone
      { wch: 45 }, // Products Summary
      { wch: 18 }, // Total Products Qty
      { wch: 20 }, // SaaS Package
      { wch: 18 }, // Package Fee (BDT)
      { wch: 16 }, // Discount (BDT)
      { wch: 18 }, // Total Value (BDT)
      { wch: 22 }, // Sold By
      { wch: 16 }, // Payment Status
      { wch: 30 }  // Notes
    ];
    if (rows.length > 0) {
      worksheet['!autofilter'] = { ref: `A1:O${rows.length + 1}` };
    }

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sales Records');
    downloadStyledReport(workbook, `sales_report_${new Date().toISOString().split('T')[0]}.xlsx`);
  },
};
