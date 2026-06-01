import { prisma } from './_lib/db';
import { json, withMethods } from './_lib/http';

export default withMethods({
  GET: async (_req, res) => {
    let dbOk = false;
    try {
      await prisma.$queryRaw`SELECT 1`;
      dbOk = true;
    } catch {
      dbOk = false;
    }

    json(res, {
      ok: dbOk && Boolean(process.env.IP_HASH_SALT) && Boolean(process.env.CRON_SECRET),
      db: dbOk,
      ipHashSalt: Boolean(process.env.IP_HASH_SALT),
      cronSecret: Boolean(process.env.CRON_SECRET),
      solanaProgram: Boolean(process.env.PROGRAM_ID),
      evmVault: Boolean(process.env.POOL_EVM_VAULT),
      evmClaimSigner: Boolean(process.env.EVM_VAULT_PRIVATE_KEY),
    });
  },
});
