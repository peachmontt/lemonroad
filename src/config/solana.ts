import { clusterApiUrl, PublicKey } from '@solana/web3.js';

const DEFAULT_DEVNET_USDT_MINT = '4zMMC9srt5Ri5X14GAgXhaHii3GnPEPpGqyejCcJxw4H';

function trimEnv(value: string | undefined): string | undefined {
  const v = value?.trim();
  return v || undefined;
}

function parsePublicKeyEnv(
  value: string | undefined,
  label: string,
): PublicKey | null {
  const v = trimEnv(value);
  if (!v) return null;
  try {
    return new PublicKey(v);
  } catch {
    if (import.meta.env.DEV) {
      console.warn(`[solana] Ignoring invalid ${label}:`, JSON.stringify(value));
    }
    return null;
  }
}

export const SOLANA_CLUSTER =
  trimEnv(import.meta.env.VITE_SOLANA_CLUSTER) ?? 'devnet';

export const SOLANA_RPC_URL =
  trimEnv(import.meta.env.VITE_SOLANA_RPC_URL) ??
  clusterApiUrl(SOLANA_CLUSTER as 'devnet' | 'mainnet-beta' | 'testnet');

export const PROGRAM_ID = parsePublicKeyEnv(
  import.meta.env.VITE_PROGRAM_ID,
  'VITE_PROGRAM_ID',
);

export const USDT_MINT =
  parsePublicKeyEnv(import.meta.env.VITE_USDT_MINT, 'VITE_USDT_MINT') ??
  new PublicKey(DEFAULT_DEVNET_USDT_MINT);

/** 1 USDT, 6 decimals */
export const USDT_PER_ATTEMPT = 1_000_000;
