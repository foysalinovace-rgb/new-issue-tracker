
import { Priority, Status, IssueType, SystemType } from './types';

export const ISSUE_TYPES: IssueType[] = ['Software', 'Device'];
export const PRIORITIES: Priority[] = ['Low', 'Medium', 'High'];
export const STATUSES: Status[] = ['Open', 'Close', 'Pending', 'In Progress', 'Done'];
export const ASSIGNED_PERSONS = ['Fuad', 'Rahat', 'Foysal', 'Taqi', 'Fariha'];
export const SYSTEMS: SystemType[] = ['CS', 'HRM', 'APP', 'BEP', 'ALL WITHOUT BEP', 'All'];

export const PRIORITY_COLORS: Record<string, string> = {
  Low: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 font-black',
  low: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 font-black',
  Medium: 'bg-amber-200 text-amber-950 dark:bg-amber-500/20 dark:text-amber-300 border-amber-400 dark:border-amber-500/50 font-black',
  medium: 'bg-amber-200 text-amber-950 dark:bg-amber-500/20 dark:text-amber-300 border-amber-400 dark:border-amber-500/50 font-black',
  High: 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300 border-red-300 dark:border-red-800 font-black',
  high: 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300 border-red-300 dark:border-red-800 font-black',
  Urgent: 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300 border-red-300 dark:border-red-800 font-black',
  urgent: 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300 border-red-300 dark:border-red-800 font-black',
};

export const STATUS_COLORS = {
  Open: 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800',
  Close: 'bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-100 border-slate-300 dark:border-slate-600',
  Pending: 'bg-orange-100 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300 border-orange-200 dark:border-orange-800',
  'In Progress': 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-800',
  Done: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
};

export const CHART_COLORS = ['#258f80', '#899bc0', '#d7b46f', '#c87d78', '#7db79c'];
