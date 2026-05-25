import type { RunRecord } from '../lib/api';
import { CollapsiblePanel } from './CollapsiblePanel';
import { LemonLoader } from './LemonLoader';

interface RunHistoryPanelProps {
  runs: RunRecord[];
  loading?: boolean;
  open: boolean;
  onToggle: () => void;
}

export function RunHistoryPanel({ runs, loading = false, open, onToggle }: RunHistoryPanelProps) {
  if (loading) {
    return (
      <CollapsiblePanel
        title="YOUR SQUEEZE LOG"
        subtitle="loading…"
        open={open}
        onToggle={onToggle}
        className="run-history"
      >
        <LemonLoader label="squeezing your history..." />
      </CollapsiblePanel>
    );
  }

  if (runs.length === 0) return null;

  const best = runs.reduce((a, b) => (b.distance > a.distance ? b : a));
  const subtitle = `best: ${Math.floor(best.distance)}m (${best.mode})`;

  return (
    <CollapsiblePanel
      title="YOUR SQUEEZE LOG"
      subtitle={subtitle}
      open={open}
      onToggle={onToggle}
      className="run-history"
    >
      <ul className="run-history-list">
        {runs.slice(0, 8).map((r) => (
          <li key={r.id}>
            <span className={`mode-tag mode-${r.mode}`}>{r.mode}</span>
            {Math.floor(r.distance)}m · {r.juiceLevel}
          </li>
        ))}
      </ul>
    </CollapsiblePanel>
  );
}
