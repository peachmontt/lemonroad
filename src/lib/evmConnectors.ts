import type { Connector } from 'wagmi';
import type { EvmWalletKind } from '../config/wallets';

export function getEvmConnector(
  connectors: readonly Connector[],
  kind: EvmWalletKind,
): Connector | undefined {
  if (kind === 'okx') {
    return (
      connectors.find((c) => c.id === 'okxWallet') ??
      connectors.find((c) => /okx/i.test(c.name))
    );
  }

  const preferredIds = ['metaMaskSDK', 'metaMask', 'io.metamask'];
  for (const id of preferredIds) {
    const match = connectors.find((c) => c.id === id);
    if (match) return match;
  }
  return connectors.find((c) => c.type === 'metaMask');
}

export function formatEvmWalletError(message: string, kind: EvmWalletKind): string {
  const name = kind === 'okx' ? 'OKX Wallet' : 'MetaMask';
  if (/provider not found/i.test(message)) {
    return `Could not open ${name}. Install the extension or app, then try again.`;
  }
  if (kind === 'metamask' && /dependency "@metamask\/connect-evm" not found/i.test(message)) {
    return 'MetaMask SDK is unavailable. Please try again later.';
  }
  return message;
}
