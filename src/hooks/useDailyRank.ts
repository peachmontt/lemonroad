import { useCallback, useMemo } from 'react';
import { useDailyLeaderboard } from '../context/DailyLeaderboardContext';
import {
  computeDeathRank,
  DAILY_POOL_TOTAL,
  findPlayerRank,
  getGapToScore,
  getPlayerRankLabel,
  getScoreToBeat,
  TOP_PRIZE_COUNT,
} from '../lib/dailyRankLogic';

export { DAILY_POOL_TOTAL } from '../lib/dailyRankLogic';

export interface DailyRankContext {
  loading: boolean;
  error: string | null;
  poolTotal: string;
  playerRank: number | null;
  playerRankLabel: string;
  scoreToBeat: number | null;
  scoreToBeatMessage: string | null;
  gapToScoreToBeat: number | null;
  nextResetAt: string | null;
  refresh: () => void;
  computeDeathRank: (runScore: number) => ReturnType<typeof computeDeathRank>;
}

export function useDailyRank(playerId: string | null | undefined): DailyRankContext {
  const { loading, error, refresh, entries, nextResetAt } = useDailyLeaderboard();

  const playerRank = playerId ? findPlayerRank(entries, playerId) : null;
  const { score: scoreToBeat, message: scoreToBeatMessage } = getScoreToBeat(
    entries,
    playerId,
  );

  const playerEntry = playerId
    ? entries.find((e) => e.playerId === playerId)
    : undefined;
  const playerBest = playerEntry?.bestDistance ?? 0;
  const gapToScoreToBeat = getGapToScore(scoreToBeat, playerBest);

  const playerRankLabel = getPlayerRankLabel(playerRank, loading, error);

  const computeDeathRankForRun = useCallback(
    (runScore: number) => computeDeathRank(entries, playerId, runScore),
    [entries, playerId],
  );

  return useMemo(
    () => ({
      loading,
      error,
      poolTotal: DAILY_POOL_TOTAL,
      playerRank,
      playerRankLabel,
      scoreToBeat,
      scoreToBeatMessage,
      gapToScoreToBeat,
      nextResetAt,
      refresh,
      computeDeathRank: computeDeathRankForRun,
    }),
    [
      loading,
      error,
      playerRank,
      playerRankLabel,
      scoreToBeat,
      scoreToBeatMessage,
      gapToScoreToBeat,
      nextResetAt,
      refresh,
      computeDeathRankForRun,
    ],
  );
}

export const PRIZE_ZONE_SIZE = TOP_PRIZE_COUNT;
