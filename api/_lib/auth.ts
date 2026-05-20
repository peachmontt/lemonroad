import type { VercelRequest } from '@vercel/node';
import { prisma } from './db';
import { getSessionId } from './session';

export async function getAuthenticatedPlayer(req: VercelRequest) {
  const sessionId = getSessionId(req);
  if (!sessionId) return null;
  return prisma.player.findUnique({ where: { sessionId } });
}
