import type { Connector } from 'wagmi';
import { injected } from 'wagmi/connectors';
import type { EIP1193Provider } from 'viem';
import type { EvmWalletKind } from '../config/wallets';

declare global {
  interface Window {
    okxwallet?: EIP1193Provider;
  }
}

type OkxFlaggedProvider = EIP1193Provider & {
  isOkxWallet?: boolean;
  isOKExWallet?: boolean;
  providers?: OkxFlaggedProvider[];
};

type WalletWindow = {
  okxwallet?: EIP1193Provider;
  ethereum?: OkxFlaggedProvider;
};

function findOkxProvider(windowObject: WalletWindow | undefined): EIP1193Provider | undefined {
  if (!windowObject) return undefined;

  if (windowObject.okxwallet) return windowObject.okxwallet;

  const ethereum = windowObject.ethereum;
  if (!ethereum) return undefined;

  if (ethereum.providers?.length) {
    return ethereum.providers.find(
      (provider: OkxFlaggedProvider) => provider.isOkxWallet || provider.isOKExWallet,
    );
  }

  if (ethereum.isOkxWallet || ethereum.isOKExWallet) return ethereum;
  return undefined;
}

/** OKX injects window.okxwallet — not discoverable via the generic isOkxWallet string target. */
export function createOkxWalletConnector() {
  return injected({
    target: {
      id: 'okxWallet',
      name: 'OKX Wallet',
      provider(window) {
        return findOkxProvider(window as WalletWindow | undefined);
      },
    },
  });
}

export function isOkxWalletInstalled(): boolean {
  return typeof window !== 'undefined' && findOkxProvider(window as WalletWindow) !== undefined;
}

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
