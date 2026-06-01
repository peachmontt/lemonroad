import { PrismaClient } from '@prisma/client';
import { currentDayBucket, dayBucketToDate } from '../api/_lib/day';

const prisma = new PrismaClient();

async function main() {
  const rows = await prisma.prizePayout.findMany({
    where: { playerId: null },
    select: { id: true, walletPubkey: true, hourStart: true },
  });

  let updated = 0;
  for (const row of rows) {
    const dayStart = dayBucketToDate(currentDayBucket(row.hourStart));
    const dayEnd = new Date(dayStart.getTime() + 86_400_000);
    const run = await prisma.gameRun.findFirst({
      where: {
        mode: 'paid',
        walletPubkey: row.walletPubkey,
        diedAt: { gte: dayStart, lt: dayEnd },
      },
      orderBy: [{ distance: 'desc' }, { diedAt: 'asc' }],
      select: { playerId: true, paymentChain: true },
    });
    if (!run) continue;
    await prisma.prizePayout.update({
      where: { id: row.id },
      data: {
        playerId: run.playerId,
        paymentChain: run.paymentChain === 'evm' ? 'evm' : 'solana',
      },
    });
    updated += 1;
  }

  console.log(`Backfilled playerId on ${updated} prize payout(s).`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
