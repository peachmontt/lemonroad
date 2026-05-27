import {
  currentGameDayBucket,
  previousGameDayBucket,
  gameDayBucketToDate,
  getNextDailyResetAt,
  RESET_TIMEZONE_LABEL,
} from '../../shared/gameTime';

/** Active game-day bucket in YYYY-MM-DD (GMT+3, resets at 21:00). */
export function currentDayBucket(): string {
  return currentGameDayBucket();
}

export function previousDayBucket(): string {
  return previousGameDayBucket();
}

/** Parse a YYYY-MM-DD bucket into its anchor Date (21:00 GMT+3). */
export function dayBucketToDate(bucket: string): Date {
  return gameDayBucketToDate(bucket);
}

export { getNextDailyResetAt, RESET_TIMEZONE_LABEL };
