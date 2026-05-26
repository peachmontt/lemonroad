import { isIosAndRedirectable, WalletAdapterNetwork } from '@solana/wallet-adapter-base';
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

  // Phantom adapter marks iOS Safari as Loadable; wallet-adapter-react autoConnect
  // calls connect() which redirects to phantom.app without user input. Phantom's own
  // autoConnect() skips Loadable — we mirror that by disabling autoConnect on iOS.
  const autoConnect = useMemo(() => !isIosAndRedirectable(), []);

  const Provider = ConnectionProvider as ComponentType<{
    endpoint: string;
    children: ReactNode;
  }>;

  return (
    <EvmProvider>
      <Provider endpoint={SOLANA_RPC_URL}>
        <SolanaWalletProvider wallets={wallets} autoConnect={autoConnect}>
          <WalletModalProvider>{children}</WalletModalProvider>
        </SolanaWalletProvider>
      </Provider>
    </EvmProvider>
  );
}
