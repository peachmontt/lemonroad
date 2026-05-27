/** UTC hour bucket id (unix hour). */
export function currentHourBucket(now = new Date()): string {
  return String(Math.floor(now.getTime() / 3_600_000));
}

export function hourBucketToDate(bucket: string): Date {
  const hour = Number(bucket);
  return new Date(hour * 3_600_000);
}

export function previousHourBucket(now = new Date()): string {
  return String(Number(currentHourBucket(now)) - 1);
}

/** Degen pools settle at this minute past each UTC hour. */
export const HOURLY_SETTLE_MINUTE_UTC = 5;

/** Next UTC time when the previous hour's degen pool is settled. */
export function getNextHourlySettleAt(now = new Date()): Date {
  const ms = now.getTime();
  const hourMs = 3_600_000;
  const settleOffsetMs = HOURLY_SETTLE_MINUTE_UTC * 60_000;
  const currentHourStart = Math.floor(ms / hourMs) * hourMs;
  const thisHourSettle = currentHourStart + settleOffsetMs;
  if (ms < thisHourSettle) {
    return new Date(thisHourSettle);
  }
  return new Date(currentHourStart + hourMs + settleOffsetMs);
}

export function hourBucketLabel(bucket: string): string {
  const d = hourBucketToDate(bucket);
  return d.toISOString().replace(':00:00.000Z', 'Z');
}
