import { fetchTopLemonsLeaderboard, type TopLemonsEntry } from './api';

export type { TopLemonsEntry };

export interface TopLemonsLeaderboardView {
  top10: TopLemonsEntry[];
  /** Set when the current user is ranked outside the top 10. */
  currentUserOutsideTop10: TopLemonsEntry | null;
}

/** Split API payload into top 10 list and optional below-the-fold current user. */
export function partitionTopLemons(entries: TopLemonsEntry[]): TopLemonsLeaderboardView {
  if (entries.length === 0) {
    return { top10: [], currentUserOutsideTop10: null };
  }

  const sorted = [...entries].sort((a, b) => a.rank - b.rank);
  const current = sorted.find((e) => e.isCurrentUser) ?? null;
  const top10 = sorted.filter((e) => e.rank <= 10).slice(0, 10);
  const inTop10 = current != null && top10.some((e) => e.isCurrentUser);

  return {
    top10,
    currentUserOutsideTop10: current && !inTop10 ? current : null,
  };
}

export interface LoadTopLemonsOptions {
  /** @deprecated Client totals are ignored; ranks come from the server. */
  username?: string;
  /** @deprecated Client totals are ignored; ranks come from the server. */
  totalLemonXp?: number;
}

/**
 * Load Top Lemons leaderboard (3-month XP from valid game runs in the database).
 */
export async function loadTopLemonsLeaderboard(
  _options: LoadTopLemonsOptions = {},
): Promise<TopLemonsLeaderboardView> {
  const entries = await fetchTopLemonsLeaderboard();
  if (!Array.isArray(entries)) {
    return { top10: [], currentUserOutsideTop10: null };
  }
  return partitionTopLemons(entries);
}
