import { prisma } from './db';
import { currentDayBucket, dayBucketToDate, previousDayBucket } from './day';
import { dayPoolBucketToDate } from './daily-pool';
import { computeDistribution, formatUsdt } from './pool-math';
import { buildSettleHourTransaction } from './solana';

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
  }[];
  rolloverOut: string;
  settleTx: string | null;
  alreadySettled?: boolean;
}

async function getWinnersForGameDay(dayBucket: string) {
  const dayStart = dayBucketToDate(dayBucket);
  const dayEnd = new Date(dayStart.getTime() + 86_400_000);

  const runs = await prisma.gameRun.findMany({
    where: { mode: 'paid', diedAt: { gte: dayStart, lt: dayEnd } },
    orderBy: [{ distance: 'desc' }, { diedAt: 'asc' }],
  });

  const bestByWallet = new Map<string, { distance: number; diedAt: Date }>();
  for (const run of runs) {
    const wallet = run.walletPubkey;
    if (!wallet) continue;
    const existing = bestByWallet.get(wallet);
    if (!existing || run.distance > existing.distance) {
      bestByWallet.set(wallet, { distance: run.distance, diedAt: run.diedAt });
    }
  }

  const sorted = [...bestByWallet.entries()].sort(
    (a, b) => b[1].distance - a[1].distance,
  );

  return {
    participants: sorted.length,
    winners: [
      sorted[0]?.[0] ?? null,
      sorted[1]?.[0] ?? null,
      sorted[2]?.[0] ?? null,
    ] as [string | null, string | null, string | null],
  };
}

export async function settleDayPool(dayBucket: string): Promise<SettleDayPoolResult> {
  const poolStart = dayBucketToDate(dayBucket);
  const poolBucket = String(Math.floor(poolStart.getTime() / 3_600_000));

  const existing = await prisma.hourlyPool.findUnique({ where: { hourStart: poolStart } });
  if (existing?.settledAt) {
    return {
      day: dayBucket,
      poolBucket,
      participants: existing.participantCount,
      poolTotal: (existing.depositedUsdt + existing.rolloverIn).toString(),
      poolTotalFormatted: formatUsdt(existing.depositedUsdt + existing.rolloverIn),
      payouts: [],
      rolloverOut: existing.rolloverOut.toString(),
      settleTx: existing.settleTx,
      alreadySettled: true,
    };
  }

  const { participants, winners } = await getWinnersForGameDay(dayBucket);

  const prevPoolStart = new Date(poolStart.getTime() - 86_400_000);
  const prevSettled = await prisma.hourlyPool.findUnique({ where: { hourStart: prevPoolStart } });

  const rolloverIn =
    existing?.rolloverIn ??
    (prevSettled?.settledAt ? prevSettled.rolloverOut : 0n);

  const deposited = existing?.depositedUsdt ?? 0n;
  const poolTotal = deposited + rolloverIn;

  const distribution = computeDistribution(poolTotal, participants, winners);

  const amounts: [bigint, bigint, bigint] = [0n, 0n, 0n];
  for (const p of distribution.payouts) {
    amounts[p.place - 1] = p.amount;
  }

  let settleTx: string | null = null;
  if (poolTotal > 0n && distribution.payouts.length > 0) {
    settleTx = await buildSettleHourTransaction(
      BigInt(poolBucket),
      participants,
      winners,
      amounts,
    );
  }

  await prisma.hourlyPool.upsert({
    where: { hourStart: poolStart },
    create: {
      hourStart: poolStart,
      participantCount: participants,
      depositedUsdt: deposited,
      rolloverIn,
      rolloverOut: distribution.rolloverOut,
      settledAt: new Date(),
      settleTx,
    },
    update: {
      participantCount: participants,
      rolloverIn,
      rolloverOut: distribution.rolloverOut,
      settledAt: new Date(),
      settleTx,
    },
  });

  for (const p of distribution.payouts) {
    await prisma.prizePayout.upsert({
      where: { hourStart_place: { hourStart: poolStart, place: p.place } },
      create: {
        hourStart: poolStart,
        place: p.place,
        walletPubkey: p.walletPubkey,
        amountUsdt: p.amount,
        txSignature: settleTx,
      },
      update: {
        amountUsdt: p.amount,
        txSignature: settleTx,
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
    payouts: distribution.payouts.map((p) => ({
      place: p.place,
      wallet: p.walletPubkey,
      amount: p.amount.toString(),
      amountFormatted: formatUsdt(p.amount),
    })),
    rolloverOut: distribution.rolloverOut.toString(),
    settleTx,
  };
}

export async function settlePreviousDayPool(now = new Date()): Promise<SettleDayPoolResult> {
  return settleDayPool(previousDayBucket(now));
}
