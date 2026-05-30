import { fetchTopLemonsLeaderboard, type TopLemonsEntry } from './api';

export type { TopLemonsEntry };

export interface TopLemonsLeaderboardView {
  top10: TopLemonsEntry[];
  /** Set when the current user is ranked outside the top 10. */
  currentUserOutsideTop10: TopLemonsEntry | null;
}

const MOCK_TOP_10: Omit<TopLemonsEntry, 'isCurrentUser'>[] = [
  { rank: 1, username: 'LemonKing', xpGainedLastThreeMonths: 12400, totalLemonXp: 8300 },
  { rank: 2, username: 'RugDestroyer', xpGainedLastThreeMonths: 9800, totalLemonXp: 7200 },
  { rank: 3, username: 'SourRunner', xpGainedLastThreeMonths: 7600, totalLemonXp: 6100 },
  { rank: 4, username: 'Citronaut', xpGainedLastThreeMonths: 6900, totalLemonXp: 5400 },
  { rank: 5, username: 'PeelBandit', xpGainedLastThreeMonths: 6200, totalLemonXp: 4800 },
  { rank: 6, username: 'ZestWizard', xpGainedLastThreeMonths: 5800, totalLemonXp: 4200 },
  { rank: 7, username: 'PulpLord', xpGainedLastThreeMonths: 5100, totalLemonXp: 3900 },
  { rank: 8, username: 'AcidDrop', xpGainedLastThreeMonths: 4700, totalLemonXp: 3400 },
  { rank: 9, username: 'YellowLine', xpGainedLastThreeMonths: 4200, totalLemonXp: 3100 },
  { rank: 10, username: 'MemeSqueezer', xpGainedLastThreeMonths: 3900, totalLemonXp: 2800 },
];

/** Split API/mock rows into top 10 list and optional below-the-fold current user. */
export function partitionTopLemons(entries: TopLemonsEntry[]): TopLemonsLeaderboardView {
  const sorted = [...entries].sort((a, b) => a.rank - b.rank);
  const top10 = sorted.filter((e) => e.rank <= 10).slice(0, 10);
  const current = sorted.find((e) => e.isCurrentUser) ?? null;
  const inTop10 = current != null && top10.some((e) => e.isCurrentUser);

  return {
    top10: top10.length > 0 ? top10 : sorted.slice(0, 10),
    currentUserOutsideTop10: current && !inTop10 ? current : null,
  };
}

function buildMockEntries(username: string, totalLemonXp: number): TopLemonsEntry[] {
  const xpGainedLastThreeMonths = Math.max(850, Math.round(totalLemonXp * 3.25));
  const top10 = MOCK_TOP_10.map((row) => ({
    ...row,
    isCurrentUser: false,
  }));
  const currentUser: TopLemonsEntry = {
    rank: 37,
    username,
    xpGainedLastThreeMonths,
    totalLemonXp,
    isCurrentUser: true,
  };
  return [...top10, currentUser];
}

function getMockTopLemons(username: string, totalLemonXp: number): TopLemonsLeaderboardView {
  return partitionTopLemons(buildMockEntries(username, totalLemonXp));
}

export interface LoadTopLemonsOptions {
  username?: string;
  totalLemonXp?: number;
  /** Force mock data (e.g. while backend is unavailable). */
  useMock?: boolean;
}

/**
 * Load Top Lemons leaderboard (3-month XP gain ranking).
 * Falls back to mock data when the API is missing or fails.
 */
export async function loadTopLemonsLeaderboard(
  options: LoadTopLemonsOptions = {},
): Promise<TopLemonsLeaderboardView> {
  const username = options.username?.trim() || 'You';
  const totalLemonXp = options.totalLemonXp ?? 0;

  if (options.useMock) {
    return getMockTopLemons(username, totalLemonXp);
  }

  try {
    const entries = await fetchTopLemonsLeaderboard();
    if (!Array.isArray(entries) || entries.length === 0) {
      return getMockTopLemons(username, totalLemonXp);
    }
    return partitionTopLemons(entries);
  } catch {
    return getMockTopLemons(username, totalLemonXp);
  }
}
