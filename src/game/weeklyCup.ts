import {
  getGameDateString,
  getWeekId,
  getWeekEndDate,
  getDaysUntilWeekEnd,
  getNextWeeklyResetAt,
} from '../lib/gameTime';

export interface WeeklyCupState {
  currentWeekId: string;
  weeklyBestScore: number;
  runsThisWeek: number;
  placeholderRank: string;
  tournamentEndsAt: string;
}

export function createWeeklyCupState(): WeeklyCupState {
  const now = new Date();
  return {
    currentWeekId: getWeekId(now),
    weeklyBestScore: 0,
    runsThisWeek: 0,
    placeholderRank: 'coming soon',
    tournamentEndsAt: getWeekEndDate(now).toISOString(),
  };
}

export function ensureWeeklyCup(current: WeeklyCupState): WeeklyCupState {
  const weekId = getWeekId();
  if (current.currentWeekId === weekId) return current;
  return {
    currentWeekId: weekId,
    weeklyBestScore: 0,
    runsThisWeek: 0,
    placeholderRank: 'coming soon',
    tournamentEndsAt: getWeekEndDate().toISOString(),
  };
}

export function updateWeeklyCupAfterRun(
  cup: WeeklyCupState,
  distance: number,
): WeeklyCupState {
  const fresh = ensureWeeklyCup(cup);
  return {
    ...fresh,
    runsThisWeek: fresh.runsThisWeek + 1,
    weeklyBestScore: Math.max(fresh.weeklyBestScore, Math.floor(distance)),
  };
}

export { getDaysUntilWeekEnd, getNextWeeklyResetAt, getGameDateString as getLocalDateString };
