/** Matches client progression: lemonXp += Math.floor(distance / 50) per run. */
export const LEMON_XP_PER_DISTANCE = 50;

export function xpFromRunDistance(distance: number): number {
  return Math.floor(Math.max(0, distance) / LEMON_XP_PER_DISTANCE);
}

export function threeMonthsAgo(from: Date = new Date()): Date {
  const d = new Date(from);
  d.setMonth(d.getMonth() - 3);
  return d;
}
