import { getDaysUntilWeekEnd } from '../game/weeklyCup';
import type { PlayerProgress } from '../game/progression';

interface WeeklyCupTabProps {
  progress: PlayerProgress;
}

export function WeeklyCupTab({ progress }: WeeklyCupTabProps) {
  const cup = progress.weeklyCup;
  const daysLeft = getDaysUntilWeekEnd();

  return (
    <div className="lemon-club-tab-panel">
      <h3>Weekly Lemon Cup 🏆</h3>
      <p className="lemon-club-tagline">One week. One lemon. Infinite suffering.</p>
      <p className="lemon-club-muted">
        Top 50 players get a special badge / whitelist / bonus
      </p>
      <p className="lemon-club-muted lemon-club-fine">
        Rewards may include badges, whitelist spots, or bonus cosmetics.
      </p>

      <div className="lemon-club-card">
        <p>Your best this week: {Math.floor(cup.weeklyBestScore)}m</p>
        <p>Runs this week: {cup.runsThisWeek}</p>
        <p>Estimated rank: {cup.placeholderRank}</p>
        <p>Ends in: {daysLeft} day{daysLeft === 1 ? '' : 's'}</p>
      </div>
    </div>
  );
}
