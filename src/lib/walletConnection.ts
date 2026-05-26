import type { WalletAdapter } from '@solana/wallet-adapter-base';
import type { Connector } from 'wagmi';

export type SolanaConnectFn = () => Promise<void>;
export type EvmConnectFn = (args: { connector: Connector; chainId: number }) => void;

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

/** User-initiated EVM connect. Never call during initial render or page load. */
export function connectEvmFromUserAction(
  connect: EvmConnectFn,
  connector: Connector | undefined,
  chainId: number,
): void {
  if (!connector) {
    throw new Error('No EVM wallet found. Install MetaMask.');
  }
  connect({ connector, chainId });
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
