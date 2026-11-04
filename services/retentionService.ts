import { downloadStyledReport } from '../lib/excelReport';
import { 
  RetentionCustomer, 
  TeamSpecialist, 
  FollowupCall, 
  CustomerFeedbackItem,
  CohortData
} from '../types/retention';
import * as XLSX from 'xlsx';

const STORAGE_KEYS = {
  CUSTOMERS: 'retention_customers_v1',
  SPECIALISTS: 'retention_specialists_v1',
  CALLS: 'retention_calls_v1',
  FEEDBACK: 'retention_feedback_v1',
};

export const INITIAL_SPECIALISTS: TeamSpecialist[] = [
  {
    id: 'spec-1',
    name: 'Fuad Hasan',
    role: 'Senior Retention Specialist',
    email: 'fuad.h@example.com',
    phone: '+880 1711-234567',
    quota_capacity: 12,
    status: 'Active',
    avatar_color: '#4f46e5', // indigo
    joined_date: '2024-03-15',
  },
  {
    id: 'spec-2',
    name: 'Rahat Chowdhury',
    role: 'Customer Success Manager',
    email: 'rahat.c@example.com',
    phone: '+880 1819-876543',
    quota_capacity: 10,
    status: 'Active',
    avatar_color: '#059669', // emerald
    joined_date: '2024-06-01',
  },
  {
    id: 'spec-3',
    name: 'Fariha Yasmin',
    role: 'Key Account Specialist',
    email: 'fariha.y@example.com',
    phone: '+880 1912-345678',
    quota_capacity: 10,
    status: 'Active',
    avatar_color: '#9333ea', // purple
    joined_date: '2024-08-10',
  },
  {
    id: 'spec-4',
    name: 'Taqi Tahmid',
    role: 'Retention Executive',
    email: 'taqi.t@example.com',
    phone: '+880 1613-987654',
    quota_capacity: 8,
    status: 'Active',
    avatar_color: '#d97706', // amber
    joined_date: '2025-01-15',
  },
  {
    id: 'spec-5',
    name: 'Foysal Ahmed',
    role: 'Client Relationship Associate',
    email: 'foysal.a@example.com',
    phone: '+880 1515-432109',
    quota_capacity: 8,
    status: 'Active',
    avatar_color: '#0284c7', // sky
    joined_date: '2025-04-01',
  }
];

export const INITIAL_CUSTOMERS: RetentionCustomer[] = [
  {
    id: 'cust-1',
    code: 'CUST-1001',
    name: 'Bengal Logistics Ltd',
    contact_person: 'Tanvir Hossain',
    phone: '+880 1712-001122',
    email: 'tanvir@bengallogistics.com',
    package: 'Enterprise',
    billing_cadence: 'Yearly',
    mrr: 45000,
    health: 'Healthy',
    assigned_to: 'Fuad Hasan',
    assigned_to_id: 'spec-1',
    onboarding_date: '2024-05-12',
    last_contact_date: '2026-10-01',
    next_followup_date: '2026-10-25',
    notes: 'Very stable relationship, interested in adding 20 more SIM trackers in November.',
    created_at: '2024-05-12T10:00:00Z',
  },
  {
    id: 'cust-2',
    code: 'CUST-1002',
    name: 'Dhaka Agro Industries',
    contact_person: 'Mahmudur Rahman',
    phone: '+880 1819-334455',
    email: 'm.rahman@dhakaagro.com',
    package: 'Professional',
    billing_cadence: 'Monthly',
    mrr: 18000,
    health: 'At Risk',
    assigned_to: 'Fuad Hasan',
    assigned_to_id: 'spec-1',
    onboarding_date: '2025-02-10',
    last_contact_date: '2026-09-18',
    next_followup_date: '2026-10-04',
    risk_reason: 'Repeated downtime during harvest season, threatened to look at competitor pricing.',
    notes: 'Immediate escalation call needed from Senior Management.',
    created_at: '2025-02-10T11:00:00Z',
  },
  {
    id: 'cust-3',
    code: 'CUST-1003',
    name: 'Apex Pharma Distributors',
    contact_person: 'Dr. Shahabuddin',
    phone: '+880 1713-778899',
    email: 'shahab@apexpharma-dist.com',
    package: 'Enterprise',
    billing_cadence: 'Monthly',
    mrr: 55000,
    health: 'Healthy',
    assigned_to: 'Rahat Chowdhury',
    assigned_to_id: 'spec-2',
    onboarding_date: '2024-08-20',
    last_contact_date: '2026-09-28',
    next_followup_date: '2026-10-20',
    notes: 'Renewed annual enterprise support SLA.',
    created_at: '2024-08-20T09:30:00Z',
  },
  {
    id: 'cust-4',
    code: 'CUST-1004',
    name: 'Padma Textile Mills',
    contact_person: 'Sultana Razia',
    phone: '+880 1914-556677',
    email: 'sultana@padmatextile.com',
    package: 'Professional',
    billing_cadence: 'Monthly',
    mrr: 22000,
    health: 'Normal',
    assigned_to: 'Rahat Chowdhury',
    assigned_to_id: 'spec-2',
    onboarding_date: '2025-03-05',
    last_contact_date: '2026-09-15',
    next_followup_date: '2026-10-12',
    notes: 'Requested customized monthly downtime reports.',
    created_at: '2025-03-05T14:20:00Z',
  },
  {
    id: 'cust-5',
    code: 'CUST-1005',
    name: 'Karnafuly Shipping Line',
    contact_person: 'Captain Alamgir',
    phone: '+880 1811-998877',
    email: 'alamgir@karnafulyshipping.com',
    package: 'Enterprise',
    billing_cadence: 'Yearly',
    mrr: 65000,
    health: 'At Risk',
    assigned_to: 'Fariha Yasmin',
    assigned_to_id: 'spec-3',
    onboarding_date: '2024-11-14',
    last_contact_date: '2026-09-10',
    next_followup_date: '2026-10-05',
    risk_reason: 'Budget cuts due to import restrictions, requested 35% discount or contract termination.',
    notes: 'Urgent meeting proposed with Head of Sales to present tier discount.',
    created_at: '2024-11-14T08:00:00Z',
  },
  {
    id: 'cust-6',
    code: 'CUST-1006',
    name: 'Green Delta Cold Storage',
    contact_person: 'Enamul Karim',
    phone: '+880 1612-443322',
    email: 'enamul@greendeltacs.com',
    package: 'Starter',
    billing_cadence: 'Monthly',
    mrr: 12000,
    health: 'Normal',
    assigned_to: 'Fariha Yasmin',
    assigned_to_id: 'spec-3',
    onboarding_date: '2025-06-18',
    last_contact_date: '2026-09-22',
    next_followup_date: '2026-10-18',
    notes: 'Device connectivity stable over past 60 days.',
    created_at: '2025-06-18T12:00:00Z',
  },
  {
    id: 'cust-7',
    code: 'CUST-1007',
    name: 'Sonali Food Products',
    contact_person: 'Kamrul Ahsan',
    phone: '+880 1715-667788',
    email: 'kamrul@sonalifoods.com.bd',
    package: 'Professional',
    billing_cadence: 'Monthly',
    mrr: 20000,
    health: 'Healthy',
    assigned_to: 'Taqi Tahmid',
    assigned_to_id: 'spec-4',
    onboarding_date: '2025-04-10',
    last_contact_date: '2026-09-29',
    next_followup_date: '2026-10-22',
    notes: 'Very happy with new WhatsApp notice alert feature.',
    created_at: '2025-04-10T10:30:00Z',
  },
  {
    id: 'cust-8',
    code: 'CUST-1008',
    name: 'Meghna Ceramic Industries',
    contact_person: 'Farhan Kabir',
    phone: '+880 1814-112233',
    email: 'farhan@meghnaceramics.com',
    package: 'Enterprise',
    billing_cadence: 'Monthly',
    mrr: 48000,
    health: 'At Risk',
    assigned_to: 'Taqi Tahmid',
    assigned_to_id: 'spec-4',
    onboarding_date: '2024-09-02',
    last_contact_date: '2026-09-12',
    next_followup_date: '2026-10-03',
    risk_reason: 'Accountant changed, invoice payment delayed 45 days, expressed dissatisfaction with API latency.',
    notes: 'Taqi scheduled visiting their head office in Mohakhali DOHS.',
    created_at: '2024-09-02T16:00:00Z',
  },
  {
    id: 'cust-9',
    code: 'CUST-1009',
    name: 'Bexi Garments Sourcing',
    contact_person: 'Nusrat Jahan',
    phone: '+880 1916-224466',
    email: 'nusrat@bexisourcing.com',
    package: 'Starter',
    billing_cadence: 'Monthly',
    mrr: 14000,
    health: 'Normal',
    assigned_to: 'Foysal Ahmed',
    assigned_to_id: 'spec-5',
    onboarding_date: '2025-07-01',
    last_contact_date: '2026-09-25',
    next_followup_date: '2026-10-15',
    notes: 'Routine check-in done, training requested for 2 new dispatch officers.',
    created_at: '2025-07-01T09:00:00Z',
  },
  {
    id: 'cust-10',
    code: 'CUST-1010',
    name: 'Jamuna Courier & Cargo',
    contact_person: 'Imtiaz Ahmed',
    phone: '+880 1718-990011',
    email: 'imtiaz@jamunacargo.bd',
    package: 'Enterprise',
    billing_cadence: 'Yearly',
    mrr: 58000,
    health: 'Healthy',
    assigned_to: 'Foysal Ahmed',
    assigned_to_id: 'spec-5',
    onboarding_date: '2024-10-10',
    last_contact_date: '2026-09-30',
    next_followup_date: '2026-10-28',
    notes: 'Signed 2-year expansion contract last month.',
    created_at: '2024-10-10T11:45:00Z',
  },
  {
    id: 'cust-11',
    code: 'CUST-1011',
    name: 'Square Retail Distribution',
    contact_person: 'Zubaer Rahman',
    phone: '+880 1812-776655',
    email: 'zubaer@squareretail.com',
    package: 'Professional',
    billing_cadence: 'Monthly',
    mrr: 26000,
    health: 'Healthy',
    assigned_to: 'Fuad Hasan',
    assigned_to_id: 'spec-1',
    onboarding_date: '2025-01-20',
    last_contact_date: '2026-10-01',
    next_followup_date: '2026-10-24',
    notes: 'All devices pinging normally.',
    created_at: '2025-01-20T10:00:00Z',
  },
  {
    id: 'cust-12',
    code: 'CUST-1012',
    name: 'Pran Dairy Farms',
    contact_person: 'Mosharraf Hossain',
    phone: '+880 1719-332211',
    email: 'mosharraf@prandairy.com',
    package: 'Starter',
    billing_cadence: 'Monthly',
    mrr: 10000,
    health: 'Churned',
    assigned_to: 'Rahat Chowdhury',
    assigned_to_id: 'spec-2',
    onboarding_date: '2024-04-10',
    last_contact_date: '2026-08-30',
    churned_date: '2026-09-01',
    churn_reason: 'Feature Gap',
    risk_reason: 'Needed custom BLE sensor integration that is currently not supported.',
    notes: 'Account deactivated. Inquired if future firmware will support BLE.',
    created_at: '2024-04-10T12:00:00Z',
  }
];

export const INITIAL_CALLS: FollowupCall[] = [
  {
    id: 'call-1',
    customer_id: 'cust-1',
    customer_name: 'Bengal Logistics Ltd',
    specialist_name: 'Fuad Hasan',
    call_date: '2026-10-01',
    duration_minutes: 18,
    outcome: 'Satisfied',
    notes: 'Quarterly review call. Client praised system stability and fast issue resolution.',
    next_followup_date: '2026-10-25',
    scheduled_month: '2026-10',
    status: 'Completed',
    created_at: '2026-10-01T11:00:00Z',
  },
  {
    id: 'call-2',
    customer_id: 'cust-2',
    customer_name: 'Dhaka Agro Industries',
    specialist_name: 'Fuad Hasan',
    call_date: '2026-09-18',
    duration_minutes: 25,
    outcome: 'Churn Risk',
    notes: 'Mr. Mahmudur is upset regarding harvest-time network lag. Promised to escalate with tech team.',
    next_followup_date: '2026-10-04',
    scheduled_month: '2026-10',
    status: 'Pending',
    created_at: '2026-09-18T14:30:00Z',
  },
  {
    id: 'call-3',
    customer_id: 'cust-3',
    customer_name: 'Apex Pharma Distributors',
    specialist_name: 'Rahat Chowdhury',
    call_date: '2026-09-28',
    duration_minutes: 15,
    outcome: 'Satisfied',
    notes: 'Reviewed temperature monitoring data accuracy. Everything in order.',
    next_followup_date: '2026-10-20',
    scheduled_month: '2026-10',
    status: 'Completed',
    created_at: '2026-09-28T16:00:00Z',
  },
  {
    id: 'call-4',
    customer_id: 'cust-4',
    customer_name: 'Padma Textile Mills',
    specialist_name: 'Rahat Chowdhury',
    call_date: '2026-09-15',
    duration_minutes: 12,
    outcome: 'Issue Raised',
    notes: 'User reported difficulty generating weekly downtime summary.',
    next_followup_date: '2026-10-12',
    scheduled_month: '2026-10',
    status: 'Completed',
    created_at: '2026-09-15T10:15:00Z',
  },
  {
    id: 'call-5',
    customer_id: 'cust-5',
    customer_name: 'Karnafuly Shipping Line',
    specialist_name: 'Fariha Yasmin',
    call_date: '2026-09-10',
    duration_minutes: 20,
    outcome: 'Churn Risk',
    notes: 'Budget cuts discussed. Client wants 35% concession or will downgrade to single port tracking.',
    next_followup_date: '2026-10-05',
    scheduled_month: '2026-10',
    status: 'Pending',
    created_at: '2026-09-10T12:00:00Z',
  },
  {
    id: 'call-6',
    customer_id: 'cust-8',
    customer_name: 'Meghna Ceramic Industries',
    specialist_name: 'Taqi Tahmid',
    call_date: '2026-09-12',
    duration_minutes: 10,
    outcome: 'Follow-up Needed',
    notes: 'Spoke with accounts officer. New GM requested in-person tech demo.',
    next_followup_date: '2026-10-03',
    scheduled_month: '2026-10',
    status: 'Overdue',
    created_at: '2026-09-12T15:20:00Z',
  },
  {
    id: 'call-7',
    customer_id: 'cust-10',
    customer_name: 'Jamuna Courier & Cargo',
    specialist_name: 'Foysal Ahmed',
    call_date: '2026-09-30',
    duration_minutes: 14,
    outcome: 'Satisfied',
    notes: 'Confirmed delivery tracking modules operating at 100% capacity.',
    next_followup_date: '2026-10-28',
    scheduled_month: '2026-10',
    status: 'Completed',
    created_at: '2026-09-30T17:00:00Z',
  }
];

export const INITIAL_FEEDBACK: CustomerFeedbackItem[] = [
  {
    id: 'fb-1',
    customer_id: 'cust-1',
    customer_name: 'Bengal Logistics Ltd',
    score: 5,
    category: 'Product Feature',
    sentiment: 'Positive',
    feedback_text: 'The automated SIM tracking and notice generation module has saved our dispatch team 2 hours daily.',
    action_plan: 'Feature their testimonial in upcoming marketing case study.',
    status: 'Resolved',
    logged_by: 'Fuad Hasan',
    created_at: '2026-09-20T10:00:00Z',
  },
  {
    id: 'fb-2',
    customer_id: 'cust-2',
    customer_name: 'Dhaka Agro Industries',
    score: 2,
    category: 'Support Speed',
    sentiment: 'Negative',
    feedback_text: 'When we reported offline sensor issues last month, it took 8 hours to get a response from support.',
    action_plan: 'Assign dedicated tier-1 priority SLA to their ClickUp tickets.',
    status: 'In Progress',
    logged_by: 'Fuad Hasan',
    created_at: '2026-09-19T14:00:00Z',
  },
  {
    id: 'fb-3',
    customer_id: 'cust-5',
    customer_name: 'Karnafuly Shipping Line',
    score: 3,
    category: 'Pricing',
    sentiment: 'Neutral',
    feedback_text: 'Pricing is steep compared to basic competitors, although your UI and reporting is superior.',
    action_plan: 'Formulate enterprise loyalty discount for their second year renewal.',
    status: 'Open',
    logged_by: 'Fariha Yasmin',
    created_at: '2026-09-11T11:30:00Z',
  },
  {
    id: 'fb-4',
    customer_id: 'cust-8',
    customer_name: 'Meghna Ceramic Industries',
    score: 2,
    category: 'System Bug',
    sentiment: 'Negative',
    feedback_text: 'API webhook triggers were intermittently delayed during night shifts.',
    action_plan: 'Dev team fixed webhook retry policy; awaiting customer verification.',
    status: 'In Progress',
    logged_by: 'Taqi Tahmid',
    created_at: '2026-09-14T09:20:00Z',
  },
  {
    id: 'fb-5',
    customer_id: 'cust-7',
    customer_name: 'Sonali Food Products',
    score: 5,
    category: 'Usability',
    sentiment: 'Positive',
    feedback_text: 'The new responsive UI on mobile is extremely smooth for factory floor managers.',
    action_plan: 'Thank the client and share mobile shortcut tips.',
    status: 'Resolved',
    logged_by: 'Taqi Tahmid',
    created_at: '2026-09-29T15:00:00Z',
  }
];

export const INITIAL_COHORT_DATA: CohortData[] = [
  { cohortMonth: '2026-01', totalCustomers: 18, retentionRates: [100, 94.4, 94.4, 88.9, 88.9, 83.3, 83.3, 77.8, 77.8, 77.8] },
  { cohortMonth: '2026-02', totalCustomers: 22, retentionRates: [100, 95.5, 90.9, 90.9, 86.4, 81.8, 81.8, 81.8, 77.3] },
  { cohortMonth: '2026-03', totalCustomers: 20, retentionRates: [100, 90.0, 85.0, 85.0, 80.0, 80.0, 75.0, 75.0] },
  { cohortMonth: '2026-04', totalCustomers: 25, retentionRates: [100, 96.0, 92.0, 88.0, 88.0, 84.0, 84.0] },
  { cohortMonth: '2026-05', totalCustomers: 19, retentionRates: [100, 94.7, 89.5, 89.5, 84.2, 84.2] },
  { cohortMonth: '2026-06', totalCustomers: 24, retentionRates: [100, 91.7, 87.5, 83.3, 83.3] },
  { cohortMonth: '2026-07', totalCustomers: 21, retentionRates: [100, 95.2, 90.5, 90.5] },
  { cohortMonth: '2026-08', totalCustomers: 26, retentionRates: [100, 96.2, 92.3] },
  { cohortMonth: '2026-09', totalCustomers: 23, retentionRates: [100, 95.6] },
  { cohortMonth: '2026-10', totalCustomers: 28, retentionRates: [100] }
];

export const TEN_MONTH_CHURN_TREND = [
  { month: 'Jan', rate: 1.2, accountsLost: 1, spikeNote: '' },
  { month: 'Feb', rate: 1.5, accountsLost: 2, spikeNote: '' },
  { month: 'Mar', rate: 3.4, accountsLost: 5, spikeNote: 'March Budget Closing Spike' },
  { month: 'Apr', rate: 1.8, accountsLost: 2, spikeNote: '' },
  { month: 'May', rate: 1.4, accountsLost: 2, spikeNote: '' },
  { month: 'Jun', rate: 3.8, accountsLost: 6, spikeNote: 'June Half-Year Audit Spike' },
  { month: 'Jul', rate: 1.6, accountsLost: 2, spikeNote: '' },
  { month: 'Aug', rate: 1.5, accountsLost: 2, spikeNote: '' },
  { month: 'Sep', rate: 3.2, accountsLost: 4, spikeNote: 'September Contract Renewal Spike' },
  { month: 'Oct', rate: 1.4, accountsLost: 1, spikeNote: 'Current Month (Well within safe limit)' },
];

export const retentionService = {
  // Customers
  getCustomers(): RetentionCustomer[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CUSTOMERS);
      if (data) return JSON.parse(data);
    } catch (e) {}
    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(INITIAL_CUSTOMERS));
    return INITIAL_CUSTOMERS;
  },

  saveCustomer(customer: Partial<RetentionCustomer> & { name: string }): RetentionCustomer {
    const list = this.getCustomers();
    if (customer.id) {
      const index = list.findIndex(c => c.id === customer.id);
      if (index !== -1) {
        list[index] = { ...list[index], ...customer };
        localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(list));
        return list[index];
      }
    }

    const newCustomer: RetentionCustomer = {
      id: 'cust-' + Date.now(),
      code: 'CUST-' + Math.floor(1000 + Math.random() * 9000),
      name: customer.name,
      contact_person: customer.contact_person || '',
      phone: customer.phone || '',
      email: customer.email || '',
      package: customer.package || 'Professional',
      billing_cadence: customer.billing_cadence || 'Monthly',
      mrr: Number(customer.mrr) || 20000,
      health: customer.health || 'Healthy',
      assigned_to: customer.assigned_to || 'Fuad Hasan',
      assigned_to_id: customer.assigned_to_id || 'spec-1',
      onboarding_date: customer.onboarding_date || new Date().toISOString().split('T')[0],
      notes: customer.notes || '',
      risk_reason: customer.risk_reason || '',
      created_at: new Date().toISOString(),
    };
    list.unshift(newCustomer);
    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(list));
    return newCustomer;
  },

  updateCustomerHealth(id: string, health: RetentionCustomer['health'], riskReason?: string): void {
    const list = this.getCustomers();
    const cust = list.find(c => c.id === id);
    if (cust) {
      cust.health = health;
      if (riskReason !== undefined) cust.risk_reason = riskReason;
      localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(list));
    }
  },

  markAsChurned(id: string, churn_reason: RetentionCustomer['churn_reason'], notes?: string): void {
    const list = this.getCustomers();
    const cust = list.find(c => c.id === id);
    if (cust) {
      cust.health = 'Churned';
      cust.churned_date = new Date().toISOString().split('T')[0];
      cust.churn_reason = churn_reason || 'Other';
      if (notes) cust.notes = (cust.notes ? cust.notes + '\n' : '') + `[Churn Note]: ${notes}`;
      localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(list));
    }
  },

  bulkAssignCustomers(customerIds: string[], targetSpecialist: TeamSpecialist): void {
    const list = this.getCustomers();
    for (const c of list) {
      if (customerIds.includes(c.id)) {
        c.assigned_to = targetSpecialist.name;
        c.assigned_to_id = targetSpecialist.id;
      }
    }
    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(list));
  },

  deleteCustomer(id: string): void {
    const list = this.getCustomers().filter(c => c.id !== id);
    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(list));
  },

  // Specialists
  getSpecialists(): TeamSpecialist[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SPECIALISTS);
      if (data) return JSON.parse(data);
    } catch (e) {}
    localStorage.setItem(STORAGE_KEYS.SPECIALISTS, JSON.stringify(INITIAL_SPECIALISTS));
    return INITIAL_SPECIALISTS;
  },

  saveSpecialist(specialist: Partial<TeamSpecialist> & { name: string }): TeamSpecialist {
    const list = this.getSpecialists();
    if (specialist.id) {
      const index = list.findIndex(s => s.id === specialist.id);
      if (index !== -1) {
        list[index] = { ...list[index], ...specialist };
        localStorage.setItem(STORAGE_KEYS.SPECIALISTS, JSON.stringify(list));
        return list[index];
      }
    }

    const colors = ['#4f46e5', '#059669', '#9333ea', '#d97706', '#0284c7', '#e11d48', '#0d9488'];
    const newSpec: TeamSpecialist = {
      id: 'spec-' + Date.now(),
      name: specialist.name,
      role: specialist.role || 'Retention Specialist',
      email: specialist.email || '',
      phone: specialist.phone || '',
      quota_capacity: Number(specialist.quota_capacity) || 10,
      status: specialist.status || 'Active',
      avatar_color: specialist.avatar_color || colors[Math.floor(Math.random() * colors.length)],
      joined_date: specialist.joined_date || new Date().toISOString().split('T')[0],
    };
    list.push(newSpec);
    localStorage.setItem(STORAGE_KEYS.SPECIALISTS, JSON.stringify(list));
    return newSpec;
  },

  deleteSpecialist(id: string): void {
    const list = this.getSpecialists().filter(s => s.id !== id);
    localStorage.setItem(STORAGE_KEYS.SPECIALISTS, JSON.stringify(list));
  },

  // Follow-up Calls
  getCalls(): FollowupCall[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CALLS);
      if (data) return JSON.parse(data);
    } catch (e) {}
    localStorage.setItem(STORAGE_KEYS.CALLS, JSON.stringify(INITIAL_CALLS));
    return INITIAL_CALLS;
  },

  logCall(call: Partial<FollowupCall> & { customer_id: string; specialist_name: string; outcome: FollowupCall['outcome'] }): FollowupCall {
    const list = this.getCalls();
    const customers = this.getCustomers();
    const cust = customers.find(c => c.id === call.customer_id);

    const newCall: FollowupCall = {
      id: 'call-' + Date.now(),
      customer_id: call.customer_id,
      customer_name: call.customer_name || cust?.name || 'Unknown Client',
      specialist_name: call.specialist_name,
      call_date: call.call_date || new Date().toISOString().split('T')[0],
      duration_minutes: Number(call.duration_minutes) || 10,
      outcome: call.outcome,
      notes: call.notes || '',
      next_followup_date: call.next_followup_date || '',
      scheduled_month: call.scheduled_month || (call.call_date ? call.call_date.substring(0, 7) : new Date().toISOString().substring(0, 7)),
      status: call.status || 'Completed',
      created_at: new Date().toISOString(),
    };

    list.unshift(newCall);
    localStorage.setItem(STORAGE_KEYS.CALLS, JSON.stringify(list));

    // Update customer last contact date & next followup date
    if (cust) {
      cust.last_contact_date = newCall.call_date;
      if (newCall.next_followup_date) cust.next_followup_date = newCall.next_followup_date;
      
      // Auto adjust customer health if outcome indicates risk or satisfaction
      if (call.outcome === 'Churn Risk') {
        cust.health = 'At Risk';
        cust.risk_reason = newCall.notes || 'Identified churn risk during call.';
      } else if (call.outcome === 'Satisfied' && cust.health === 'At Risk') {
        cust.health = 'Normal';
      }
      localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(customers));
    }

    return newCall;
  },

  updateCallStatus(id: string, status: FollowupCall['status']): void {
    const list = this.getCalls();
    const call = list.find(c => c.id === id);
    if (call) {
      call.status = status;
      localStorage.setItem(STORAGE_KEYS.CALLS, JSON.stringify(list));
    }
  },

  // Feedbacks
  getFeedbacks(): CustomerFeedbackItem[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.FEEDBACK);
      if (data) return JSON.parse(data);
    } catch (e) {}
    localStorage.setItem(STORAGE_KEYS.FEEDBACK, JSON.stringify(INITIAL_FEEDBACK));
    return INITIAL_FEEDBACK;
  },

  saveFeedback(fb: Partial<CustomerFeedbackItem> & { customer_id: string; score: number; feedback_text: string }): CustomerFeedbackItem {
    const list = this.getFeedbacks();
    const customers = this.getCustomers();
    const cust = customers.find(c => c.id === fb.customer_id);

    if (fb.id) {
      const index = list.findIndex(f => f.id === fb.id);
      if (index !== -1) {
        list[index] = { ...list[index], ...fb };
        localStorage.setItem(STORAGE_KEYS.FEEDBACK, JSON.stringify(list));
        return list[index];
      }
    }

    const newFb: CustomerFeedbackItem = {
      id: 'fb-' + Date.now(),
      customer_id: fb.customer_id,
      customer_name: fb.customer_name || cust?.name || 'Client',
      score: Number(fb.score) || 4,
      category: fb.category || 'Product Feature',
      sentiment: fb.sentiment || (Number(fb.score) >= 4 ? 'Positive' : Number(fb.score) === 3 ? 'Neutral' : 'Negative'),
      feedback_text: fb.feedback_text,
      action_plan: fb.action_plan || '',
      status: fb.status || 'Open',
      logged_by: fb.logged_by || 'Fuad Hasan',
      created_at: new Date().toISOString(),
    };
    list.unshift(newFb);
    localStorage.setItem(STORAGE_KEYS.FEEDBACK, JSON.stringify(list));
    return newFb;
  },

  updateFeedbackStatus(id: string, status: CustomerFeedbackItem['status']): void {
    const list = this.getFeedbacks();
    const fb = list.find(f => f.id === id);
    if (fb) {
      fb.status = status;
      localStorage.setItem(STORAGE_KEYS.FEEDBACK, JSON.stringify(list));
    }
  },

  // Export to Excel
  exportFullRetentionReport(): void {
    const customers = this.getCustomers();
    const calls = this.getCalls();
    const feedbacks = this.getFeedbacks();
    const specialists = this.getSpecialists();

    const wb = XLSX.utils.book_new();

    // Sheet 1: Customers Portfolio
    const custData = customers.map(c => ({
      'Customer ID': c.code,
      'Company Name': c.name,
      'Contact Person': c.contact_person,
      'Phone': c.phone,
      'Email': c.email,
      'Package': c.package,
      'Billing': c.billing_cadence,
      'Monthly MRR (BDT)': c.mrr,
      'Health Status': c.health,
      'Assigned Specialist': c.assigned_to,
      'Onboarding Date': c.onboarding_date,
      'Last Contact': c.last_contact_date || 'N/A',
      'Next Follow-up': c.next_followup_date || 'N/A',
      'Churn Risk Reason': c.risk_reason || '',
      'Notes': c.notes || ''
    }));
    const wsCust = XLSX.utils.json_to_sheet(custData);
    wsCust['!cols'] = [
      { wch: 16 }, { wch: 28 }, { wch: 20 }, { wch: 18 }, { wch: 24 },
      { wch: 16 }, { wch: 14 }, { wch: 20 }, { wch: 16 }, { wch: 22 },
      { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 25 }, { wch: 30 }
    ];
    if (custData.length > 0) {
      wsCust['!autofilter'] = { ref: `A1:O${custData.length + 1}` };
    }
    XLSX.utils.book_append_sheet(wb, wsCust, 'Customer Portfolio');

    // Sheet 2: Follow-up Call Logs
    const callData = calls.map(c => ({
      'Date': c.call_date,
      'Customer': c.customer_name,
      'Specialist': c.specialist_name,
      'Duration (Mins)': c.duration_minutes,
      'Call Outcome': c.outcome,
      'Call Status': c.status,
      'Discussion Notes': c.notes,
      'Next Follow-up Date': c.next_followup_date || ''
    }));
    const wsCalls = XLSX.utils.json_to_sheet(callData);
    wsCalls['!cols'] = [
      { wch: 14 }, { wch: 28 }, { wch: 22 }, { wch: 16 },
      { wch: 20 }, { wch: 16 }, { wch: 45 }, { wch: 20 }
    ];
    if (callData.length > 0) {
      wsCalls['!autofilter'] = { ref: `A1:H${callData.length + 1}` };
    }
    XLSX.utils.book_append_sheet(wb, wsCalls, 'Call Follow-ups');

    // Sheet 3: Feedback & CSAT
    const fbData = feedbacks.map(f => ({
      'Date': f.created_at.split('T')[0],
      'Customer': f.customer_name,
      'Score (1-5)': f.score,
      'Sentiment': f.sentiment,
      'Category': f.category,
      'Feedback': f.feedback_text,
      'Action Plan': f.action_plan || '',
      'Status': f.status,
      'Logged By': f.logged_by
    }));
    const wsFb = XLSX.utils.json_to_sheet(fbData);
    wsFb['!cols'] = [
      { wch: 14 }, { wch: 28 }, { wch: 14 }, { wch: 14 },
      { wch: 18 }, { wch: 45 }, { wch: 30 }, { wch: 14 }, { wch: 20 }
    ];
    if (fbData.length > 0) {
      wsFb['!autofilter'] = { ref: `A1:I${fbData.length + 1}` };
    }
    XLSX.utils.book_append_sheet(wb, wsFb, 'Customer Feedback');

    // Sheet 4: Specialists
    const specData = specialists.map(s => {
      const assigned = customers.filter(c => c.assigned_to_id === s.id && c.health !== 'Churned');
      const mrrHandled = assigned.reduce((acc, curr) => acc + curr.mrr, 0);
      return {
        'Specialist Name': s.name,
        'Role': s.role,
        'Email': s.email,
        'Phone': s.phone,
        'Capacity Quota': s.quota_capacity,
        'Active Accounts Handled': assigned.length,
        'Capacity Utilization %': Math.round((assigned.length / s.quota_capacity) * 100) + '%',
        'Total MRR Handled (BDT)': mrrHandled,
        'Status': s.status
      };
    });
    const wsSpec = XLSX.utils.json_to_sheet(specData);
    wsSpec['!cols'] = [
      { wch: 22 }, { wch: 18 }, { wch: 25 }, { wch: 18 },
      { wch: 16 }, { wch: 24 }, { wch: 22 }, { wch: 24 }, { wch: 14 }
    ];
    if (specData.length > 0) {
      wsSpec['!autofilter'] = { ref: `A1:I${specData.length + 1}` };
    }
    XLSX.utils.book_append_sheet(wb, wsSpec, 'Team Workload');

    const fileName = `Retention_Report_${new Date().toISOString().split('T')[0]}.xlsx`;
    downloadStyledReport(wb, fileName);
  }
};
