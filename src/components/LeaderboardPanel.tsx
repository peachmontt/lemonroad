import { useEffect, useState } from 'react';
import { fetchPoolLeaderboard, type PoolLeaderboardResponse } from '../lib/api';
import { CollapsiblePanel } from './CollapsiblePanel';
import { DegenPayoutCountdown } from './DailyResetCountdown';
import { LemonLoader } from './LemonLoader';

interface LeaderboardPanelProps {
  compact?: boolean;
  open: boolean;
  onToggle: () => void;
}

export function LeaderboardPanel({ compact, open, onToggle }: LeaderboardPanelProps) {
  const [data, setData] = useState<PoolLeaderboardResponse | null>(null);
  const [day, setDay] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void fetchPoolLeaderboard(day)
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
  }, [day]);

  const subtitle =
    loading && !data
      ? 'loading…'
      : error && !data
        ? 'load failed'
        : data
          ? `${data.dayLabel} · ${data.participants} players · pool ${data.poolTotalFormatted}`
          : null;

  const body =
    loading && !data ? (
      <LemonLoader label="loading pool rankings..." />
    ) : error && !data ? (
      <p className="leaderboard-empty">could not load pool: {error}</p>
    ) : !data ? null : (
      <>
        <p className="leaderboard-rules">
          60% / 30% / 10% — 2nd needs 5+ · 3rd needs 15+
        </p>
        <DegenPayoutCountdown className="daily-reset-countdown degen-payout-countdown" />
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
          <p className="leaderboard-empty">no paid runs today yet</p>
        )}
        <div className="leaderboard-nav">
          <button
            type="button"
            className="link-btn"
            onClick={() => setDay(undefined)}
          >
            today
          </button>
          <button
            type="button"
            className="link-btn"
            onClick={() => setDay(data.previousDay)}
          >
            yesterday
          </button>
        </div>
      </>
    );

  return (
    <CollapsiblePanel
      title="GAME MODE POOL"
      subtitle={subtitle}
      open={open}
      onToggle={onToggle}
      className="leaderboard-panel compact"
    >
      {body}
    </CollapsiblePanel>
  );
}
