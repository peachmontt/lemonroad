import { useEffect, useState } from 'react';
import {
  fetchGlobalLeaderboard,
  fetchDailyLeaderboard,
  type GlobalLeaderboardResponse,
  type DailyLeaderboardResponse,
  type DailyRewardStatus,
} from '../lib/api';
import { CollapsiblePanel } from './CollapsiblePanel';
import { LemonLoader } from './LemonLoader';

interface GlobalLeaderboardPanelProps {
  compact?: boolean;
  open: boolean;
  onToggle: () => void;
  currentPlayerId?: string | null;
}

type Tab = 'daily-today' | 'daily-yesterday' | 'global';

const PAID_STATUS_LABEL: Record<NonNullable<DailyRewardStatus>, string> = {
  PENDING: 'pending',
  PAID: 'paid',
  REJECTED: 'rejected',
};

const PAID_STATUS_CLASS: Record<NonNullable<DailyRewardStatus>, string> = {
  PENDING: 'status-pending',
  PAID: 'status-paid',
  REJECTED: 'status-rejected',
};

export function GlobalLeaderboardPanel({
  compact,
  open,
  onToggle,
  currentPlayerId,
}: GlobalLeaderboardPanelProps) {
  const [tab, setTab] = useState<Tab>('daily-today');
  const [dailyToday, setDailyToday] = useState<DailyLeaderboardResponse | null>(null);
  const [dailyYesterday, setDailyYesterday] = useState<DailyLeaderboardResponse | null>(null);
  const [globalData, setGlobalData] = useState<GlobalLeaderboardResponse | null>(null);
  const [globalMode, setGlobalMode] = useState<'free' | 'paid' | 'all'>('free');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const fetcher =
      tab === 'daily-today'
        ? fetchDailyLeaderboard('today')
        : tab === 'daily-yesterday'
          ? fetchDailyLeaderboard('yesterday')
          : fetchGlobalLeaderboard(globalMode, compact ? 15 : 50);

    fetcher
      .then((data) => {
        if (cancelled) return;
        if (tab === 'daily-today') setDailyToday(data as DailyLeaderboardResponse);
        else if (tab === 'daily-yesterday') setDailyYesterday(data as DailyLeaderboardResponse);
        else setGlobalData(data as GlobalLeaderboardResponse);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'load failed');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [tab, globalMode, compact]);

  const subtitle = loading
    ? 'loading…'
    : error
      ? 'load failed'
      : tab === 'daily-today'
        ? "today's free runs"
        : tab === 'daily-yesterday'
          ? "yesterday · results"
          : `best run per player · ${globalMode}`;

  function renderDailyEntries(data: DailyLeaderboardResponse) {
    if (data.entries.length === 0) {
      return <p className="leaderboard-empty">no runs yet — be the first lemon</p>;
    }
    const limit = compact ? 10 : 25;
    return (
      <ol className="leaderboard-list">
        {data.entries.slice(0, limit).map((e) => {
          const isMe = currentPlayerId && e.playerId === currentPlayerId;
          return (
            <li
              key={e.playerId}
              className={isMe ? 'lb-row lb-row-me' : 'lb-row'}
            >
              <span className="lb-rank">#{e.position}</span>
              <span className="lb-name">
                {e.displayName}
                {isMe && <span className="lb-you"> (you)</span>}
              </span>
              <span className="lb-dist">{Math.floor(e.bestDistance)}m</span>
              {e.paidStatus && (
                <span className={`lb-reward-status ${PAID_STATUS_CLASS[e.paidStatus]}`}>
                  {PAID_STATUS_LABEL[e.paidStatus]}
                </span>
              )}
              {!e.paidStatus && e.rewardStatus === 'AWARDED' && (
                <span className="lb-reward-status status-pending">pending</span>
              )}
              {!e.paidStatus && e.rewardStatus === 'REJECTED' && (
                <span className="lb-reward-status status-rejected">rejected</span>
              )}
            </li>
          );
        })}
      </ol>
    );
  }

  const body = loading && !dailyToday && !dailyYesterday && !globalData ? (
    <LemonLoader label="loading rankings..." />
  ) : error && !dailyToday && !dailyYesterday && !globalData ? (
    <p className="leaderboard-empty">could not load: {error}</p>
  ) : (
    <>
      {tab === 'daily-today' && dailyToday && renderDailyEntries(dailyToday)}
      {tab === 'daily-yesterday' && dailyYesterday && renderDailyEntries(dailyYesterday)}
      {tab === 'global' && globalData && (
        <>
          <ol className="leaderboard-list">
            {globalData.entries.slice(0, compact ? 10 : 25).map((e) => (
              <li key={`${e.rank}-${e.displayName}`} className="lb-row">
                <span className="lb-rank">#{e.rank}</span>
                <span className="lb-name">{e.displayName}</span>
                <span className={`mode-tag mode-${e.mode}`}>{e.mode}</span>
                <span className="lb-dist">{Math.floor(e.distance)}m</span>
              </li>
            ))}
          </ol>
          {globalData.entries.length === 0 && (
            <p className="leaderboard-empty">no runs yet — be the first lemon</p>
          )}
          <div className="leaderboard-nav">
            {(['free', 'paid', 'all'] as const).map((m) => (
              <button
                key={m}
                type="button"
                className={`link-btn ${globalMode === m ? 'active' : ''}`}
                onClick={() => setGlobalMode(m)}
              >
                {m}
              </button>
            ))}
          </div>
        </>
      )}

      <div className="leaderboard-nav leaderboard-tabs">
        <button
          type="button"
          className={`link-btn ${tab === 'daily-today' ? 'active' : ''}`}
          onClick={() => setTab('daily-today')}
        >
          today
        </button>
        <button
          type="button"
          className={`link-btn ${tab === 'daily-yesterday' ? 'active' : ''}`}
          onClick={() => setTab('daily-yesterday')}
        >
          yesterday
        </button>
        <button
          type="button"
          className={`link-btn ${tab === 'global' ? 'active' : ''}`}
          onClick={() => setTab('global')}
        >
          all time
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
