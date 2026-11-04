
import { Priority, Status, IssueType, SystemType } from './types';

export const ISSUE_TYPES: IssueType[] = ['Software', 'Device'];
export const PRIORITIES: Priority[] = ['Low', 'Medium', 'High'];
export const STATUSES: Status[] = ['Open', 'Close', 'Pending', 'In Progress', 'Done'];
export const ASSIGNED_PERSONS = ['Fuad', 'Rahat', 'Foysal', 'Taqi', 'Fariha'];
export const SYSTEMS: SystemType[] = ['CS', 'HRM', 'APP', 'BEP', 'ALL WITHOUT BEP', 'All'];

export const PRIORITY_COLORS = {
  Low: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
  Medium: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800',
  High: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 border-rose-200 dark:border-rose-800',
};

export const STATUS_COLORS = {
  Open: 'bg-blue-100 text-blue-700 border-blue-200',
  Close: 'bg-slate-100 text-slate-700 border-slate-200',
  Pending: 'bg-orange-100 text-orange-700 border-orange-200',
  'In Progress': 'bg-purple-100 text-purple-700 border-purple-200',
  Done: 'bg-emerald-100 text-emerald-700 border-emerald-200',
};

export const CHART_COLORS = ['#258f80', '#899bc0', '#d7b46f', '#c87d78', '#7db79c'];
