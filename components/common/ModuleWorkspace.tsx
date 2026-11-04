import React, { createContext, useContext } from 'react';
import './module-workspace.css';

const WorkspaceContext = createContext(false);
export type WorkspaceKind = 'editor' | 'ledger' | 'insights' | 'directory' | 'settings' | 'studio' | 'access';
type Props = { id: string; title: string; description: string; category: string; kind: WorkspaceKind; number: string; links?: { label: string; path: string }[]; children: React.ReactNode };

export function ModuleWorkspace({ id, title, description, kind, children }: Props) {
  const embedded = useContext(WorkspaceContext);
  if (embedded) return <div className={`v2-embedded v2-${id}`}>{children}</div>;
  return <WorkspaceContext.Provider value={true}>
    <div className={`module-workspace workbench-${kind} v2-${id}`} data-module={id}>
      <header className="module-page-heading overview-heading">
        <div><h1>{title}<span className="module-title-dot">.</span></h1><p>{description}</p></div>
      </header>
      <div className="workbench-stage">{children}</div>
    </div>
  </WorkspaceContext.Provider>;
}
