import { SOLANA_CLUSTER } from './solana';

/** Solana Explorer `cluster` query param; omit on mainnet-beta. */
export function solanaExplorerClusterQuery(): string {
  if (SOLANA_CLUSTER === 'mainnet-beta' || SOLANA_CLUSTER === 'mainnet') {
    return '';
  }
  return `?cluster=${encodeURIComponent(SOLANA_CLUSTER)}`;
}

export function solanaExplorerTxUrl(signature: string): string {
  return `https://explorer.solana.com/tx/${signature}${solanaExplorerClusterQuery()}`;
}

export function solanaClusterLabel(): string {
  if (SOLANA_CLUSTER === 'mainnet-beta' || SOLANA_CLUSTER === 'mainnet') {
    return 'Mainnet';
  }
  if (SOLANA_CLUSTER === 'devnet') {
    return 'Devnet';
  }
  return SOLANA_CLUSTER;
}
