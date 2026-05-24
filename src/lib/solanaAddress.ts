import { PublicKey } from '@solana/web3.js';

/** Returns true for a valid on-curve Solana wallet public key. */
export function isValidSolanaWalletAddress(addr: string): boolean {
  const trimmed = addr.trim();
  if (!trimmed || trimmed.length < 32 || trimmed.length > 44) return false;

  try {
    const pk = new PublicKey(trimmed);
    return PublicKey.isOnCurve(pk.toBytes());
  } catch {
    return false;
  }
}

/** Shortens a wallet address for display, e.g. 7GhD...9KsP */
export function formatShortWallet(addr: string, prefix = 4, suffix = 4): string {
  const trimmed = addr.trim();
  if (trimmed.length <= prefix + suffix + 3) return trimmed;
  return `${trimmed.slice(0, prefix)}...${trimmed.slice(-suffix)}`;
}
