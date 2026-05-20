import { WagmiProvider, createConfig, http } from 'wagmi';
import { mainnet, polygon, polygonAmoy } from 'wagmi/chains';
import { injected } from 'wagmi/connectors';
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
        chains: [polygon, mainnet, polygonAmoy],
        connectors: [injected({ target: 'metaMask' }), injected()],
        transports: {
          [polygon.id]: http(),
          [mainnet.id]: http(),
          [polygonAmoy.id]: http(),
        },
        ssr: false,
      }),
    [],
  );

  void EVM_CHAIN_ID; // referenced so tree-shaking keeps the config import

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}
