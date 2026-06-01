import { prisma } from './db';
import { formatUsdt } from './pool-math';

/** Parse a USDT amount string (e.g. "10", "6.5") to micro-USDT. */
export function parseRewardAmountToMicro(amount: string): bigint {
  const trimmed = amount.trim();
  const [wholePart, fracPart = ''] = trimmed.split('.');
  const whole = BigInt(wholePart || '0');
  const frac = (fracPart + '000000').slice(0, 6);
  return whole * 1_000_000n + BigInt(frac);
}

export async function getPayoutTotals(): Promise<{
  totalPaidUsdt: string;
  totalPaidFormatted: string;
  pendingPayoutsUsdt: string;
  pendingPayoutsFormatted: string;
}> {
  const [
    paidDailyRewards,
    pendingDailyRewards,
    paidDegenAgg,
    pendingDegenAgg,
  ] = await Promise.all([
    prisma.dailyReward.findMany({
      where: { status: 'PAID' },
      select: { rewardAmount: true },
    }),
    prisma.dailyReward.findMany({
      where: { status: 'PENDING' },
      select: { rewardAmount: true },
    }),
    prisma.prizePayout.aggregate({
      _sum: { amountUsdt: true },
      where: { status: 'PAID' },
    }),
    prisma.prizePayout.aggregate({
      _sum: { amountUsdt: true },
      where: { status: 'CLAIMABLE' },
    }),
  ]);

  const dailyPaidMicro = paidDailyRewards.reduce(
    (sum, r) => sum + parseRewardAmountToMicro(r.rewardAmount),
    0n,
  );
  const dailyPendingMicro = pendingDailyRewards.reduce(
    (sum, r) => sum + parseRewardAmountToMicro(r.rewardAmount),
    0n,
  );
  const degenPaidMicro = paidDegenAgg._sum.amountUsdt ?? 0n;
  const degenPendingMicro = pendingDegenAgg._sum.amountUsdt ?? 0n;

  const totalPaidMicro = dailyPaidMicro + degenPaidMicro;
  const pendingMicro = dailyPendingMicro + degenPendingMicro;

  return {
    totalPaidUsdt: totalPaidMicro.toString(),
    totalPaidFormatted: formatUsdt(totalPaidMicro),
    pendingPayoutsUsdt: pendingMicro.toString(),
    pendingPayoutsFormatted: formatUsdt(pendingMicro),
  };
}
