import type { GameSnapshot } from '../game/types';
import type { DailyRankContext } from '../hooks/useDailyRank';
import type { GameMode } from '../types/game';

interface HudOverlayProps {
  snapshot: GameSnapshot;
  gameMode: GameMode;
  dailyRank: DailyRankContext | null;
  onToggleMute: () => void;
}

function formatScoreToBeat(dailyRank: DailyRankContext): string {
  if (dailyRank.loading) return '…';
  if (dailyRank.error) return 'unavailable';
  if (dailyRank.scoreToBeatMessage) return dailyRank.scoreToBeatMessage;
  if (dailyRank.scoreToBeat != null) {
    return `${Math.floor(dailyRank.scoreToBeat)}m`;
  }
  return '—';
}

export function HudOverlay({
  snapshot,
  gameMode,
  dailyRank,
  onToggleMute,
}: HudOverlayProps) {
  const velocity = snapshot.citricVelocity.toFixed(2);
  const showDaily = gameMode === 'free' && dailyRank;

  return (
    <div className="overlay hud-overlay" aria-live="polite">
      <div className="hud-top">
        <span className="hud-logo">LEMON ROAD</span>
        <button
          type="button"
          className="mute-btn"
          onClick={onToggleMute}
          aria-label={snapshot.muted ? 'Unmute' : 'Mute'}
        >
          {snapshot.muted ? '🔇 UNMUTE' : '🔊 MUTE'}
        </button>
      </div>

      {showDaily && (
        <div className="hud-reward-strip">
          <p className="hud-reward-full">
            Daily Pool: {dailyRank.poolTotal}
            <br />
            Top 3 win $10 / $6 / $4
            <br />
            Your rank: {dailyRank.playerRankLabel}
            <br />
            Score to beat: {formatScoreToBeat(dailyRank)}
          </p>
          <p className="hud-reward-compact">
            Pool {dailyRank.poolTotal} · {dailyRank.playerRankLabel} · beat{' '}
            {formatScoreToBeat(dailyRank)}
          </p>
        </div>
      )}

      <div className="hud-stats">
        <p>{Math.floor(snapshot.distance)}m</p>
        <p>juice level: {snapshot.juiceLevel}</p>
        <p>citric velocity: {velocity}</p>
        {snapshot.dodgeStreak >= 2 && (
          <p className="hud-combo">combo x{snapshot.dodgeStreak}</p>
        )}
      </div>
      {snapshot.activeEventLabel && (
        <p className="hud-event">{snapshot.activeEventLabel}</p>
      )}
    </div>
  );
}
