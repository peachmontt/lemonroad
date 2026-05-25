import { WagmiProvider, createConfig, http } from 'wagmi';
import { polygonAmoy } from 'wagmi/chains';
import { injected, metaMask } from 'wagmi/connectors';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type ReactNode, useMemo } from 'react';
import { EVM_CHAIN_ID } from '../config/evm';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

export function EvmProvider({ children }: { children: ReactNode }) {
  const config = useMemo(
    () =>
      createConfig({
        chains: [polygonAmoy],
        connectors: [metaMask(), injected()],
        transports: {
          [polygonAmoy.id]: http(),
        },
        ssr: false,
      }),
    [],
  );

  void EVM_CHAIN_ID;

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}
