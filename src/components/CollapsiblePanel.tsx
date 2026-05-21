import type { ReactNode } from 'react';

interface CollapsiblePanelProps {
  title: string;
  subtitle?: string | null;
  open: boolean;
  onToggle: () => void;
  className?: string;
  children: ReactNode;
}

export function CollapsiblePanel({
  title,
  subtitle,
  open,
  onToggle,
  className = '',
  children,
}: CollapsiblePanelProps) {
  return (
    <div className={`collapsible-panel ${open ? 'is-open' : ''} ${className}`.trim()}>
      <button
        type="button"
        className="collapsible-panel-header"
        onClick={onToggle}
        aria-expanded={open}
      >
        <span className="collapsible-panel-heading">
          <span className="collapsible-panel-title">{title}</span>
          {subtitle ? (
            <span className="collapsible-panel-subtitle">{subtitle}</span>
          ) : null}
        </span>
        <span className="collapsible-panel-chevron" aria-hidden>
          {open ? '−' : '+'}
        </span>
      </button>
      {open ? <div className="collapsible-panel-body">{children}</div> : null}
    </div>
  );
}
