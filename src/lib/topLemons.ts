import { fetchTopLemonsLeaderboard, type TopLemonsEntry } from './api';

export type { TopLemonsEntry };

/** Must match api/_lib/top-lemons-board.ts */
export const TOP_LEMONS_LEADERBOARD_SIZE = 100;

export interface TopLemonsLeaderboardView {
  /** Up to 100 ranked rows (NPCs interleaved with real players). */
  entries: TopLemonsEntry[];
  /** Set when the current user is ranked outside the visible top 100. */
  currentUserOutside: TopLemonsEntry | null;
}

/** Split API payload into the main list and optional pinned current-user row. */
export function partitionTopLemons(entries: TopLemonsEntry[]): TopLemonsLeaderboardView {
  if (entries.length === 0) {
    return { entries: [], currentUserOutside: null };
  }

  const sorted = [...entries].sort((a, b) => a.rank - b.rank);
  const current = sorted.find((e) => e.isCurrentUser) ?? null;
  const main = sorted.filter((e) => e.rank <= TOP_LEMONS_LEADERBOARD_SIZE).slice(0, TOP_LEMONS_LEADERBOARD_SIZE);
  const inMain = current != null && main.some((e) => e.isCurrentUser);

  return {
    entries: main,
    currentUserOutside: current && !inMain ? current : null,
  };
}

export interface LoadTopLemonsOptions {
  /** @deprecated Ranks come from the server. */
  username?: string;
  /** @deprecated Ranks come from the server. */
  totalLemonXp?: number;
}

/** Load Top Lemons leaderboard (3-month XP from valid runs + NPC rivals). */
export async function loadTopLemonsLeaderboard(
  _options: LoadTopLemonsOptions = {},
): Promise<TopLemonsLeaderboardView> {
  const entries = await fetchTopLemonsLeaderboard();
  if (!Array.isArray(entries)) {
    return { entries: [], currentUserOutside: null };
  }
  return partitionTopLemons(entries);
}
