/** Polygon Amoy testnet — default for dev/test deployments */
export const EVM_CHAIN_ID = Number(import.meta.env.VITE_EVM_CHAIN_ID ?? 80002);

const USDT_ADDRESSES: Record<number, `0x${string}`> = {
  1: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
  137: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
  80002: '0x52D800ca262522580CeBAD275395ca6e7598C014',
};

export const EVM_USDT_ADDRESS: `0x${string}` =
  (USDT_ADDRESSES[EVM_CHAIN_ID] as `0x${string}`) ?? USDT_ADDRESSES[80002];

export const EVM_USDT_DECIMALS = 6;

export const EVM_VAULT_ADDRESS = import.meta.env
  .VITE_EVM_VAULT_ADDRESS as `0x${string}` | undefined;

export const EVM_USDT_PER_ATTEMPT = 1_000_000n;

export const EVM_CHAIN_NAME: Record<number, string> = {
  1: 'Ethereum',
  137: 'Polygon',
  80002: 'Polygon Amoy (testnet)',
};
