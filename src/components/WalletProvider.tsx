import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import {
  ConnectionProvider,
  WalletProvider as SolanaWalletProvider,
} from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import '@solana/wallet-adapter-react-ui/styles.css';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-phantom';
import { SolflareWalletAdapter } from '@solana/wallet-adapter-solflare';
import { useMemo, type ComponentType, type ReactNode } from 'react';
import { SOLANA_CLUSTER, SOLANA_RPC_URL } from '../config/solana';
import { EvmProvider } from '../providers/EvmProvider';

interface Props {
  children: ReactNode;
}

export function WalletProvider({ children }: Props) {
  const network =
    SOLANA_CLUSTER === 'mainnet-beta'
      ? WalletAdapterNetwork.Mainnet
      : WalletAdapterNetwork.Devnet;

  const wallets = useMemo(
    () => [new PhantomWalletAdapter(), new SolflareWalletAdapter({ network })],
    [network],
  );

  // Do not auto-connect wallets on page load. autoConnect triggers adapter.connect()
  // on mount (including Phantom deep links to phantom.app on mobile/PWA) and hurts retention.
  // Wallet connection must only happen from explicit user clicks (Connect Wallet, modal, pay).

  const Provider = ConnectionProvider as ComponentType<{
    endpoint: string;
    children: ReactNode;
  }>;

  return (
    <EvmProvider>
      <Provider endpoint={SOLANA_RPC_URL}>
        <SolanaWalletProvider wallets={wallets} autoConnect={false}>
          <WalletModalProvider>{children}</WalletModalProvider>
        </SolanaWalletProvider>
      </Provider>
    </EvmProvider>
  );
}
