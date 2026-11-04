export interface SalesProductItem {
  id: string;
  name: string;
  unit_price: number;
  quantity: number;
  subtotal: number;
}

export type PaymentStatus = 'Paid' | 'Partial' | 'Pending' | 'Due';

export interface SalesRecord {
  id: string;
  sale_id: string;
  date: string;
  company_name: string;
  contact_person_name: string;
  contact_person_number: string;
  products: SalesProductItem[];
  saas_package: string;
  saas_package_price: number;
  discount: number;
  total_value: number;
  sold_by: string;
  payment_status: PaymentStatus;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface SalesMetrics {
  totalRevenue: number;
  totalDeals: number;
  averageDealValue: number;
  topSalesRep: string;
  totalProductsSold: number;
  paidRevenue: number;
  dueRevenue: number;
  monthlyRevenue: { month: string; revenue: number; deals: number }[];
  salesByRep: { rep: string; revenue: number; deals: number }[];
  topProducts: { name: string; quantity: number; revenue: number }[];
  packageBreakdown: { name: string; count: number; revenue: number }[];
}
