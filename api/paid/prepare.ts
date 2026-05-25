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
import { getEvmVaultAddress, getEvmChainId } from '../_lib/evm';
import {
  getSolanaPaymentMode,
  solanaPaymentDeveloperHint,
} from '../_lib/payment-config';
import { PublicKey } from '@solana/web3.js';
import { getAssociatedTokenAddressSync } from '@solana/spl-token';

const bodySchema = z.object({
  walletPubkey: z.string(),
  paymentChain: z.enum(['solana', 'evm']).default('solana'),
});

export default withMethods({
  POST: async (req, res) => {
    const parsed = bodySchema.safeParse(parseJsonBody(req));
    if (!parsed.success) {
      return badRequest(res, parsed.error.message);
    }

    const { walletPubkey, paymentChain } = parsed.data;
    const hourBucket = currentHourBucket();

    const unused = await prisma.verifiedDeposit.findFirst({
      where: {
        walletPubkey,
        hourBucket,
        paymentChain,
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

    // EVM (MetaMask) payment path
    if (paymentChain === 'evm') {
      const evmVault = getEvmVaultAddress();
      const evmChainId = getEvmChainId();
      const usdtAddresses: Record<number, string> = {
        1: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
        137: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
        80002: '0x52D800ca262522580CeBAD275395ca6e7598C014',
      };
      const evmAccounts = evmVault
        ? {
            evmVault,
            evmChainId: String(evmChainId),
            usdtAddress: usdtAddresses[evmChainId] ?? usdtAddresses[137],
          }
        : null;

      if (!evmAccounts) {
        console.error(
          '[paid/prepare] EVM payment unavailable: set POOL_EVM_VAULT on the server.',
        );
      }

      return json(res, {
        ready: false,
        paymentAvailable: evmAccounts !== null,
        developerHint: evmAccounts
          ? undefined
          : 'Set POOL_EVM_VAULT on the server.',
        hourBucket,
        amountUsdt: ATTEMPT_AMOUNT.toString(),
        amountFormatted: '1 USDT',
        accounts: evmAccounts,
      });
    }

    // Solana payment path
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

    const solanaMode = getSolanaPaymentMode();
    const paymentAvailable = accounts !== null;

    if (!paymentAvailable) {
      console.error(
        `[paid/prepare] Solana payment unavailable (${solanaMode}): ${solanaPaymentDeveloperHint(solanaMode)}`,
      );
    }

    json(res, {
      ready: false,
      paymentAvailable,
      paymentMode: solanaMode,
      developerHint: paymentAvailable ? undefined : solanaPaymentDeveloperHint(solanaMode),
      hourBucket,
      amountUsdt: ATTEMPT_AMOUNT.toString(),
      amountFormatted: '1 USDT',
      accounts,
    });
  },
});
