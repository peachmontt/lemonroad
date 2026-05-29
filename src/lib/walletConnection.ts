import type { WalletAdapter, WalletName } from '@solana/wallet-adapter-base';
import type { Connector } from 'wagmi';

export type SolanaConnectFn = () => Promise<void>;
export type SolanaDisconnectFn = () => Promise<void>;
export type SolanaSelectFn = (walletName: WalletName | null) => void;
export type EvmConnectFn = (args: { connector: Connector; chainId: number }) => void;
export type EvmDisconnectFn = () => void;

/** User-initiated Solana connect. Never call during initial render or page load. */
export async function connectSolanaFromUserAction(
  connect: SolanaConnectFn,
  adapter: WalletAdapter | null,
): Promise<void> {
  if (!adapter) {
    throw new Error('Select a Solana wallet first');
  }
  await connect();
}

/** User-initiated Solana disconnect. */
export async function disconnectSolanaFromUserAction(
  disconnect: SolanaDisconnectFn,
): Promise<void> {
  try {
    await disconnect();
  } catch {
    // Adapter may reject; caller decides whether to deselect.
  }
}

/** User-initiated EVM connect. Never call during initial render or page load. */
export function connectEvmFromUserAction(
  connect: EvmConnectFn,
  connector: Connector | undefined,
  chainId: number,
): void {
  if (!connector) {
    throw new Error('No EVM wallet found. Install MetaMask or OKX Wallet.');
  }
  connect({ connector, chainId });
}

/** User-initiated EVM disconnect. */
export function disconnectEvmFromUserAction(disconnect: EvmDisconnectFn): void {
  disconnect();
}

export function formatWalletConnectError(error: unknown): string {
  if (error instanceof Error) {
    if (/user rejected|rejected the request|denied/i.test(error.message)) {
      return 'Wallet connection cancelled.';
    }
    return error.message;
  }
  return 'Wallet connection failed.';
}
