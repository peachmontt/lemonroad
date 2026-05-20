import { z } from 'zod';
import { prisma } from '../_lib/db';
import { currentHourBucket } from '../_lib/hour';
import { badRequest, json, withMethods, parseJsonBody } from '../_lib/http';
import {
  getProgramId,
  getUsdtMint,
  globalConfigPda,
  hourLedgerPda,
  vaultAuthorityPda,
  ATTEMPT_AMOUNT,
} from '../_lib/solana';
import { PublicKey } from '@solana/web3.js';
import { getAssociatedTokenAddressSync } from '@solana/spl-token';

const bodySchema = z.object({
  walletPubkey: z.string(),
});

export default withMethods({
  POST: async (req, res) => {
    const parsed = bodySchema.safeParse(parseJsonBody(req));
    if (!parsed.success) {
      return badRequest(res, parsed.error.message);
    }

    const { walletPubkey } = parsed.data;
    const hourBucket = currentHourBucket();

    const unused = await prisma.verifiedDeposit.findFirst({
      where: {
        walletPubkey,
        hourBucket,
        usedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (unused) {
      return json(res, {
        ready: true,
        depositTx: unused.txSignature,
        hourBucket,
        amountUsdt: ATTEMPT_AMOUNT.toString(),
      });
    }

    const programId = getProgramId();
    const usdtMint = getUsdtMint();
    const wallet = new PublicKey(walletPubkey);

    let accounts: Record<string, string> | null = null;
    const poolVaultOwner = process.env.POOL_VAULT_OWNER;
    if (programId) {
      const vaultAuth = vaultAuthorityPda(programId);
      accounts = {
        programId: programId.toBase58(),
        globalConfig: globalConfigPda(programId).toBase58(),
        hourLedger: hourLedgerPda(programId, BigInt(hourBucket)).toBase58(),
        vaultAuthority: vaultAuth.toBase58(),
        vaultAta: getAssociatedTokenAddressSync(usdtMint, vaultAuth, true).toBase58(),
        userAta: getAssociatedTokenAddressSync(usdtMint, wallet, false).toBase58(),
        usdtMint: usdtMint.toBase58(),
        hourId: hourBucket,
      };
    } else if (poolVaultOwner) {
      const owner = new PublicKey(poolVaultOwner);
      accounts = {
        vaultAta: getAssociatedTokenAddressSync(usdtMint, owner, false).toBase58(),
        userAta: getAssociatedTokenAddressSync(usdtMint, wallet, false).toBase58(),
        usdtMint: usdtMint.toBase58(),
        hourId: hourBucket,
      };
    }

    json(res, {
      ready: false,
      hourBucket,
      amountUsdt: ATTEMPT_AMOUNT.toString(),
      amountFormatted: '1 USDT',
      accounts,
    });
  },
});
