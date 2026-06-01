import { prisma } from './db';
import { currentDayBucket, dayBucketToDate, previousDayBucket } from './day';
import { computeDistribution, formatUsdt } from './pool-math';

export interface SettleDayPoolResult {
  day: string;
  poolBucket: string;
  participants: number;
  poolTotal: string;
  poolTotalFormatted: string;
  payouts: {
    place: number;
    wallet: string;
    amount: string;
    amountFormatted: string;
    paymentChain: string;
    status: string;
  }[];
  rolloverOut: string;
  finalizedAt: string | null;
  /** @deprecated No on-chain batch tx; claims are per-winner. */
  settleTx: string | null;
  alreadySettled?: boolean;
}

type WinnerMeta = {
  distance: number;
  diedAt: Date;
  playerId: string;
  paymentChain: 'solana' | 'evm';
};

async function getWinnersForGameDay(dayBucket: string) {
  const dayStart = dayBucketToDate(dayBucket);
  const dayEnd = new Date(dayStart.getTime() + 86_400_000);

  const runs = await prisma.gameRun.findMany({
    where: { mode: 'paid', diedAt: { gte: dayStart, lt: dayEnd } },
    orderBy: [{ distance: 'desc' }, { diedAt: 'asc' }],
  });

  const bestByWallet = new Map<string, WinnerMeta>();
  for (const run of runs) {
    const wallet = run.walletPubkey;
    if (!wallet) continue;
    const existing = bestByWallet.get(wallet);
    if (!existing || run.distance > existing.distance) {
      bestByWallet.set(wallet, {
        distance: run.distance,
        diedAt: run.diedAt,
        playerId: run.playerId,
        paymentChain: run.paymentChain === 'evm' ? 'evm' : 'solana',
      });
    }
  }

  const sorted = [...bestByWallet.entries()].sort(
    (a, b) => b[1].distance - a[1].distance,
  );

  return {
    participants: sorted.length,
    winnerMeta: bestByWallet,
    winners: [
      sorted[0]?.[0] ?? null,
      sorted[1]?.[0] ?? null,
      sorted[2]?.[0] ?? null,
    ] as [string | null, string | null, string | null],
  };
}

/** Finalize a degen day pool: compute winners and create CLAIMABLE payout rows (no on-chain batch). */
export async function settleDayPool(dayBucket: string): Promise<SettleDayPoolResult> {
  const poolStart = dayBucketToDate(dayBucket);
  const poolBucket = String(Math.floor(poolStart.getTime() / 3_600_000));

  const existing = await prisma.hourlyPool.findUnique({ where: { hourStart: poolStart } });
  if (existing?.finalizedAt) {
    const payouts = await prisma.prizePayout.findMany({
      where: { hourStart: poolStart },
      orderBy: { place: 'asc' },
    });
    return {
      day: dayBucket,
      poolBucket,
      participants: existing.participantCount,
      poolTotal: (existing.depositedUsdt + existing.rolloverIn).toString(),
      poolTotalFormatted: formatUsdt(existing.depositedUsdt + existing.rolloverIn),
      payouts: payouts.map((p) => ({
        place: p.place,
        wallet: p.walletPubkey,
        amount: p.amountUsdt.toString(),
        amountFormatted: formatUsdt(p.amountUsdt),
        paymentChain: p.paymentChain,
        status: p.status,
      })),
      rolloverOut: existing.rolloverOut.toString(),
      finalizedAt: existing.finalizedAt.toISOString(),
      settleTx: null,
      alreadySettled: true,
    };
  }

  const { participants, winners, winnerMeta } = await getWinnersForGameDay(dayBucket);

  const prevPoolStart = new Date(poolStart.getTime() - 86_400_000);
  const prevFinalized = await prisma.hourlyPool.findUnique({ where: { hourStart: prevPoolStart } });

  const rolloverIn =
    existing?.rolloverIn ??
    (prevFinalized?.finalizedAt ? prevFinalized.rolloverOut : 0n);

  const deposited = existing?.depositedUsdt ?? 0n;
  const poolTotal = deposited + rolloverIn;

  const distribution = computeDistribution(poolTotal, participants, winners);
  const finalizedAt = new Date();

  await prisma.hourlyPool.upsert({
    where: { hourStart: poolStart },
    create: {
      hourStart: poolStart,
      participantCount: participants,
      depositedUsdt: deposited,
      rolloverIn,
      rolloverOut: distribution.rolloverOut,
      finalizedAt,
      settledAt: finalizedAt,
    },
    update: {
      participantCount: participants,
      rolloverIn,
      rolloverOut: distribution.rolloverOut,
      finalizedAt,
      settledAt: finalizedAt,
      settleTx: null,
    },
  });

  for (const p of distribution.payouts) {
    const meta = winnerMeta.get(p.walletPubkey);
    await prisma.prizePayout.upsert({
      where: { hourStart_place: { hourStart: poolStart, place: p.place } },
      create: {
        hourStart: poolStart,
        place: p.place,
        walletPubkey: p.walletPubkey,
        amountUsdt: p.amount,
        status: 'CLAIMABLE',
        paymentChain: meta?.paymentChain ?? 'solana',
        playerId: meta?.playerId ?? null,
      },
      update: {
        amountUsdt: p.amount,
        status: 'CLAIMABLE',
        paymentChain: meta?.paymentChain ?? 'solana',
        playerId: meta?.playerId ?? null,
      },
    });
  }

  const nextPoolStart = new Date(poolStart.getTime() + 86_400_000);
  if (distribution.rolloverOut > 0n) {
    await prisma.hourlyPool.upsert({
      where: { hourStart: nextPoolStart },
      create: { hourStart: nextPoolStart, rolloverIn: distribution.rolloverOut },
      update: { rolloverIn: { increment: distribution.rolloverOut } },
    });
  }

  return {
    day: dayBucket,
    poolBucket,
    participants,
    poolTotal: poolTotal.toString(),
    poolTotalFormatted: formatUsdt(poolTotal),
    payouts: distribution.payouts.map((p) => {
      const meta = winnerMeta.get(p.walletPubkey);
      return {
        place: p.place,
        wallet: p.walletPubkey,
        amount: p.amount.toString(),
        amountFormatted: formatUsdt(p.amount),
        paymentChain: meta?.paymentChain ?? 'solana',
        status: 'CLAIMABLE',
      };
    }),
    rolloverOut: distribution.rolloverOut.toString(),
    finalizedAt: finalizedAt.toISOString(),
    settleTx: null,
  };
}

export async function settlePreviousDayPool(now = new Date()): Promise<SettleDayPoolResult> {
  return settleDayPool(previousDayBucket(now));
}
