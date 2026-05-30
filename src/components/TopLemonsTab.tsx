import { useEffect, useState } from 'react';
import type { TopLemonsEntry } from '../lib/api';
import {
  formatLemonLevelShort,
  formatXpGained,
  getLemonLevel,
  formatLemonLevelLabel,
} from '../lib/lemonLevels';
import { loadTopLemonsLeaderboard, type TopLemonsLeaderboardView } from '../lib/topLemons';
import { LemonLoader } from './LemonLoader';

interface TopLemonsTabProps {
  totalLemonXp: number;
  displayName?: string;
}

function TopLemonsRow({ entry, highlight }: { entry: TopLemonsEntry; highlight?: boolean }) {
  const level = getLemonLevel(entry.totalLemonXp);

  return (
    <div
      className={`lemon-club-card top-lemons-row${highlight ? ' top-lemons-row--you' : ''}`}
    >
      <p className="top-lemons-row-line">
        <span className="top-lemons-rank">#{entry.rank}</span>{' '}
        <span className="top-lemons-name">{entry.username}</span>{' '}
        <span className="top-lemons-xp">{formatXpGained(entry.xpGainedLastThreeMonths)}</span>{' '}
        <span className="top-lemons-level">{formatLemonLevelShort(level.level)}</span>
      </p>
    </div>
  );
}

export function TopLemonsTab({ totalLemonXp, displayName }: TopLemonsTabProps) {
  const [view, setView] = useState<TopLemonsLeaderboardView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    void loadTopLemonsLeaderboard({
      username: displayName ?? 'You',
      totalLemonXp,
    })
      .then((data) => {
        if (!cancelled) setView(data);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setView(null);
          setError(err instanceof Error ? err.message : 'Failed to load leaderboard');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [displayName, totalLemonXp]);

  const outside = view?.currentUserOutsideTop10;
  const outsideLevel = outside ? getLemonLevel(outside.totalLemonXp) : null;

  return (
    <div className="lemon-club-tab-panel top-lemons-panel">
      <h3 className="top-lemons-title">🏆 Top Lemons</h3>
      <p className="lemon-club-muted top-lemons-subtitle">
        Top 10 Lemon
      </p>

      {loading && <LemonLoader label="ranking the zestiest…" />}

      {!loading && error && !view && (
        <p className="lemon-club-muted">Could not load Top Lemons: {error}</p>
      )}

      {!loading && view && (
        <>
          <div className="top-lemons-list" role="list">
            {view.top10.map((entry) => (
              <TopLemonsRow
                key={`${entry.rank}-${entry.username}`}
                entry={entry}
                highlight={entry.isCurrentUser}
              />
            ))}
          </div>

          {outside && outsideLevel && (
            <div className="top-lemons-you">
              <p className="top-lemons-you-rank">Your rank: #{outside.rank}</p>
              <p className="top-lemons-you-xp">
                Your 3-month XP: {formatXpGained(outside.xpGainedLastThreeMonths)}
              </p>
              <p className="top-lemons-you-level">{formatLemonLevelLabel(outsideLevel.level, outsideLevel.title)}</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
