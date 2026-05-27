export interface WeeklyCupState {
  currentWeekId: string;
  weeklyBestScore: number;
  runsThisWeek: number;
  placeholderRank: string;
  tournamentEndsAt: string;
}

export function getLocalDateString(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function getWeekId(d = new Date()): string {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

export function getWeekEndDate(d = new Date()): Date {
  const end = new Date(d);
  const day = end.getDay();
  const daysUntilSunday = day === 0 ? 0 : 7 - day;
  end.setDate(end.getDate() + daysUntilSunday);
  end.setHours(23, 59, 59, 999);
  return end;
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

export function getDaysUntilWeekEnd(): number {
  const end = getWeekEndDate();
  const now = new Date();
  const diff = end.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (24 * 60 * 60 * 1000)));
}
