import { useEffect, useState } from 'react';
import { fetchPoolLeaderboard, type PoolLeaderboardResponse } from '../lib/api';

interface LeaderboardPanelProps {
  compact?: boolean;
}

export function LeaderboardPanel({ compact }: LeaderboardPanelProps) {
  const [data, setData] = useState<PoolLeaderboardResponse | null>(null);
  const [hour, setHour] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void fetchPoolLeaderboard(hour)
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
  }, [hour]);

  if (loading && !data) {
    return <p className="leaderboard-loading">loading pool rankings...</p>;
  }

  if (error && !data) {
    return <p className="leaderboard-empty">could not load pool: {error}</p>;
  }

  if (!data) return null;

  return (
    <div className={`leaderboard-panel ${compact ? 'compact' : ''}`}>
      <h3 className="leaderboard-title">GAME MODE POOL</h3>
      <p className="leaderboard-meta">
        hour {data.hourLabel} · {data.participants} players · pool{' '}
        {data.poolTotalFormatted}
      </p>
      <p className="leaderboard-rules">
        60% / 30% / 10% — 2nd needs 5+ · 3rd needs 15+
      </p>
      {data.projectedPayouts.length > 0 && (
        <ul className="payout-preview">
          {data.projectedPayouts.map((p) => (
            <li key={p.place}>
              #{p.place}: {p.amountFormatted}
            </li>
          ))}
        </ul>
      )}
      <ol className="leaderboard-list">
        {data.entries.slice(0, compact ? 5 : 15).map((e) => (
          <li key={e.walletPubkey}>
            <span className="lb-rank">#{e.rank}</span>
            <span className="lb-name">{e.displayName}</span>
            <span className="lb-dist">{Math.floor(e.distance)}m</span>
          </li>
        ))}
      </ol>
      {data.entries.length === 0 && (
        <p className="leaderboard-empty">no paid runs this hour yet</p>
      )}
      <div className="leaderboard-nav">
        <button
          type="button"
          className="link-btn"
          onClick={() => setHour(undefined)}
        >
          current hour
        </button>
        <button
          type="button"
          className="link-btn"
          onClick={() => setHour(data.previousHour)}
        >
          previous hour
        </button>
      </div>
    </div>
  );
}
