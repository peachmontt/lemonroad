import webPush from 'web-push';
import { prisma } from '../_lib/db';
import { previousDayBucket, dayBucketToDate } from '../_lib/day';
import { json, unauthorized, withMethods } from '../_lib/http';

const TOP_WINNERS = 3;
const REWARD_CURRENCY = 'USDT';
const REWARD_AMOUNTS: Record<number, string> = { 1: '10', 2: '6', 3: '4' };

function configurePush(): boolean {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT ?? 'mailto:hello@lemonroad.xyz';
  if (!publicKey || !privateKey) return false;
  try {
    webPush.setVapidDetails(subject, publicKey, privateKey);
    return true;
  } catch {
    console.error('VAPID configuration error — push notifications disabled');
    return false;
  }
}

async function sendPushToSubscription(
  sub: { endpoint: string; p256dh: string; auth: string; id: string },
  payload: object,
): Promise<boolean> {
  try {
    await webPush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      JSON.stringify(payload),
    );
    await prisma.pushSubscription.update({
      where: { id: sub.id },
      data: { lastUsedAt: new Date() },
    });
    return true;
  } catch {
    // 410 Gone means the subscription is expired — disable it
    await prisma.pushSubscription.update({
      where: { id: sub.id },
      data: { enabled: false },
    }).catch(() => null);
    return false;
  }
}

export default withMethods({
  GET: async (req, res) => {
    const secret = req.headers.authorization?.replace('Bearer ', '');
    if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
      return unauthorized(res, 'Invalid cron secret');
    }

    const pushEnabled = configurePush();

    const dayBucket = previousDayBucket();
    const date = dayBucketToDate(dayBucket);

    // Idempotency guard — skip if already ran for this day
    const alreadyRan = await prisma.dailyReward.count({ where: { date } });
    if (alreadyRan > 0) {
      return json(res, { message: 'Already settled', date: dayBucket });
    }

    // Fetch leaderboard entries for yesterday, valid free runs only
    const entries = await prisma.dailyLeaderboard.findMany({
      where: { date, rewardStatus: 'PENDING' },
      orderBy: [{ bestDistance: 'desc' }, { createdAt: 'asc' }],
      include: {
        player: { select: { id: true, walletPubkey: true, sessionId: true } },
      },
    });

    // Deduplication: one wallet per day
    const seenWallets = new Set<string>();
    const seenSessions = new Set<string>();
    const eligible: typeof entries = [];
    const rejected: typeof entries = [];

    for (const entry of entries) {
      const wallet = entry.player.walletPubkey;
      const session = entry.player.sessionId;

      if (wallet && seenWallets.has(wallet)) {
        rejected.push(entry);
        continue;
      }
      if (seenSessions.has(session)) {
        rejected.push(entry);
        continue;
      }

      if (wallet) seenWallets.add(wallet);
      seenSessions.add(session);
      eligible.push(entry);
    }

    const winners = eligible.slice(0, TOP_WINNERS);
    const winnerIds = new Set(winners.map((w) => w.playerId));

    // Write daily rewards for winners (status = PENDING, not paid yet)
    for (let i = 0; i < winners.length; i++) {
      const w = winners[i];
      await prisma.dailyReward.create({
        data: {
          date,
          playerId: w.playerId,
          position: i + 1,
          rewardAmount: REWARD_AMOUNTS[i + 1] ?? '0',
          rewardCurrency: REWARD_CURRENCY,
          status: 'PENDING',
        },
      });
    }

    // Update leaderboard statuses
    if (winners.length > 0) {
      await prisma.dailyLeaderboard.updateMany({
        where: { date, playerId: { in: winners.map((w) => w.playerId) } },
        data: { rewardStatus: 'AWARDED', position: undefined },
      });
      // Set individual positions
      for (let i = 0; i < winners.length; i++) {
        await prisma.dailyLeaderboard.update({
          where: { date_playerId: { date, playerId: winners[i].playerId } },
          data: { position: i + 1, rewardStatus: 'AWARDED' },
        });
      }
    }

    if (rejected.length > 0) {
      await prisma.dailyLeaderboard.updateMany({
        where: { date, playerId: { in: rejected.map((r) => r.playerId) } },
        data: { rewardStatus: 'REJECTED' },
      });
    }

    const pushResults = {
      sent: 0,
      failed: 0,
      skipped: !pushEnabled,
      ...(pushEnabled ? {} : { reason: 'VAPID_PUBLIC_KEY or VAPID_PRIVATE_KEY not set' }),
      subscribers: 0,
    };

    if (pushEnabled) {
      const subscriptions = await prisma.pushSubscription.findMany({
        where: { enabled: true },
      });
      pushResults.subscribers = subscriptions.length;

      for (const sub of subscriptions) {
        const isWinner = winnerIds.has(sub.playerId);
        const payload = isWinner
          ? {
              title: 'Lemon Road',
              body: 'You squeezed into the daily top. Claim your lemon prize.',
              url: '/',
            }
          : {
              title: 'Lemon Road',
              body: 'A new daily squeeze is live. Play free and climb the board.',
              url: '/',
            };

        const ok = await sendPushToSubscription(sub, payload);
        if (ok) pushResults.sent++;
        else pushResults.failed++;
      }
    }

    json(res, {
      date: dayBucket,
      totalParticipants: entries.length,
      winners: winners.length,
      rejected: rejected.length,
      pushNotifications: pushResults,
    });
  },
});
