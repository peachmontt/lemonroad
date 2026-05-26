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

export function buildDepositAttemptTransaction(
  wallet: PublicKey,
  hourId: string,
): Transaction | null {
  if (!PROGRAM_ID) return null;

  const hour = BigInt(hourId);
  const programId = PROGRAM_ID;
  const config = globalConfigPda(programId);
  const hourLedger = hourLedgerPda(programId, hour);
  const vaultAuth = vaultAuthorityPda(programId);
  const vault = vaultTokenPda(programId);
  const userAta = getAssociatedTokenAddressSync(USDT_MINT, wallet, false);

  const data = Buffer.alloc(8 + DEPOSIT_DISCRIMINATOR.length);
  DEPOSIT_DISCRIMINATOR.copy(data, 0);
  data.writeBigInt64LE(hour, DEPOSIT_DISCRIMINATOR.length);

  const ix = new TransactionInstruction({
    programId,
    keys: [
      { pubkey: wallet, isSigner: true, isWritable: true },
      { pubkey: config, isSigner: false, isWritable: false },
      { pubkey: hourLedger, isSigner: false, isWritable: true },
      { pubkey: userAta, isSigner: false, isWritable: true },
      { pubkey: vault, isSigner: false, isWritable: true },
      { pubkey: vaultAuth, isSigner: false, isWritable: false },
      { pubkey: USDT_MINT, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  });

  return new Transaction().add(
    createAssociatedTokenAccountIdempotentInstruction(
      wallet,
      userAta,
      wallet,
      USDT_MINT,
    ),
    ix,
  );
}
