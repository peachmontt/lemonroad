import { getProgramId } from './solana';

export type SolanaPaymentMode = 'program' | 'vault_owner' | 'unconfigured';

export function getSolanaPaymentMode(): SolanaPaymentMode {
  if (getProgramId()) return 'program';
  const owner = process.env.POOL_VAULT_OWNER?.trim();
  if (owner && owner !== '11111111111111111111111111111111') return 'vault_owner';
  return 'unconfigured';
}

export function solanaPaymentDeveloperHint(mode: SolanaPaymentMode): string {
  if (mode === 'program') return '';
  if (mode === 'vault_owner') return '';
  return 'Set PROGRAM_ID (Anchor) or POOL_VAULT_OWNER (wallet that owns the pool USDT ATA) on the server.';
}
