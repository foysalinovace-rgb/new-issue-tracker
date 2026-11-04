import React, { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlignJustify, Expand, Minimize, Rows3, SlidersHorizontal, ChevronDown } from 'lucide-react';

export function DataLedger({ children }: { children: React.ReactNode }) {
  const [compact, setCompact] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [rows, setRows] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const count = () => setRows(Array.from(ref.current?.querySelectorAll('tbody tr') || []).filter(row => !row.querySelector('[colspan]')).length);
    count(); const observer = new MutationObserver(count);
    if (ref.current) observer.observe(ref.current, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [expanded]);
  useEffect(() => {
    if (!expanded) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') { setExpanded(false); button.current?.focus(); } };
    window.addEventListener('keydown', key);
    return () => { window.removeEventListener('keydown', key); document.body.style.overflow = previousOverflow; };
  }, [expanded]);
  const content = <div ref={ref} className={`data-ledger ${compact ? 'density-compact' : ''} ${expanded ? 'ledger-expanded' : ''}`}>
    <div className="data-ledger-bar" data-html2canvas-ignore="true"><div><Rows3 size={14} /><strong>DATA VIEW</strong><span>{rows} {rows === 1 ? 'record' : 'records'} on this page</span></div><div><button type="button" aria-pressed={compact} onClick={() => setCompact(v => !v)} title="Toggle row density"><AlignJustify size={13} /><span>{compact ? 'Compact' : 'Comfortable'}</span></button><button ref={button} type="button" onClick={() => setExpanded(v => !v)} aria-label={expanded ? 'Exit expanded table' : 'Expand table'} title={expanded ? 'Exit expanded view (Esc)' : 'Expand data view'}>{expanded ? <Minimize size={14} /> : <Expand size={14} />}</button></div></div>
    <div className="data-ledger-scroll">{children}</div>
  </div>;
  return expanded ? createPortal(<div className="module-workspace ledger-portal">{content}</div>, document.body) : content;
}

export function FilterDesk({ children, actions, summary, title = 'Filters' }: { children: React.ReactNode; actions?: React.ReactNode; summary?: React.ReactNode; title?: string }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return <section className={`filter-desk ${open ? 'is-open' : ''}`}>
    <div className="filter-desk-header" data-html2canvas-ignore="true">
      <button type="button" className="filter-desk-toggle" onClick={() => setOpen(v => !v)} aria-expanded={open} aria-controls={id}>
        <span className="filter-toggle-icon"><SlidersHorizontal size={15} /></span><strong>{title}</strong><span>{open ? 'Hide filters' : 'Show filters'}</span><ChevronDown size={15} />
      </button>
      {actions && <div className="filter-desk-actions">{actions}</div>}
    </div>
    <div id={id} className="filter-desk-content" hidden={!open}>{children}</div>
    {summary && <div className="filter-desk-summary">{summary}</div>}
  </section>;
}
