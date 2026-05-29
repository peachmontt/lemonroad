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

/** User-initiated Solana disconnect. Always deselects wallet so UI and localStorage clear. */
export async function disconnectSolanaFromUserAction(
  disconnect: SolanaDisconnectFn,
  select: SolanaSelectFn,
): Promise<void> {
  try {
    await disconnect();
  } catch {
    // Adapter may reject; still force deselect so the UI updates.
  }
  select(null);
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
