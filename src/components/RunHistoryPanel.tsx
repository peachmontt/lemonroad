import type { RunRecord } from '../lib/api';

interface RunHistoryPanelProps {
  runs: RunRecord[];
}

export function RunHistoryPanel({ runs }: RunHistoryPanelProps) {
  if (runs.length === 0) return null;

  const best = runs.reduce((a, b) => (b.distance > a.distance ? b : a));

  return (
    <div className="run-history">
      <h3 className="run-history-title">YOUR SQUEEZE LOG</h3>
      <p className="run-history-best">
        best: {Math.floor(best.distance)}m ({best.mode})
      </p>
      <ul className="run-history-list">
        {runs.slice(0, 8).map((r) => (
          <li key={r.id}>
            <span className={`mode-tag mode-${r.mode}`}>{r.mode}</span>
            {Math.floor(r.distance)}m · {r.juiceLevel}
          </li>
        ))}
      </ul>
    </div>
  );
}
