import { useEffect, useState } from 'react';
import {
  fetchGlobalLeaderboard,
  type GlobalLeaderboardResponse,
} from '../lib/api';
import { CollapsiblePanel } from './CollapsiblePanel';

interface GlobalLeaderboardPanelProps {
  compact?: boolean;
  open: boolean;
  onToggle: () => void;
}

export function GlobalLeaderboardPanel({
  compact,
  open,
  onToggle,
}: GlobalLeaderboardPanelProps) {
  const [data, setData] = useState<GlobalLeaderboardResponse | null>(null);
  const [mode, setMode] = useState<'free' | 'paid' | 'all'>('free');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void fetchGlobalLeaderboard(mode, compact ? 15 : 50)
      .then((lb) => {
        if (!cancelled) setData(lb);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setData(null);
          setError(err instanceof Error ? err.message : 'load failed');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [mode, compact]);

  const modeLabel =
    mode === 'all' ? 'all runs' : mode === 'free' ? 'free fun' : 'game mode';

  const subtitle =
    loading && !data
      ? 'loading…'
      : error && !data
        ? 'load failed'
        : `best run per player · ${modeLabel}`;

  const body =
    loading && !data ? (
      <p className="leaderboard-loading">loading global rankings...</p>
    ) : error && !data ? (
      <p className="leaderboard-empty">could not load rankings: {error}</p>
    ) : !data ? null : (
      <>
        <ol className="leaderboard-list">
          {data.entries.slice(0, compact ? 10 : 25).map((e) => (
            <li key={`${e.rank}-${e.displayName}`}>
              <span className="lb-rank">#{e.rank}</span>
              <span className="lb-name">{e.displayName}</span>
              <span className={`mode-tag mode-${e.mode}`}>{e.mode}</span>
              <span className="lb-dist">{Math.floor(e.distance)}m</span>
            </li>
          ))}
        </ol>
        {data.entries.length === 0 && (
          <p className="leaderboard-empty">no runs yet — be the first lemon</p>
        )}
        <div className="leaderboard-nav">
          <button
            type="button"
            className={`link-btn ${mode === 'free' ? 'active' : ''}`}
            onClick={() => setMode('free')}
          >
            free
          </button>
          <button
            type="button"
            className={`link-btn ${mode === 'paid' ? 'active' : ''}`}
            onClick={() => setMode('paid')}
          >
            paid
          </button>
          <button
            type="button"
            className={`link-btn ${mode === 'all' ? 'active' : ''}`}
            onClick={() => setMode('all')}
          >
            all
          </button>
        </div>
      </>
    );

  return (
    <CollapsiblePanel
      title="TOP SQUEEZERS"
      subtitle={subtitle}
      open={open}
      onToggle={onToggle}
      className="leaderboard-panel compact"
    >
      {body}
    </CollapsiblePanel>
  );
}
