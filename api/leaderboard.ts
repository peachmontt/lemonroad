import { Prisma } from '@prisma/client';
import { prisma } from './_lib/db';
import { currentDayBucket, previousDayBucket, dayBucketToDate, getNextDailyResetAt, RESET_TIMEZONE_LABEL } from './_lib/day';
import { dayBucketDateOrFilter } from './_lib/daily-pool';
import { badRequest, json, withMethods } from './_lib/http';
import { computeDistribution, formatUsdt } from './_lib/pool-math';
import { resolveEquippedVisual } from '../shared/lemonVisual';

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
      selected_badge: string | null;
      selected_skin: string | null;
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
    SELECT p.display_name, b.distance, b.mode, b.died_at, p.selected_badge, p.selected_skin
    FROM best b
    JOIN players p ON p.id = b.player_id
    ORDER BY b.distance DESC
    LIMIT ${limit}
  `;

  return rows.map((row, i) => {
    const visual = resolveEquippedVisual(row.selected_badge, row.selected_skin);
    return {
      rank: i + 1,
      displayName: row.display_name,
      distance: row.distance,
      mode: row.mode as GlobalMode,
      diedAt: row.died_at.toISOString(),
      equippedEmoji: visual.equippedEmoji,
      equippedKind: visual.equippedKind,
    };
  });
}

async function getDailyPoolLeaderboard(dayBucket: string) {
  const dayStart = dayBucketToDate(dayBucket);
  const dayEnd = new Date(dayStart.getTime() + 86_400_000);

  const runs = await prisma.gameRun.findMany({
    where: { mode: 'paid', diedAt: { gte: dayStart, lt: dayEnd } },
    orderBy: [{ distance: 'desc' }, { diedAt: 'asc' }],
    include: { player: true },
  });

  const bestByWallet = new Map<
    string,
    {
      distance: number;
      diedAt: Date;
      displayName: string;
      selectedBadge: string | null;
      selectedSkin: string | null;
    }
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
        selectedBadge: run.player.selectedBadge,
        selectedSkin: run.player.selectedSkin,
      });
    }
  }

  const sorted = [...bestByWallet.entries()].sort(
    (a, b) => b[1].distance - a[1].distance,
  );

  const entries = sorted.map(([wallet, data], i) => {
    const visual = resolveEquippedVisual(data.selectedBadge, data.selectedSkin);
    return {
      rank: i + 1,
      walletPubkey: wallet,
      displayName: data.displayName,
      distance: data.distance,
      diedAt: data.diedAt.toISOString(),
      equippedEmoji: visual.equippedEmoji,
      equippedKind: visual.equippedKind,
    };
  });

  const pools = await prisma.hourlyPool.findMany({
    where: { hourStart: dayStart },
  });

  const poolTotal = pools.reduce(
    (sum, p) => sum + p.depositedUsdt + p.rolloverIn,
    0n,
  );
  const participants = pools.reduce((sum, p) => sum + p.participantCount, 0);

  const winners: [string | null, string | null, string | null] = [
    entries[0]?.walletPubkey ?? null,
    entries[1]?.walletPubkey ?? null,
    entries[2]?.walletPubkey ?? null,
  ];

  const distribution = computeDistribution(
    poolTotal,
    participants || entries.length,
    winners,
  );

  return {
    entries,
    poolTotal,
    participants: participants || entries.length,
    distribution,
  };
}

async function getDailyLeaderboard(dateStr: string) {
  const date = dayBucketToDate(dateStr);
  const isToday = dateStr === currentDayBucket();

  const rows = await prisma.dailyLeaderboard.findMany({
    where: dayBucketDateOrFilter(dateStr),
    orderBy: [{ bestDistance: 'desc' }, { createdAt: 'asc' }],
    include: {
      player: {
        select: {
          id: true,
          displayName: true,
          selectedBadge: true,
          selectedSkin: true,
        },
      },
    },
  });

  const bestByPlayer = new Map<string, (typeof rows)[number]>();
  for (const row of rows) {
    const existing = bestByPlayer.get(row.playerId);
    if (!existing || row.bestDistance > existing.bestDistance) {
      bestByPlayer.set(row.playerId, row);
    }
  }

  const entries = [...bestByPlayer.values()].sort(
    (a, b) => b.bestDistance - a.bestDistance || a.createdAt.getTime() - b.createdAt.getTime(),
  );

  // For past days, join reward payout status
  let rewardMap = new Map<string, { status: string } | null>();
  if (!isToday && entries.length > 0) {
    const rewards = await prisma.dailyReward.findMany({
      where: { date },
      select: { playerId: true, status: true },
    });
    for (const r of rewards) {
      rewardMap.set(r.playerId, { status: r.status });
    }
  }

  return {
    date: dateStr,
    entries: entries.map((e, i) => {
      const visual = resolveEquippedVisual(
        e.player.selectedBadge,
        e.player.selectedSkin,
      );
      return {
        position: e.position ?? i + 1,
        playerId: e.player.id,
        displayName: e.player.displayName,
        bestDistance: e.bestDistance,
        totalRuns: e.totalRuns,
        rewardStatus: isToday ? null : e.rewardStatus,
        paidStatus: isToday ? null : (rewardMap.get(e.playerId)?.status ?? null),
        equippedEmoji: visual.equippedEmoji,
        equippedKind: visual.equippedKind,
      };
    }),
  };
}

export default withMethods({
  GET: async (req, res) => {
    const scope =
      typeof req.query.scope === 'string' ? req.query.scope : 'pool';

    if (scope === 'daily') {
      const rawDate = typeof req.query.date === 'string' ? req.query.date : 'today';
      let dateStr: string;
      if (rawDate === 'today') {
        dateStr = currentDayBucket();
      } else if (rawDate === 'yesterday') {
        dateStr = previousDayBucket();
      } else if (/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
        dateStr = rawDate;
      } else {
        return badRequest(res, 'Invalid date (use today, yesterday, or YYYY-MM-DD)');
      }
      const data = await getDailyLeaderboard(dateStr);
      return json(res, {
        scope: 'daily',
        ...data,
        nextResetAt: getNextDailyResetAt().toISOString(),
        resetTimezone: RESET_TIMEZONE_LABEL,
      });
    }

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

    // Pool scope — daily aggregation
    const rawDay = typeof req.query.day === 'string' ? req.query.day : undefined;
    let dayBucket: string;
    if (rawDay === 'yesterday') {
      dayBucket = previousDayBucket();
    } else if (rawDay && /^\d{4}-\d{2}-\d{2}$/.test(rawDay)) {
      dayBucket = rawDay;
    } else {
      dayBucket = currentDayBucket();
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(dayBucket)) {
      return badRequest(res, 'Invalid day bucket');
    }

    const { entries, poolTotal, participants, distribution } =
      await getDailyPoolLeaderboard(dayBucket);

    json(res, {
      scope: 'pool',
      day: dayBucket,
      dayLabel: dayBucket,
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
      previousDay: previousDayBucket(),
      nextResetAt: getNextDailyResetAt().toISOString(),
      resetTimezone: RESET_TIMEZONE_LABEL,
    });
  },
});
