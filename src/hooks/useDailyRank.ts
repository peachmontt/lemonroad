import { useCallback, useEffect, useState } from 'react';
import { fetchDailyLeaderboard } from '../lib/api';

const REWARD_ZONE_SIZE = 10;
export const DAILY_POOL_TOTAL = '$20';

export interface DailyRankContext {
  loading: boolean;
  error: string | null;
  poolTotal: string;
  playerRank: number | null;
  rewardZoneScore: number | null;
  gapToRewardZone: number | null;
  refresh: () => void;
  computeDeathRank: (runScore: number) => {
    rank: number | null;
    gapToZone: number | null;
    inZone: boolean;
    gapFromTop10: number | null;
  };
}

function findPlayerRank(
  entries: { playerId: string; bestDistance: number }[],
  playerId: string,
): number | null {
  const idx = entries.findIndex((e) => e.playerId === playerId);
  return idx >= 0 ? idx + 1 : null;
}

export function useDailyRank(playerId: string | null | undefined): DailyRankContext {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [entries, setEntries] = useState<
    { playerId: string; bestDistance: number; position: number }[]
  >([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchDailyLeaderboard('today');
      setEntries(
        data.entries.map((e) => ({
          playerId: e.playerId,
          bestDistance: e.bestDistance,
          position: e.position,
        })),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load leaderboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const playerEntry = playerId
    ? entries.find((e) => e.playerId === playerId)
    : undefined;
  const playerRank = playerId ? findPlayerRank(entries, playerId) : null;
  const rewardZoneScore =
    entries.length >= REWARD_ZONE_SIZE
      ? entries[REWARD_ZONE_SIZE - 1]!.bestDistance
      : entries.length > 0
        ? entries[entries.length - 1]!.bestDistance
        : null;

  const playerBest = playerEntry?.bestDistance ?? 0;
  const gapToRewardZone =
    rewardZoneScore != null && playerRank != null && playerRank > REWARD_ZONE_SIZE
      ? Math.max(0, Math.ceil(rewardZoneScore - playerBest + 1))
      : playerRank != null && playerRank <= REWARD_ZONE_SIZE
        ? 0
        : rewardZoneScore != null
          ? Math.max(0, Math.ceil(rewardZoneScore - playerBest + 1))
          : null;

  const computeDeathRank = useCallback(
    (runScore: number) => {
      const sorted = [...entries];
      if (playerId) {
        const existing = sorted.findIndex((e) => e.playerId === playerId);
        if (existing >= 0) {
          sorted[existing] = {
            ...sorted[existing]!,
            bestDistance: Math.max(sorted[existing]!.bestDistance, runScore),
          };
        } else {
          sorted.push({ playerId, bestDistance: runScore, position: sorted.length + 1 });
        }
        sorted.sort((a, b) => b.bestDistance - a.bestDistance);
      }

      const rank = playerId
        ? sorted.findIndex((e) => e.playerId === playerId) + 1
        : null;
      const zoneScore =
        sorted.length >= REWARD_ZONE_SIZE
          ? sorted[REWARD_ZONE_SIZE - 1]!.bestDistance
          : sorted.length > 0
            ? sorted[sorted.length - 1]!.bestDistance
            : null;

      const inZone = rank != null && rank <= REWARD_ZONE_SIZE;
      const gapToZone =
        zoneScore != null && !inZone
          ? Math.max(0, Math.ceil(zoneScore - runScore + 1))
          : inZone
            ? 0
            : null;

      const top10Score =
        sorted.length >= REWARD_ZONE_SIZE
          ? sorted[REWARD_ZONE_SIZE - 1]!.bestDistance
          : null;
      const gapFromTop10 =
        top10Score != null && runScore < top10Score
          ? Math.max(0, Math.ceil(top10Score - runScore))
          : null;

      return { rank: rank || null, gapToZone, inZone, gapFromTop10 };
    },
    [entries, playerId],
  );

  return {
    loading,
    error,
    poolTotal: DAILY_POOL_TOTAL,
    playerRank,
    rewardZoneScore,
    gapToRewardZone,
    refresh: load,
    computeDeathRank,
  };
}
