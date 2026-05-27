import { useEffect, useState } from 'react';

function formatCountdown(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

interface DailyResetCountdownProps {
  nextResetAt: string | null;
  className?: string;
}

export function DailyResetCountdown({
  nextResetAt,
  className = 'daily-reset-countdown',
}: DailyResetCountdownProps) {
  const [label, setLabel] = useState<string | null>(null);

  useEffect(() => {
    if (!nextResetAt) {
      setLabel(null);
      return;
    }

    const target = Date.parse(nextResetAt);
    if (Number.isNaN(target)) {
      setLabel(null);
      return;
    }

    const tick = () => {
      const remaining = target - Date.now();
      if (remaining <= 0) {
        setLabel(null);
        return;
      }
      setLabel(`Daily rewards reset in ${formatCountdown(remaining)}`);
    };

    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [nextResetAt]);

  if (!label) return null;

  return <p className={className}>{label}</p>;
}
