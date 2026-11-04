export type CustomerHealth = 'Healthy' | 'Normal' | 'At Risk' | 'Churned';

export type PackageType = 'Starter' | 'Professional' | 'Enterprise';

export type BillingCadence = 'Monthly' | 'Yearly';

export type CallOutcome = 
  | 'Satisfied' 
  | 'Issue Raised' 
  | 'No Answer' 
  | 'Churn Risk' 
  | 'Follow-up Needed';

export type FeedbackCategory = 
  | 'Product Feature' 
  | 'Support Speed' 
  | 'Pricing' 
  | 'System Bug' 
  | 'Usability';

export type FeedbackSentiment = 'Positive' | 'Neutral' | 'Negative';

export type FeedbackStatus = 'Open' | 'In Progress' | 'Resolved';

export type ChurnReason = 
  | 'Pricing / Budget' 
  | 'Competitor' 
  | 'Feature Gap' 
  | 'Poor Support' 
  | 'Business Closed' 
  | 'Other';

export interface RetentionCustomer {
  id: string;
  code: string; // e.g. "CUST-1001"
  name: string; // Company / Client name
  contact_person: string;
  phone: string;
  email: string;
  package: PackageType;
  billing_cadence: BillingCadence;
  mrr: number; // Monthly Recurring Revenue in BDT
  health: CustomerHealth;
  assigned_to: string; // Specialist Name
  assigned_to_id: string;
  onboarding_date: string; // YYYY-MM-DD
  last_contact_date?: string; // YYYY-MM-DD
  next_followup_date?: string; // YYYY-MM-DD
  notes?: string;
  risk_reason?: string;
  churned_date?: string;
  churn_reason?: ChurnReason;
  created_at: string;
}

export interface TeamSpecialist {
  id: string;
  name: string;
  role: string;
  email: string;
  phone: string;
  quota_capacity: number; // e.g. 15 accounts
  status: 'Active' | 'On Leave';
  avatar_color: string;
  joined_date: string;
}

export interface FollowupCall {
  id: string;
  customer_id: string;
  customer_name: string;
  specialist_name: string;
  call_date: string; // YYYY-MM-DD
  duration_minutes: number;
  outcome: CallOutcome;
  notes: string;
  next_followup_date?: string;
  scheduled_month: string; // YYYY-MM
  status: 'Completed' | 'Pending' | 'Rescheduled' | 'Overdue';
  created_at: string;
}

export interface CustomerFeedbackItem {
  id: string;
  customer_id: string;
  customer_name: string;
  score: number; // 1 to 5
  category: FeedbackCategory;
  sentiment: FeedbackSentiment;
  feedback_text: string;
  action_plan?: string;
  status: FeedbackStatus;
  logged_by: string;
  created_at: string;
}

export interface CohortData {
  cohortMonth: string; // e.g. "2026-01"
  totalCustomers: number;
  retentionRates: number[]; // Index 0: M1 (100%), Index 1: M2, Index 2: M3...
}
