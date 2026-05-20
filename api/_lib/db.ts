import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

// #region agent log
fetch('http://127.0.0.1:7492/ingest/cdafb337-3a80-4628-8ac8-33134b513802',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'b93c72'},body:JSON.stringify({sessionId:'b93c72',location:'db.ts:module-load',message:'db.ts module loading',data:{hasDatabaseUrl:!!process.env.DATABASE_URL,nodeEnv:process.env.NODE_ENV},hypothesisId:'H1',timestamp:Date.now()})}).catch(()=>{});
// #endregion

let _prisma: PrismaClient;
try {
  _prisma =
    globalForPrisma.prisma ??
    new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    });
  // #region agent log
  fetch('http://127.0.0.1:7492/ingest/cdafb337-3a80-4628-8ac8-33134b513802',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'b93c72'},body:JSON.stringify({sessionId:'b93c72',location:'db.ts:constructor-ok',message:'PrismaClient constructed successfully',hypothesisId:'H1',timestamp:Date.now()})}).catch(()=>{});
  // #endregion
} catch (e) {
  // #region agent log
  fetch('http://127.0.0.1:7492/ingest/cdafb337-3a80-4628-8ac8-33134b513802',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'b93c72'},body:JSON.stringify({sessionId:'b93c72',location:'db.ts:constructor-error',message:'PrismaClient constructor THREW',data:{error:String(e)},hypothesisId:'H1',timestamp:Date.now()})}).catch(()=>{});
  // #endregion
  throw e;
}

export const prisma = _prisma;

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
