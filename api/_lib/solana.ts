import { createHash } from 'crypto';
import bs58 from 'bs58';
import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  TransactionInstruction,
} from '@solana/web3.js';
import {
  createAssociatedTokenAccountIdempotentInstruction,
  getAssociatedTokenAddressSync,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import { USDT_PER_ATTEMPT } from './pool-math';

const ATTEMPT_AMOUNT = USDT_PER_ATTEMPT;

export function getConnection(): Connection {
  const rpc =
    process.env.SOLANA_RPC_URL ?? 'https://api.mainnet-beta.solana.com';
  return new Connection(rpc, 'confirmed');
}

export function getProgramId(): PublicKey | null {
  const id = process.env.PROGRAM_ID;
  if (!id || id === '11111111111111111111111111111111') return null;
  try {
    return new PublicKey(id);
  } catch {
    return null;
  }
}

export function getUsdtMint(): PublicKey {
  const mint =
    process.env.USDT_MINT ??
    'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB'; // mainnet USDT
  return new PublicKey(mint);
}

export function getCrankKeypair(): Keypair | null {
  const secret = process.env.CRANK_KEYPAIR;
  if (!secret) return null;
  try {
    const bytes = JSON.parse(secret) as number[];
    return Keypair.fromSecretKey(Uint8Array.from(bytes));
  } catch {
    try {
      return Keypair.fromSecretKey(bs58.decode(secret));
    } catch {
      return null;
    }
  }
}

/** Anchor instruction discriminator + Borsh args helpers */
function anchorDiscriminator(name: string): Buffer {
  return createHash('sha256').update(`global:${name}`).digest().subarray(0, 8);
}

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

export function vaultTokenPda(programId: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync([Buffer.from('vault')], programId);
  return pda;
}

export async function isPoolProgramInitialized(programId: PublicKey): Promise<boolean> {
  const connection = getConnection();
  const info = await connection.getAccountInfo(globalConfigPda(programId));
  return info !== null && info.data.length > 0;
}

export async function verifyDepositTransaction(
  txSignature: string,
  expectedWallet: string,
  expectedHourBucket: string,
): Promise<{ ok: boolean; error?: string }> {
  const connection = getConnection();
  const programId = getProgramId();
  const usdtMint = getUsdtMint();

  let tx;
  try {
    tx = await connection.getParsedTransaction(txSignature, {
      maxSupportedTransactionVersion: 0,
    });
  } catch {
    return { ok: false, error: 'Transaction not found' };
  }

  if (!tx?.meta || tx.meta.err) {
    return { ok: false, error: 'Transaction failed on-chain' };
  }

  const walletPk = new PublicKey(expectedWallet);
  const hourId = BigInt(expectedHourBucket);

  if (programId) {
    const hasProgramIx = tx.transaction.message.accountKeys.some(
      (k) => k.pubkey.equals(programId),
    );
    if (!hasProgramIx) {
      return { ok: false, error: 'No pool program instruction in transaction' };
    }
  }

  const vaultDest = programId
    ? vaultTokenPda(programId)
    : getAssociatedTokenAddressSync(
        usdtMint,
        new PublicKey(process.env.POOL_VAULT_OWNER ?? expectedWallet),
        false,
      );

  let deposited = 0n;
  const pre = tx.meta.preTokenBalances ?? [];
  const post = tx.meta.postTokenBalances ?? [];

  for (const postBal of post) {
    if (postBal.mint !== usdtMint.toBase58()) continue;
    const preBal = pre.find(
      (p) => p.accountIndex === postBal.accountIndex,
    );
    const preAmt = BigInt(preBal?.uiTokenAmount.amount ?? '0');
    const postAmt = BigInt(postBal.uiTokenAmount.amount);
    const accountKey =
      tx.transaction.message.accountKeys[postBal.accountIndex]?.pubkey;
    if (accountKey?.equals(vaultDest)) {
      deposited += postAmt - preAmt;
    }
  }

  // Fallback: check any transfer to vault ATA of >= 1 USDT
  if (deposited < ATTEMPT_AMOUNT) {
    for (const inner of tx.meta.innerInstructions ?? []) {
      for (const ix of inner.instructions) {
        if (!('parsed' in ix)) continue;
        const parsed = ix.parsed as {
          type?: string;
          info?: { destination?: string; amount?: string; authority?: string };
        };
        if (
          parsed.type === 'transfer' ||
          parsed.type === 'transferChecked'
        ) {
          const dest = parsed.info?.destination;
          const amt = BigInt(parsed.info?.amount ?? '0');
          if (dest && amt >= ATTEMPT_AMOUNT) {
            const destKey = new PublicKey(dest);
            if (destKey.equals(vaultDest)) {
              deposited = amt;
            }
          }
        }
      }
    }
  }

  if (deposited < ATTEMPT_AMOUNT) {
    return { ok: false, error: 'Deposit amount below 1 USDT' };
  }

  const signer = tx.transaction.message.accountKeys.find((k) => k.signer);
  if (signer && !signer.pubkey.equals(walletPk)) {
    return { ok: false, error: 'Wallet mismatch' };
  }

  void hourId;
  return { ok: true };
}

/** Single-recipient crank payout for claim flow. */
export async function buildClaimPayoutTransaction(
  recipientWallet: string,
  amountMicro: bigint,
): Promise<string> {
  const programId = getProgramId();
  const crank = getCrankKeypair();
  if (!programId || !crank) {
    throw new Error('Solana pool program or crank not configured');
  }
  if (amountMicro <= 0n) {
    throw new Error('Payout amount must be positive');
  }

  const connection = getConnection();
  const usdtMint = getUsdtMint();
  const config = globalConfigPda(programId);
  const vaultAuth = vaultAuthorityPda(programId);
  const vaultAta = vaultTokenPda(programId);
  const recipient = new PublicKey(recipientWallet);
  const recipientAta = getAssociatedTokenAddressSync(usdtMint, recipient, false);

  const data = Buffer.alloc(8 + 8);
  let off = 0;
  const disc = anchorDiscriminator('crank_payout');
  for (let i = 0; i < 8; i++) data[off + i] = disc[i];
  off += 8;
  data.writeBigUInt64LE(amountMicro, off);

  const keys = [
    { pubkey: crank.publicKey, isSigner: true, isWritable: true },
    { pubkey: config, isSigner: false, isWritable: false },
    { pubkey: vaultAta, isSigner: false, isWritable: true },
    { pubkey: vaultAuth, isSigner: false, isWritable: false },
    { pubkey: usdtMint, isSigner: false, isWritable: false },
    { pubkey: recipientAta, isSigner: false, isWritable: true },
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
  ];

  const ix = new TransactionInstruction({ programId, keys, data });
  const tx = new Transaction().add(ix);
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
  tx.recentBlockhash = blockhash;
  tx.feePayer = crank.publicKey;

  const ataInfo = await connection.getAccountInfo(recipientAta);
  if (!ataInfo) {
    tx.add(
      createAssociatedTokenAccountIdempotentInstruction(
        crank.publicKey,
        recipientAta,
        recipient,
        usdtMint,
      ),
    );
  }

  tx.sign(crank);
  const sig = await connection.sendRawTransaction(tx.serialize());
  await connection.confirmTransaction({ signature: sig, blockhash, lastValidBlockHeight });
  return sig;
}

/** @deprecated Use buildClaimPayoutTransaction */
export const sendCrankPayoutTransaction = buildClaimPayoutTransaction;

export { ATTEMPT_AMOUNT };
