import { useEffect, useState } from 'react';
import { getNextHourlySettleAt } from '../lib/hour';

export function formatCountdown(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

const RESET_LABELS = {
  daily: (time: string) => `Daily rewards reset in ${time}`,
  weekly: (time: string) => `Weekly cup resets in ${time}`,
  degen: (time: string) => `Next degen payout in ${time}`,
} as const;

type ResetCountdownVariant = keyof typeof RESET_LABELS;

interface ResetCountdownProps {
  nextResetAt: string | null;
  variant: ResetCountdownVariant;
  className?: string;
}

export function ResetCountdown({
  nextResetAt,
  variant,
  className = 'reset-countdown',
}: ResetCountdownProps) {
  const [label, setLabel] = useState<string | null>(null);
  const formatLabel = RESET_LABELS[variant];

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
      setLabel(formatLabel(formatCountdown(remaining)));
    };

    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [nextResetAt, formatLabel]);

  if (!label) return null;

  return <p className={className}>{label}</p>;
}

interface DailyResetCountdownProps {
  nextResetAt: string | null;
  className?: string;
}

export function DailyResetCountdown({
  nextResetAt,
  className = 'daily-reset-countdown',
}: DailyResetCountdownProps) {
  return (
    <ResetCountdown nextResetAt={nextResetAt} variant="daily" className={className} />
  );
}

export function DegenPayoutCountdown({
  className = 'daily-reset-countdown degen-payout-countdown',
}: {
  className?: string;
}) {
  const [nextAt, setNextAt] = useState(() => getNextHourlySettleAt().toISOString());

  useEffect(() => {
    const id = window.setInterval(() => {
      setNextAt(getNextHourlySettleAt().toISOString());
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  return <ResetCountdown nextResetAt={nextAt} variant="degen" className={className} />;
}
