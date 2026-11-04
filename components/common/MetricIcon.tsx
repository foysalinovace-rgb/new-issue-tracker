import React from 'react';
import type { LucideIcon } from 'lucide-react';

export function MetricIcon({ icon: Icon, color, background, className = '' }: { icon: LucideIcon; color: string; background: string; className?: string }) {
  return <div className={`stat-icon w-10 h-10 shrink-0 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 ${background} ${className}`} aria-hidden="true"><Icon size={20} className={color} /></div>;
}
