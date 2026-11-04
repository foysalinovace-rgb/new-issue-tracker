import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

/** Keeps drawers attached to the viewport, including on long/scrolled reports. */
export function DrawerPortal({ children }: { children: React.ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const overlay = root.current?.querySelector<HTMLElement>('.v2-overlay');
    const panel = overlay?.firstElementChild as HTMLElement | undefined;
    if (panel) {
      panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-modal', 'true');
      panel.setAttribute('aria-label', panel.querySelector('h2, h3')?.textContent?.trim() || 'Workspace panel');
    }
    const close = () => {
      const buttons = Array.from(root.current?.querySelectorAll<HTMLButtonElement>('button') || []);
      buttons.find(button => button.querySelector('svg.lucide-x') || /^(close|cancel)$/i.test(button.textContent?.trim() || ''))?.click();
    };
    const focusables = () => Array.from(root.current?.querySelectorAll<HTMLElement>('button, input, select, textarea, a[href], [tabindex="0"]') || []).filter(el => el.offsetHeight > 0 && !(el as HTMLButtonElement).disabled);
    focusables()[0]?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); close(); }
      if (e.key === 'Tab') {
        const items = focusables();
        if (!items.length) return;
        if (e.shiftKey && document.activeElement === items[0]) { e.preventDefault(); items.at(-1)?.focus(); }
        else if (!e.shiftKey && document.activeElement === items.at(-1)) { e.preventDefault(); items[0]?.focus(); }
      }
    };
    const click = (e: MouseEvent) => { if (e.target === overlay) close(); };
    document.addEventListener('keydown', key);
    overlay?.addEventListener('click', click);
    return () => { document.body.style.overflow = oldOverflow; document.removeEventListener('keydown', key); overlay?.removeEventListener('click', click); previousFocus?.focus(); };
  }, []);
  return createPortal(<div ref={root} className="module-workspace drawer-portal">{children}</div>, document.body);
}
