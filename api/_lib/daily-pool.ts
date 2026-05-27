import { dayBucketToDate } from './day';

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
