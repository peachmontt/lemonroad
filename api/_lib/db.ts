import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createPrismaClient(): PrismaClient {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

// Reuse one client per serverless instance (Vercel warm invocations). Caching only in
// development was leaving production without a singleton and exhausting DB connections.
globalForPrisma.prisma = prisma;

let loggedDbConfig = false;

/** Log pooled vs direct URL hints once per instance (never logs credentials). */
export function logDatabaseConfigOnce(): void {
  if (loggedDbConfig) return;
  loggedDbConfig = true;

  const url = process.env.DATABASE_URL ?? '';
  if (!url) {
    console.error('[prisma] DATABASE_URL is not set');
    return;
  }

  let host = 'unknown';
  try {
    host = new URL(url.replace(/^postgresql:\/\//, 'http://')).hostname;
  } catch {
    host = '(unparseable)';
  }

  const pooled =
    host.includes('pooler') ||
    host.includes('-pooler') ||
    url.includes('pgbouncer=true') ||
    url.includes('connection_limit=');

  console.info('[prisma] database config', {
    host,
    pooledHint: pooled,
    hasDirectUrl: Boolean(process.env.DIRECT_URL),
    nodeEnv: process.env.NODE_ENV ?? 'unknown',
  });

  if (process.env.NODE_ENV === 'production' && !pooled) {
    console.warn(
      '[prisma] DATABASE_URL does not look pooled; on serverless use your provider pooled URL to avoid E57P01 connection drops',
    );
  }
}

logDatabaseConfigOnce();
