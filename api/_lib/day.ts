import {
  currentGameDayBucket,
  previousGameDayBucket,
  gameDayBucketToDate,
  getNextDailyResetAt,
  RESET_TIMEZONE_LABEL,
} from '../../shared/gameTime';

/** Active game-day bucket in YYYY-MM-DD (GMT+3, resets at 21:00). */
export function currentDayBucket(now?: Date): string {
  return currentGameDayBucket(now);
}

export function previousDayBucket(now?: Date): string {
  return previousGameDayBucket(now);
}

/** Parse a YYYY-MM-DD bucket into its anchor Date (21:00 GMT+3). */
export function dayBucketToDate(bucket: string): Date {
  return gameDayBucketToDate(bucket);
}

export { getNextDailyResetAt, RESET_TIMEZONE_LABEL };
