/** Distance bands → global rank (lower = better). */
const RANK_TIERS = [
  { min: 0, max: 50, rankMin: 50_000, rankMax: 65_000 },
  { min: 50, max: 250, rankMin: 40_000, rankMax: 50_000 },
  { min: 250, max: 500, rankMin: 30_000, rankMax: 40_000 },
  { min: 500, max: 1_000, rankMin: 20_000, rankMax: 30_000 },
  { min: 1_000, max: 2_000, rankMin: 10_000, rankMax: 20_000 },
  { min: 2_000, max: 5_000, rankMin: 1_000, rankMax: 10_000 },
] as const;

export function computeRank(distance: number): number {
  const d = Math.max(0, distance);

  for (const tier of RANK_TIERS) {
    if (d < tier.max) {
      const span = tier.max - tier.min;
      const t = span > 0 ? (d - tier.min) / span : 0;
      const base = tier.rankMax - t * (tier.rankMax - tier.rankMin);
      const jitter = Math.floor(Math.random() * 400) - 200;
      return Math.max(
        tier.rankMin,
        Math.min(tier.rankMax, Math.floor(base + jitter)),
      );
    }
  }

  // Beyond top tier: elite ranks
  const eliteT = Math.min(1, (d - 5_000) / 5_000);
  const base = 1_000 - eliteT * 900;
  const jitter = Math.floor(Math.random() * 200) - 100;
  return Math.max(1, Math.floor(base + jitter));
}
