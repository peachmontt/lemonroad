import { currentDayBucket, previousDayBucket, dayBucketToDate } from './day';

export const DAILY_FREE_POOL_USDT = 20;
export const DAILY_PRIZE_AMOUNTS: Record<number, string> = {
  1: '10',
  2: '6',
  3: '4',
};

/** Legacy midnight UTC anchor used before GMT+3 21:00 reset migration. */
export function legacyDayBucketToDate(bucket: string): Date {
  return new Date(`${bucket}T00:00:00.000Z`);
}

export function dayBucketDateOrFilter(bucket: string) {
  return {
    OR: [{ date: dayBucketToDate(bucket) }, { date: legacyDayBucketToDate(bucket) }],
  };
}

const MS_PER_HOUR = 3_600_000;

/** Pool ledger id for the active game day (unix hour of 21:00 GMT+3 day start). */
export function currentDayPoolBucket(now = new Date()): string {
  return String(Math.floor(dayBucketToDate(currentDayBucket(now)).getTime() / MS_PER_HOUR));
}

export function previousDayPoolBucket(now = new Date()): string {
  return String(Math.floor(dayBucketToDate(previousDayBucket(now)).getTime() / MS_PER_HOUR));
}

export function dayPoolBucketToDate(bucket: string): Date {
  return new Date(Number(bucket) * MS_PER_HOUR);
}

export type PayoutDisplayStatus = 'PENDING' | 'PAID' | 'REJECTED';

/** User-facing payout label for past daily leaderboard rows. */
export function resolvePayoutDisplayStatus(
  position: number,
  rewardStatus: 'PENDING' | 'AWARDED' | 'REJECTED',
  paidStatus: string | null | undefined,
): PayoutDisplayStatus | null {
  if (paidStatus === 'PAID' || paidStatus === 'PENDING' || paidStatus === 'REJECTED') {
    return paidStatus;
  }
  if (rewardStatus === 'REJECTED') return 'REJECTED';
  if (position <= 3) return 'PENDING';
  return null;
}
