import { clusterApiUrl, PublicKey } from '@solana/web3.js';

export const SOLANA_CLUSTER =
  import.meta.env.VITE_SOLANA_CLUSTER ?? 'devnet';

export const SOLANA_RPC_URL =
  import.meta.env.VITE_SOLANA_RPC_URL ??
  clusterApiUrl(SOLANA_CLUSTER as 'devnet' | 'mainnet-beta' | 'testnet');

export const PROGRAM_ID = import.meta.env.VITE_PROGRAM_ID
  ? new PublicKey(import.meta.env.VITE_PROGRAM_ID)
  : null;

export const USDT_MINT = new PublicKey(
  import.meta.env.VITE_USDT_MINT ??
    '4zMMC9srt5Ri5X14GAgXhaHii3GnPEPpGqyejCcJxw4H',
);

/** 1 USDT, 6 decimals */
export const USDT_PER_ATTEMPT = 1_000_000;
