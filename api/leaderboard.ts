import { Prisma } from '@prisma/client';
import { prisma } from './_lib/db';
import { currentHourBucket, hourBucketLabel, previousHourBucket } from './_lib/hour';
import { badRequest, json, withMethods } from './_lib/http';
import { computeDistribution, formatUsdt } from './_lib/pool-math';

type GlobalMode = 'free' | 'paid' | 'all';

async function getGlobalLeaderboard(mode: GlobalMode, limit: number) {
  const modeFilter =
    mode === 'all' ? Prisma.empty : Prisma.sql`WHERE gr.mode = ${mode}`;

  const rows = await prisma.$queryRaw<
    Array<{
      display_name: string;
      distance: number;
      mode: string;
      died_at: Date;
    }>
  >`
    WITH best AS (
      SELECT DISTINCT ON (gr.player_id)
        gr.player_id,
        gr.distance,
        gr.mode,
        gr.died_at
      FROM game_runs gr
      ${modeFilter}
      ORDER BY gr.player_id, gr.distance DESC, gr.died_at ASC
    )
    SELECT p.display_name, b.distance, b.mode, b.died_at
    FROM best b
    JOIN players p ON p.id = b.player_id
    ORDER BY b.distance DESC
    LIMIT ${limit}
  `;

  return rows.map((row, i) => ({
    rank: i + 1,
    displayName: row.display_name,
    distance: row.distance,
    mode: row.mode as GlobalMode,
    diedAt: row.died_at.toISOString(),
  }));
}

async function getLeaderboardForHour(hourBucket: string) {
  const runs = await prisma.gameRun.findMany({
    where: { mode: 'paid', hourBucket },
    orderBy: [{ distance: 'desc' }, { diedAt: 'asc' }],
    include: { player: true },
  });

  const bestByWallet = new Map<
    string,
    { distance: number; diedAt: Date; displayName: string }
  >();

  for (const run of runs) {
    const wallet = run.walletPubkey;
    if (!wallet) continue;
    const existing = bestByWallet.get(wallet);
    if (!existing || run.distance > existing.distance) {
      bestByWallet.set(wallet, {
        distance: run.distance,
        diedAt: run.diedAt,
        displayName: run.player.displayName,
      });
    }
  }

  const sorted = [...bestByWallet.entries()].sort(
    (a, b) => b[1].distance - a[1].distance,
  );

  return sorted.map(([wallet, data], i) => ({
    rank: i + 1,
    walletPubkey: wallet,
    displayName: data.displayName,
    distance: data.distance,
    diedAt: data.diedAt.toISOString(),
  }));
}

export default withMethods({
  GET: async (req, res) => {
    const scope =
      typeof req.query.scope === 'string' ? req.query.scope : 'pool';

    if (scope === 'global') {
      const modeRaw =
        typeof req.query.mode === 'string' ? req.query.mode : 'free';
      if (!['free', 'paid', 'all'].includes(modeRaw)) {
        return badRequest(res, 'Invalid mode (free, paid, or all)');
      }
      const limit = Math.min(
        100,
        Math.max(1, Number(req.query.limit) || 50),
      );
      const entries = await getGlobalLeaderboard(
        modeRaw as GlobalMode,
        limit,
      );
      return json(res, { scope: 'global', mode: modeRaw, entries });
    }

    const hour =
      typeof req.query.hour === 'string'
        ? req.query.hour
        : currentHourBucket();

    if (!/^\d+$/.test(hour)) {
      return badRequest(res, 'Invalid hour bucket');
    }

    const entries = await getLeaderboardForHour(hour);
    const hourStart = new Date(Number(hour) * 3_600_000);
    const pool = await prisma.hourlyPool.findUnique({
      where: { hourStart },
    });

    const participants = pool?.participantCount ?? entries.length;
    const poolTotal =
      (pool?.depositedUsdt ?? 0n) + (pool?.rolloverIn ?? 0n);

    const winners: [string | null, string | null, string | null] = [
      entries[0]?.walletPubkey ?? null,
      entries[1]?.walletPubkey ?? null,
      entries[2]?.walletPubkey ?? null,
    ];

    const distribution = computeDistribution(
      poolTotal,
      participants,
      winners,
    );

    json(res, {
      scope: 'pool',
      hour,
      hourLabel: hourBucketLabel(hour),
      participants,
      poolTotal: poolTotal.toString(),
      poolTotalFormatted: formatUsdt(poolTotal),
      entries,
      projectedPayouts: distribution.payouts.map((p) => ({
        place: p.place,
        walletPubkey: p.walletPubkey,
        amount: p.amount.toString(),
        amountFormatted: formatUsdt(p.amount),
      })),
      projectedRollover: distribution.rolloverOut.toString(),
      previousHour: previousHourBucket(),
    });
  },
});
