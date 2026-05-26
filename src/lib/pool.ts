import {
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from '@solana/web3.js';
import {
  createAssociatedTokenAccountIdempotentInstruction,
  getAssociatedTokenAddressSync,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import { PROGRAM_ID, USDT_MINT } from '../config/solana';

/** sha256("global:deposit_attempt")[0..8] */
const DEPOSIT_DISCRIMINATOR = Buffer.from([
  70, 138, 37, 174, 207, 144, 1, 228,
]);

export function globalConfigPda(programId: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from('global_config')],
    programId,
  );
  return pda;
}

export function hourLedgerPda(programId: PublicKey, hourId: bigint): PublicKey {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64LE(hourId);
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from('hour'), buf],
    programId,
  );
  return pda;
}

export function vaultAuthorityPda(programId: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from('vault_authority')],
    programId,
  );
  return pda;
}

/** Program-owned USDT token account (seeds: ["vault"]), not an ATA. */
export function vaultTokenPda(programId: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync([Buffer.from('vault')], programId);
  return pda;
}

function depositAttemptInstruction(
  programId: PublicKey,
  wallet: PublicKey,
  hourId: string,
  accounts: {
    globalConfig: PublicKey;
    hourLedger: PublicKey;
    userAta: PublicKey;
    vault: PublicKey;
    vaultAuthority: PublicKey;
    usdtMint: PublicKey;
  },
): TransactionInstruction {
  const hour = BigInt(hourId);
  const data = Buffer.alloc(16);
  DEPOSIT_DISCRIMINATOR.copy(data, 0);
  data.writeBigInt64LE(hour, 8);

  return new TransactionInstruction({
    programId,
    keys: [
      { pubkey: wallet, isSigner: true, isWritable: true },
      { pubkey: accounts.globalConfig, isSigner: false, isWritable: false },
      { pubkey: accounts.hourLedger, isSigner: false, isWritable: true },
      { pubkey: accounts.userAta, isSigner: false, isWritable: true },
      { pubkey: accounts.vault, isSigner: false, isWritable: true },
      { pubkey: accounts.vaultAuthority, isSigner: false, isWritable: false },
      { pubkey: accounts.usdtMint, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  });
}

/** Build deposit tx from server prepare accounts (single source of truth). */
export function buildDepositAttemptFromPrepare(
  wallet: PublicKey,
  hourId: string,
  prepAccounts: Record<string, string>,
): Transaction | null {
  const programIdStr = prepAccounts.programId;
  if (!programIdStr) return null;

  try {
    const programId = new PublicKey(programIdStr);
    const userAta = new PublicKey(prepAccounts.userAta);
    const ix = depositAttemptInstruction(programId, wallet, hourId, {
      globalConfig: new PublicKey(prepAccounts.globalConfig),
      hourLedger: new PublicKey(prepAccounts.hourLedger),
      userAta,
      vault: new PublicKey(prepAccounts.vaultAta),
      vaultAuthority: new PublicKey(prepAccounts.vaultAuthority),
      usdtMint: new PublicKey(prepAccounts.usdtMint),
    });

    return new Transaction().add(
      createAssociatedTokenAccountIdempotentInstruction(
        wallet,
        userAta,
        wallet,
        new PublicKey(prepAccounts.usdtMint),
      ),
      ix,
    );
  } catch {
    return null;
  }
}

export function buildDepositAttemptTransaction(
  wallet: PublicKey,
  hourId: string,
): Transaction | null {
  if (!PROGRAM_ID) return null;

  const programId = PROGRAM_ID;
  const ix = depositAttemptInstruction(programId, wallet, hourId, {
    globalConfig: globalConfigPda(programId),
    hourLedger: hourLedgerPda(programId, BigInt(hourId)),
    userAta: getAssociatedTokenAddressSync(USDT_MINT, wallet, false),
    vault: vaultTokenPda(programId),
    vaultAuthority: vaultAuthorityPda(programId),
    usdtMint: USDT_MINT,
  });

  return new Transaction().add(
    createAssociatedTokenAccountIdempotentInstruction(
      wallet,
      getAssociatedTokenAddressSync(USDT_MINT, wallet, false),
      wallet,
      USDT_MINT,
    ),
    ix,
  );
}
