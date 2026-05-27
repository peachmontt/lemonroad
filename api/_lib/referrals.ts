import type { GameRun, Player } from '@prisma/client';
import { prisma } from './db';
import { prismaOp } from './prisma-ops';

const REFERRAL_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_PREFIX = 'LEMON-';
const MIN_QUALIFY_DISTANCE = 50;
const MIN_QUALIFY_DURATION_MS = 5_000;

export function normalizeReferralCode(input: string): string | null {
  const trimmed = input.trim().toUpperCase();
  if (!/^LEMON-[A-Z2-9]{6}$/.test(trimmed)) return null;
  return trimmed;
}

function randomReferralCode(): string {
  let suffix = '';
  for (let i = 0; i < 6; i++) {
    suffix += REFERRAL_CHARS[Math.floor(Math.random() * REFERRAL_CHARS.length)];
  }
  return `${CODE_PREFIX}${suffix}`;
}

export async function generateUniqueReferralCode(): Promise<string> {
  for (let attempt = 0; attempt < 20; attempt++) {
    const code = randomReferralCode();
    const existing = await prisma.player.findUnique({ where: { referralCode: code } });
    if (!existing) return code;
  }
  throw new Error('Failed to generate unique referral code');
}

export async function ensurePlayerReferralCode(playerId: string): Promise<string> {
  const player = await prisma.player.findUnique({ where: { id: playerId } });
  if (!player) throw new Error('Player not found');
  if (player.referralCode) return player.referralCode;

  const code = await generateUniqueReferralCode();
  await prisma.player.update({
    where: { id: playerId },
    data: { referralCode: code },
  });
  return code;
}

function referralShareBase(): string {
  const base = (process.env.VITE_SITE_URL ?? process.env.SITE_URL ?? 'https://www.lemonroad.xyz').replace(
    /\/$/,
    '',
  );
  return base;
}

export async function getReferralStats(playerId: string) {
  const code = await ensurePlayerReferralCode(playerId);
  const [qualifiedCount, pendingCount] = await Promise.all([
    prisma.referral.count({ where: { referrerId: playerId, status: 'QUALIFIED' } }),
    prisma.referral.count({ where: { referrerId: playerId, status: 'PENDING' } }),
  ]);

  return {
    code,
    qualifiedCount,
    pendingCount,
    shareUrl: `${referralShareBase()}/?ref=${encodeURIComponent(code)}`,
  };
}

export type AttributeReason =
  | 'invalid_code'
  | 'self'
  | 'already_attributed'
  | 'same_ip'
  | 'referrer_not_found';

export type AttributeResult = {
  attributed: boolean;
  reason?: AttributeReason;
};

export async function attributeReferral(
  referee: Player,
  rawCode: string,
  refereeIpHash: string,
): Promise<AttributeResult> {
  const code = normalizeReferralCode(rawCode);
  if (!code) return { attributed: false, reason: 'invalid_code' };

  const existing = await prisma.referral.findUnique({ where: { refereeId: referee.id } });
  if (existing) return { attributed: false, reason: 'already_attributed' };

  const referrer = await prisma.player.findUnique({ where: { referralCode: code } });
  if (!referrer) return { attributed: false, reason: 'invalid_code' };

  if (referrer.id === referee.id) return { attributed: false, reason: 'self' };

  if (referrer.ipHash === refereeIpHash) {
    await prisma.referral.create({
      data: {
        referrerId: referrer.id,
        refereeId: referee.id,
        code,
        status: 'REJECTED',
        rejectReason: 'same_ip',
        refereeIpHash,
      },
    });
    return { attributed: false, reason: 'same_ip' };
  }

  await prisma.referral.create({
    data: {
      referrerId: referrer.id,
      refereeId: referee.id,
      code,
      status: 'PENDING',
      refereeIpHash,
    },
  });

  return { attributed: true };
}

export async function tryQualifyReferralOnRun(player: Player, run: GameRun): Promise<boolean> {
  if (!run.isValid) return false;
  if (run.distance < MIN_QUALIFY_DISTANCE) return false;
  if (run.durationMs < MIN_QUALIFY_DURATION_MS) return false;

  const referral = await prisma.referral.findUnique({ where: { refereeId: player.id } });
  if (!referral || referral.status !== 'PENDING') return false;

  const validRunCount = await prisma.gameRun.count({
    where: { playerId: player.id, isValid: true },
  });
  if (validRunCount !== 1) return false;

  await prismaOp('referral.qualify', { referralId: referral.id }, () =>
    prisma.referral.update({
      where: { id: referral.id },
      data: {
        status: 'QUALIFIED',
        qualifiedAt: new Date(),
        qualifiedRunId: run.id,
      },
    }),
  );

  return true;
}
