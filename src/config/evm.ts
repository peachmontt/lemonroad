/** Chain ID to use for EVM payments (137 = Polygon, 1 = Ethereum) */
export const EVM_CHAIN_ID = Number(import.meta.env.VITE_EVM_CHAIN_ID ?? 137);

const USDT_ADDRESSES: Record<number, `0x${string}`> = {
  1: '0xdAC17F958D2ee523a2206206994597C13D831ec7',   // Ethereum mainnet
  137: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F', // Polygon mainnet
  80002: '0x52D800ca262522580CeBAD275395ca6e7598C014', // Polygon Amoy testnet
};

export const EVM_USDT_ADDRESS: `0x${string}` =
  (USDT_ADDRESSES[EVM_CHAIN_ID] as `0x${string}`) ?? USDT_ADDRESSES[137];

export const EVM_USDT_DECIMALS = 6;

/** Server-controlled vault that receives EVM USDT deposits */
export const EVM_VAULT_ADDRESS = import.meta.env
  .VITE_EVM_VAULT_ADDRESS as `0x${string}` | undefined;

/** 1 USDT in raw units (6 decimals) */
export const EVM_USDT_PER_ATTEMPT = 1_000_000n;

export const EVM_CHAIN_NAME: Record<number, string> = {
  1: 'Ethereum',
  137: 'Polygon',
  80002: 'Polygon Amoy',
};
