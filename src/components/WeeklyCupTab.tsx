import { useEffect, useState } from 'react';
import { getNextWeeklyResetAt } from '../lib/gameTime';
import type { PlayerProgress } from '../game/progression';

interface WeeklyCupTabProps {
  progress: PlayerProgress;
}

function formatCountdown(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

export function WeeklyCupTab({ progress }: WeeklyCupTabProps) {
  const cup = progress.weeklyCup;
  const [weekLabel, setWeekLabel] = useState<string | null>(null);

  useEffect(() => {
    const tick = () => {
      const target = getNextWeeklyResetAt().getTime();
      const remaining = target - Date.now();
      if (remaining <= 0) {
        setWeekLabel(null);
        return;
      }
      setWeekLabel(`Weekly cup resets in ${formatCountdown(remaining)}`);
    };

    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);

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
        {weekLabel && <p className="daily-reset-countdown">{weekLabel}</p>}
      </div>
    </div>
  );
}
