import { z } from 'zod';
import { getAuthenticatedPlayer } from './_lib/auth';
import { prisma } from './_lib/db';
import { currentHourBucket } from './_lib/hour';
import {
  badRequest,
  json,
  unauthorized,
  withMethods,
  parseJsonBody,
} from './_lib/http';
import { verifyDepositTransaction } from './_lib/solana';
import { USDT_PER_ATTEMPT } from './_lib/pool-math';

const postSchema = z.object({
  mode: z.enum(['free', 'paid']),
  distance: z.number().min(0).max(1_000_000),
  juiceLevel: z.string(),
  citricVelocity: z.number(),
  durationMs: z.number().int().min(0).max(3_600_000),
  depositTx: z.string().optional(),
  walletPubkey: z.string().optional(),
});

export default withMethods({
  GET: async (req, res) => {
    const player = await getAuthenticatedPlayer(req);
    if (!player) return unauthorized(res);

    const limit = Math.min(
      100,
      Number(req.query.limit) || 50,
    );

    const runs = await prisma.gameRun.findMany({
      where: { playerId: player.id },
      orderBy: { diedAt: 'desc' },
      take: limit,
    });

    json(res, {
      runs: runs.map((r) => ({
        id: r.id,
        mode: r.mode,
        distance: r.distance,
        juiceLevel: r.juiceLevel,
        citricVelocity: r.citricVelocity,
        durationMs: r.durationMs,
        diedAt: r.diedAt.toISOString(),
        hourBucket: r.hourBucket,
      })),
    });
  },

  POST: async (req, res) => {
    const player = await getAuthenticatedPlayer(req);
    if (!player) return unauthorized(res);

    const parsed = postSchema.safeParse(parseJsonBody(req));
    if (!parsed.success) {
      return badRequest(res, parsed.error.message);
    }

    const { mode, distance, juiceLevel, citricVelocity, durationMs, depositTx, walletPubkey } =
      parsed.data;

    let hourBucket: string | null = null;
    let verifiedTx: string | null = null;

    if (mode === 'paid') {
      if (!depositTx || !walletPubkey) {
        return badRequest(res, 'Paid runs require depositTx and walletPubkey');
      }

      hourBucket = currentHourBucket();

      const existingDeposit = await prisma.verifiedDeposit.findUnique({
        where: { txSignature: depositTx },
      });

      if (existingDeposit?.usedAt) {
        return badRequest(res, 'Deposit already used for a run');
      }

      if (!existingDeposit) {
        const verification = await verifyDepositTransaction(
          depositTx,
          walletPubkey,
          hourBucket,
        );
        if (!verification.ok) {
          return badRequest(res, verification.error ?? 'Invalid deposit');
        }

        await prisma.verifiedDeposit.create({
          data: {
            txSignature: depositTx,
            walletPubkey,
            hourBucket,
            amountUsdt: USDT_PER_ATTEMPT,
          },
        });
      }

      await prisma.verifiedDeposit.update({
        where: { txSignature: depositTx },
        data: { usedAt: new Date() },
      });

      verifiedTx = depositTx;

      const hourStart = new Date(Number(hourBucket) * 3_600_000);
      await prisma.hourlyPool.upsert({
        where: { hourStart },
        create: {
          hourStart,
          depositedUsdt: USDT_PER_ATTEMPT,
          participantCount: 1,
        },
        update: {
          depositedUsdt: { increment: USDT_PER_ATTEMPT },
        },
      });

      const distinctInHour = await prisma.gameRun.groupBy({
        by: ['walletPubkey'],
        where: {
          mode: 'paid',
          hourBucket,
          walletPubkey: { not: null },
        },
      });
      const wallets = new Set(distinctInHour.map((d) => d.walletPubkey));
      wallets.add(walletPubkey);
      await prisma.hourlyPool.update({
        where: { hourStart },
        data: { participantCount: wallets.size },
      });

      if (!player.walletPubkey) {
        await prisma.player.update({
          where: { id: player.id },
          data: { walletPubkey },
        });
      }
    }

    const run = await prisma.gameRun.create({
      data: {
        playerId: player.id,
        mode,
        distance,
        juiceLevel,
        citricVelocity,
        durationMs,
        depositTx: verifiedTx,
        hourBucket,
        walletPubkey: mode === 'paid' ? walletPubkey : null,
      },
    });

    json(res, {
      id: run.id,
      mode: run.mode,
      distance: run.distance,
      diedAt: run.diedAt.toISOString(),
    });
  },
});
