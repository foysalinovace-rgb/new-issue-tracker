
export type Priority = string;
export type Status = string;
export type IssueType = string;
export type SystemType = string;

export interface SettingItem {
  id: string;
  category: 'issue_type' | 'priority' | 'status' | 'assigned_person' | 'system_name' | 'issue_category' | 'segment';
  name: string;
  created_at: string;
}

export interface BrandingConfig {
  id?: string;
  brand_name: string;
  subtitle: string;
  logo_url: string | null;
  updated_at?: string;
}

export interface Issue {
  id: string;
  client_name: string;
  issue_type: IssueType;
  category: string;
  segment?: string;
  clickup_ticket_id?: string;
  priority: Priority;
  status: Status;
  assigned_person: string;
  issue_details: string;
  issue_date: string;
  created_at: string;
  updated_at: string;
  response_time?: string;
  resolution_time?: string;
  resolution_date?: string;
  client_reporting_time?: string;
  issue_resolved_confirmed?: 'Yes' | 'No' | 'No Response' | string;
  feedback_rating?: number;
  customer_satisfaction?: 'Very Poor' | 'Poor' | 'Average' | 'Good' | 'Excellent' | 'Satisfied' | 'Neutral' | 'Dissatisfied' | string;
  feedback_date?: string;
  called_by?: string;
}

export interface MonthlyEntry {
  id: string;
  month: string; // YYYY-MM
  total_issues: number;
  system_bugs: number;
  device_issues: number;
  awareness: number;
  help_requests: number;
  created_at: string;
}

export interface SystemDowntime {
  id: string;
  date: string;
  system_name: SystemType;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  created_at: string;
}

export type ViewType = 
  | 'Dashboard' 
  | 'IssueEntry' 
  | 'IssueReports' 
  | 'MonthlyEntry' 
  | 'MonthlyReports' 
  | 'DowntimeEntry' 
  | 'DowntimeReports'
  | 'Settings'
  | 'NoticeGenerator'
  | 'SimFinder'
  | 'Analytics'
  | 'WeeklyReport';
