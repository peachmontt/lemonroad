/**
 * One-time script: initialize the Lemon Road pool program on Solana.
 * Run AFTER `anchor deploy` with the deployed PROGRAM_ID.
 *
 * Usage:
 *   PROGRAM_ID=<id> USDT_MINT=<mint> CRANK_PUBKEY=<key> \
 *     SOLANA_RPC_URL=https://api.devnet.solana.com \
 *     npx ts-node --project tsconfig.api.json scripts/init-pool.ts
 *
 * Admin wallet: loaded from ADMIN_KEYPAIR env (JSON array or base58)
 * or falls back to ~/.config/solana/id.json
 */

import fs from 'fs';
import os from 'os';
import path from 'path';
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  Transaction,
  TransactionInstruction,
} from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { createHash } from 'crypto';
import bs58 from 'bs58';

function discriminator(name: string): Buffer {
  return createHash('sha256').update(`global:${name}`).digest().subarray(0, 8) as Buffer;
}

function loadKeypair(envVar: string, fallbackPath: string): Keypair {
  const raw = process.env[envVar];
  if (raw) {
    try {
      return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(raw) as number[]));
    } catch {
      return Keypair.fromSecretKey(bs58.decode(raw));
    }
  }
  const keyFile = JSON.parse(fs.readFileSync(fallbackPath, 'utf8')) as number[];
  return Keypair.fromSecretKey(Uint8Array.from(keyFile));
}

async function main() {
  const rpc = process.env.SOLANA_RPC_URL ?? 'https://api.devnet.solana.com';
  const programIdStr = process.env.PROGRAM_ID;
  const usdtMintStr = process.env.USDT_MINT;
  const crankPubkeyStr = process.env.CRANK_PUBKEY;

  if (!programIdStr || !usdtMintStr || !crankPubkeyStr) {
    console.error('Required: PROGRAM_ID, USDT_MINT, CRANK_PUBKEY');
    process.exit(1);
  }

  const programId = new PublicKey(programIdStr);
  const usdtMint = new PublicKey(usdtMintStr);
  const crankPubkey = new PublicKey(crankPubkeyStr);

  const admin = loadKeypair('ADMIN_KEYPAIR', path.join(os.homedir(), '.config/solana/id.json'));
  console.log('Admin:', admin.publicKey.toBase58());

  const connection = new Connection(rpc, 'confirmed');

  const [globalConfig, configBump] = PublicKey.findProgramAddressSync(
    [Buffer.from('global_config')],
    programId,
  );
  const [vaultAuthority, vaultBump] = PublicKey.findProgramAddressSync(
    [Buffer.from('vault_authority')],
    programId,
  );
  const [vault] = PublicKey.findProgramAddressSync(
    [Buffer.from('vault')],
    programId,
  );

  console.log('global_config PDA:', globalConfig.toBase58(), 'bump:', configBump);
  console.log('vault_authority PDA:', vaultAuthority.toBase58(), 'bump:', vaultBump);
  console.log('vault ATA (PDA):', vault.toBase58());

  const existing = await connection.getAccountInfo(globalConfig);
  if (existing) {
    console.log('GlobalConfig already initialized. Nothing to do.');
    process.exit(0);
  }

  // Encode crank pubkey as Borsh bytes (32-byte pubkey)
  const data = Buffer.alloc(8 + 32);
  discriminator('initialize').copy(data, 0);
  crankPubkey.toBuffer().copy(data, 8);

  const ix = new TransactionInstruction({
    programId,
    keys: [
      { pubkey: admin.publicKey, isSigner: true, isWritable: true },
      { pubkey: globalConfig, isSigner: false, isWritable: true },
      { pubkey: usdtMint, isSigner: false, isWritable: false },
      { pubkey: vaultAuthority, isSigner: false, isWritable: false },
      { pubkey: vault, isSigner: false, isWritable: true },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
    ],
    data,
  });

  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
  const tx = new Transaction().add(ix);
  tx.recentBlockhash = blockhash;
  tx.feePayer = admin.publicKey;
  tx.sign(admin);

  console.log('Sending initialize transaction…');
  const sig = await connection.sendRawTransaction(tx.serialize());
  await connection.confirmTransaction({ signature: sig, blockhash, lastValidBlockHeight });
  console.log('✅ Initialized! TX:', sig);
  console.log(`   Explorer: https://explorer.solana.com/tx/${sig}?cluster=devnet`);
}

main().catch((e) => { console.error(e); process.exit(1); });
