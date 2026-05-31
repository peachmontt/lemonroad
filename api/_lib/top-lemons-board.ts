import { TOP_LEMONS_NPC_SEED } from './top-lemons-npcs';
import { resolveEquippedVisual } from '../../shared/lemonVisual';

/** Visible slots on the Top Lemons tab (NPCs + real players compete for these). */
export const TOP_LEMONS_LEADERBOARD_SIZE = 100;

export interface TopLemonsRealPlayer {
  playerId: string;
  displayName: string;
  xpGained3m: number;
  totalXp: number;
  selectedBadge?: string | null;
  selectedSkin?: string | null;
}

export interface TopLemonsBoardEntry {
  rank: number;
  username: string;
  xpGainedLastThreeMonths: number;
  totalLemonXp: number;
  isCurrentUser: boolean;
  isNpc: boolean;
  equippedEmoji: string;
  equippedKind: 'badge' | 'skin' | 'default';
}

interface MergeRow {
  username: string;
  xpGainedLastThreeMonths: number;
  totalLemonXp: number;
  isCurrentUser: boolean;
  isNpc: boolean;
  selectedBadge?: string | null;
  selectedSkin?: string | null;
}

function compareRows(a: MergeRow, b: MergeRow): number {
  const xpDiff = b.xpGainedLastThreeMonths - a.xpGainedLastThreeMonths;
  if (xpDiff !== 0) return xpDiff;
  if (a.isNpc !== b.isNpc) return a.isNpc ? 1 : -1;
  return a.username.localeCompare(b.username);
}

/**
 * Merge real players (from DB runs) with NPC seed rows, rank by 3-month XP,
 * and assign global ranks. Real users appear when they beat NPC thresholds.
 */
export function buildTopLemonsLeaderboard(
  realPlayers: TopLemonsRealPlayer[],
  currentPlayerId: string,
): TopLemonsBoardEntry[] {
  const realRows: MergeRow[] = realPlayers.map((p) => ({
    username: p.displayName,
    xpGainedLastThreeMonths: p.xpGained3m,
    totalLemonXp: p.totalXp,
    isCurrentUser: p.playerId === currentPlayerId,
    isNpc: false,
    selectedBadge: p.selectedBadge ?? null,
    selectedSkin: p.selectedSkin ?? null,
  }));

  const npcRows: MergeRow[] = TOP_LEMONS_NPC_SEED.map((npc) => ({
    username: npc.username,
    xpGainedLastThreeMonths: npc.xpGainedLastThreeMonths,
    totalLemonXp: npc.totalLemonXp,
    isCurrentUser: false,
    isNpc: true,
    selectedBadge: null,
    selectedSkin: null,
  }));

  const ranked = [...realRows, ...npcRows].sort(compareRows);

  return ranked.map((row, index) => {
    const visual = row.isNpc
      ? resolveEquippedVisual(null, null)
      : resolveEquippedVisual(row.selectedBadge, row.selectedSkin);
    return {
      rank: index + 1,
      username: row.username,
      xpGainedLastThreeMonths: row.xpGainedLastThreeMonths,
      totalLemonXp: row.totalLemonXp,
      isCurrentUser: row.isCurrentUser,
      isNpc: row.isNpc,
      equippedEmoji: visual.equippedEmoji,
      equippedKind: visual.equippedKind,
    };
  });
}

export function formatTopLemonsApiPayload(
  ranked: TopLemonsBoardEntry[],
): TopLemonsBoardEntry[] {
  const top = ranked.slice(0, TOP_LEMONS_LEADERBOARD_SIZE);
  const current = ranked.find((e) => e.isCurrentUser);
  const currentInTop =
    current != null && top.some((e) => e.isCurrentUser);

  if (current && !currentInTop) {
    return [...top, current];
  }
  return top;
}
