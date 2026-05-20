import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

// #region agent log
console.log('[DEBUG b93c72] db.ts: module loading. DATABASE_URL set:', !!process.env.DATABASE_URL, '| NODE_ENV:', process.env.NODE_ENV);
// #endregion

let _prisma: PrismaClient;
try {
  _prisma =
    globalForPrisma.prisma ??
    new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    });
  // #region agent log
  console.log('[DEBUG b93c72] db.ts: PrismaClient constructed OK');
  // #endregion
} catch (e) {
  // #region agent log
  console.error('[DEBUG b93c72] db.ts: PrismaClient constructor THREW:', e);
  // #endregion
  throw e;
}

export const prisma = _prisma;

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
