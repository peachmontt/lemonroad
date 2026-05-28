import type { Chain } from 'viem';
import { WagmiProvider, createConfig, http } from 'wagmi';
import { mainnet, polygon, polygonAmoy } from 'wagmi/chains';
import { injected, metaMask } from 'wagmi/connectors';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type ReactNode, useMemo } from 'react';
import { EVM_CHAIN_ID } from '../config/evm';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

const EVM_RPC_URL = import.meta.env.VITE_EVM_RPC_URL as string | undefined;
const EVM_RPC_URL_POLYGON = import.meta.env.VITE_EVM_RPC_URL_POLYGON as string | undefined;
const EVM_RPC_URL_ETHEREUM = import.meta.env.VITE_EVM_RPC_URL_ETHEREUM as string | undefined;

function rpcTransport(chainId: number) {
  if (chainId === polygon.id) {
    return http(EVM_RPC_URL_POLYGON ?? EVM_RPC_URL);
  }
  if (chainId === mainnet.id) {
    return http(EVM_RPC_URL_ETHEREUM ?? EVM_RPC_URL);
  }
  return http(EVM_RPC_URL);
}

export function EvmProvider({ children }: { children: ReactNode }) {
  const config = useMemo(() => {
    const origin =
      typeof window !== 'undefined' ? window.location.origin : 'https://www.lemonroad.xyz';

    const isTestEvm = EVM_CHAIN_ID === 80002;
    const chains: readonly [Chain, ...Chain[]] = isTestEvm
      ? [polygonAmoy]
      : [polygon, mainnet];

    const transports = Object.fromEntries(
      chains.map((chain) => [chain.id, rpcTransport(chain.id)]),
    ) as Record<number, ReturnType<typeof http>>;

    return createConfig({
      chains,
      connectors: [
        metaMask({
          dappMetadata: {
            name: 'Lemon Road',
            url: origin,
            iconUrl: `${origin}/icon-512.png`,
          },
        }),
        injected({ target: 'okxWallet' }),
      ],
      transports,
      ssr: false,
    });
  }, []);

  // Do not auto-connect wallets on page load. reconnectOnMount opens MetaMask without user input.
  return (
    <WagmiProvider config={config} reconnectOnMount={false}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}
