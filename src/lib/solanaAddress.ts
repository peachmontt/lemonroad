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
