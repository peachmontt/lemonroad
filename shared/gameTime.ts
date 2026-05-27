/** Fixed GMT+3 offset (no DST). */
export const GAME_TZ_OFFSET_HOURS = 3;
export const DAILY_RESET_HOUR = 21;
export const RESET_TIMEZONE_LABEL = 'GMT+3';

const MS_PER_HOUR = 3_600_000;
const MS_PER_DAY = 86_400_000;
const GAME_TZ_OFFSET_MS = GAME_TZ_OFFSET_HOURS * MS_PER_HOUR;

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/** GMT+3 wall-clock parts for a UTC instant. */
export function getGameTimeParts(now = new Date()): {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  dayOfWeek: number;
} {
  const shifted = new Date(now.getTime() + GAME_TZ_OFFSET_MS);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
    hour: shifted.getUTCHours(),
    minute: shifted.getUTCMinutes(),
    second: shifted.getUTCSeconds(),
    dayOfWeek: shifted.getUTCDay(),
  };
}

export function formatGameDayBucket(year: number, month: number, day: number): string {
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

/** Active game-day label; rolls at 21:00 GMT+3. */
export function currentGameDayBucket(now = new Date()): string {
  const { year, month, day, hour } = getGameTimeParts(now);
  if (hour >= DAILY_RESET_HOUR) {
    return formatGameDayBucket(year, month, day);
  }
  const prev = new Date(Date.UTC(year, month - 1, day) - MS_PER_DAY);
  return formatGameDayBucket(
    prev.getUTCFullYear(),
    prev.getUTCMonth() + 1,
    prev.getUTCDate(),
  );
}

export function previousGameDayBucket(now = new Date()): string {
  const bucket = currentGameDayBucket(now);
  const anchor = gameDayBucketToDate(bucket);
  return currentGameDayBucket(new Date(anchor.getTime() - 1));
}

/** Bucket anchor = game day start at 21:00 GMT+3 (= 18:00 UTC). */
export function gameDayBucketToDate(bucket: string): Date {
  return new Date(`${bucket}T${pad2(18)}:00:00.000Z`);
}

export function getGameDateString(now = new Date()): string {
  return currentGameDayBucket(now);
}

export function getNextDailyResetAt(now = new Date()): Date {
  const { year, month, day, hour, minute, second } = getGameTimeParts(now);
  const todayResetUtc = Date.UTC(year, month - 1, day, 18, 0, 0, 0);
  const nowGameMs =
    Date.UTC(year, month - 1, day, hour, minute, second) - GAME_TZ_OFFSET_MS;

  if (nowGameMs < todayResetUtc) {
    return new Date(todayResetUtc);
  }
  return new Date(todayResetUtc + MS_PER_DAY);
}

/** Next Sunday 21:00 GMT+3 — start of the next game week. */
export function getNextWeeklyResetAt(now = new Date()): Date {
  const { year, month, day, hour, minute, second, dayOfWeek } = getGameTimeParts(now);
  const todayResetUtc = Date.UTC(year, month - 1, day, 18, 0, 0, 0);
  const nowGameMs =
    Date.UTC(year, month - 1, day, hour, minute, second) - GAME_TZ_OFFSET_MS;

  const daysUntilSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
  let sundayResetUtc = todayResetUtc + daysUntilSunday * MS_PER_DAY;

  if (dayOfWeek === 0) {
    if (nowGameMs >= todayResetUtc) {
      sundayResetUtc = todayResetUtc + 7 * MS_PER_DAY;
    }
  } else if (nowGameMs >= todayResetUtc) {
    sundayResetUtc = todayResetUtc + daysUntilSunday * MS_PER_DAY;
  }

  return new Date(sundayResetUtc);
}

/** Week id = game-day label of the current week start (Sunday 21:00 GMT+3). */
export function getWeekId(now = new Date()): string {
  const nextReset = getNextWeeklyResetAt(now);
  const weekStart = new Date(nextReset.getTime() - 7 * MS_PER_DAY);
  const { year, month, day } = getGameTimeParts(weekStart);
  return formatGameDayBucket(year, month, day);
}

export function getWeekEndDate(now = new Date()): Date {
  return getNextWeeklyResetAt(now);
}

export function getDaysUntilWeekEnd(now = new Date()): number {
  const end = getNextWeeklyResetAt(now);
  const diff = end.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / MS_PER_DAY));
}
