/** 1 USDT with 6 decimals. */
export const USDT_PER_ATTEMPT = 1_000_000n;

export interface PrizeSplit {
  place: 1 | 2 | 3;
  walletPubkey: string;
  amount: bigint;
}

export interface PoolDistribution {
  payouts: PrizeSplit[];
  rolloverOut: bigint;
}

/**
 * Split pool P across top 3 with threshold rules.
 * participants = distinct wallets in the hour.
 */
export function computeDistribution(
  poolTotal: bigint,
  participants: number,
  winners: [string | null, string | null, string | null],
): PoolDistribution {
  if (poolTotal <= 0n || participants < 1) {
    return { payouts: [], rolloverOut: poolTotal };
  }

  const pct = [60n, 30n, 10n] as const;
  const thresholds = [1, 5, 15] as const;
  const payouts: PrizeSplit[] = [];
  let allocated = 0n;

  for (let i = 0; i < 3; i++) {
    const wallet = winners[i];
    if (!wallet || participants < thresholds[i]) continue;
    const amount = (poolTotal * pct[i]) / 100n;
    if (amount > 0n) {
      payouts.push({ place: (i + 1) as 1 | 2 | 3, walletPubkey: wallet, amount });
      allocated += amount;
    }
  }

  return {
    payouts,
    rolloverOut: poolTotal - allocated,
  };
}

export function formatUsdt(amount: bigint): string {
  const whole = amount / 1_000_000n;
  const frac = amount % 1_000_000n;
  if (frac === 0n) return `${whole} USDT`;
  return `${whole}.${frac.toString().padStart(6, '0').replace(/0+$/, '')} USDT`;
}
