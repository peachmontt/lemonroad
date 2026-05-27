export const TOP_PRIZE_COUNT = 3;
export const DAILY_POOL_TOTAL = '$20';

export interface DailyLeaderboardEntry {
  playerId: string;
  bestDistance: number;
  position: number;
}

export function findPlayerRank(
  entries: DailyLeaderboardEntry[],
  playerId: string,
): number | null {
  const idx = entries.findIndex((e) => e.playerId === playerId);
  return idx >= 0 ? idx + 1 : null;
}

export interface ScoreToBeatResult {
  score: number | null;
  message: string | null;
}

/** Score needed to reach the next prize-relevant rank on today's board. */
export function getScoreToBeat(
  entries: DailyLeaderboardEntry[],
  playerId: string | null | undefined,
): ScoreToBeatResult {
  if (entries.length === 0) {
    return { score: null, message: 'Be the first squeezer today' };
  }

  const playerRank = playerId ? findPlayerRank(entries, playerId) : null;

  if (playerRank === 1) {
    return { score: entries[0]!.bestDistance, message: 'Leading today' };
  }

  if (playerRank != null && playerRank <= TOP_PRIZE_COUNT) {
    return { score: entries[playerRank - 2]!.bestDistance, message: null };
  }

  if (entries.length >= TOP_PRIZE_COUNT) {
    return { score: entries[TOP_PRIZE_COUNT - 1]!.bestDistance, message: null };
  }

  return { score: entries[entries.length - 1]!.bestDistance, message: null };
}

export function getPlayerRankLabel(
  playerRank: number | null,
  loading: boolean,
  error: string | null,
): string {
  if (loading) return '…';
  if (error) return 'rank unavailable';
  if (playerRank != null) return `#${playerRank}`;
  return 'Unranked today';
}

export function getGapToScore(
  targetScore: number | null,
  currentScore: number,
): number | null {
  if (targetScore == null) return null;
  if (currentScore >= targetScore) return 0;
  return Math.max(0, Math.ceil(targetScore - currentScore + 1));
}

export interface DeathRankResult {
  rank: number | null;
  gapToTarget: number | null;
  inPrizeZone: boolean;
  gapFromPrizeZone: number | null;
  scoreToBeat: number | null;
}

export const DAILY_PRIZE_AMOUNTS: Record<number, string> = {
  1: '$10',
  2: '$6',
  3: '$4',
};

export const CLOSE_TO_PRIZE_RATIO = 0.25;

export type FreeRunResultState =
  | 'in_top_3'
  | 'close_to_prize'
  | 'far_from_prize'
  | 'unranked';

export function getEstimatedReward(rank: number | null): string | null {
  if (rank == null || rank > TOP_PRIZE_COUNT) return null;
  return DAILY_PRIZE_AMOUNTS[rank] ?? null;
}

export function classifyFreeRunResult(deathRank: DeathRankResult): FreeRunResultState {
  if (deathRank.rank == null) return 'unranked';
  if (deathRank.inPrizeZone) return 'in_top_3';
  if (
    deathRank.gapFromPrizeZone != null &&
    deathRank.scoreToBeat != null &&
    deathRank.scoreToBeat > 0 &&
    deathRank.gapFromPrizeZone / deathRank.scoreToBeat <= CLOSE_TO_PRIZE_RATIO
  ) {
    return 'close_to_prize';
  }
  return 'far_from_prize';
}

export function getResultRetryLabel(state: FreeRunResultState): string {
  switch (state) {
    case 'in_top_3':
      return 'PROTECT YOUR SPOT';
    case 'close_to_prize':
      return 'RUN IT BACK';
    case 'far_from_prize':
      return 'TRY AGAIN';
    default:
      return 'RUN IT BACK';
  }
}

export function computeDeathRank(
  entries: DailyLeaderboardEntry[],
  playerId: string | null | undefined,
  runScore: number,
): DeathRankResult {
  const sorted = [...entries];
  if (playerId) {
    const existing = sorted.findIndex((e) => e.playerId === playerId);
    if (existing >= 0) {
      sorted[existing] = {
        ...sorted[existing]!,
        bestDistance: Math.max(sorted[existing]!.bestDistance, runScore),
      };
    } else {
      sorted.push({
        playerId,
        bestDistance: runScore,
        position: sorted.length + 1,
      });
    }
    sorted.sort((a, b) => b.bestDistance - a.bestDistance);
  }

  const rank = playerId ? findPlayerRank(sorted, playerId) : null;
  const { score: scoreToBeat } = getScoreToBeat(sorted, playerId);
  const inPrizeZone = rank != null && rank <= TOP_PRIZE_COUNT;
  const gapToTarget = getGapToScore(scoreToBeat, runScore);

  const prizeThreshold =
    sorted.length >= TOP_PRIZE_COUNT
      ? sorted[TOP_PRIZE_COUNT - 1]!.bestDistance
      : sorted.length > 0
        ? sorted[sorted.length - 1]!.bestDistance
        : null;
  const gapFromPrizeZone =
    prizeThreshold != null && runScore < prizeThreshold
      ? Math.max(0, Math.ceil(prizeThreshold - runScore))
      : null;

  return {
    rank,
    gapToTarget,
    inPrizeZone,
    gapFromPrizeZone,
    scoreToBeat,
  };
}
