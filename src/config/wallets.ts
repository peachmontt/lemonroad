import { EVM_CHAIN_ID, EVM_CHAIN_NAME } from './evm';
import { solanaClusterLabel } from './explorer';

/** Solana wallets registered in WalletProvider */
export const SOLANA_WALLET_NAMES = ['Phantom', 'Solflare'] as const;

/** EVM wallets (wagmi connectors) */
export const EVM_WALLET_NAMES = ['MetaMask', 'OKX Wallet'] as const;

export type EvmWalletKind = 'metamask' | 'okx';

export function solanaWalletsLabel(): string {
  return 'Phantom or Solflare';
}

export function evmWalletLabel(kind: EvmWalletKind): string {
  return kind === 'okx' ? 'OKX Wallet' : 'MetaMask';
}

export function solanaPaymentHint(): string {
  const cluster = solanaClusterLabel();
  return `USDT on Solana${cluster === 'Mainnet' ? '' : ` (${cluster})`}`;
}

export function evmPaymentHint(): string {
  const chain = EVM_CHAIN_NAME[EVM_CHAIN_ID] ?? 'EVM';
  return `USDT on ${chain}`;
}

export const ACCEPTED_WALLETS_SUMMARY =
  'Phantom, Solflare (Solana); MetaMask and OKX Wallet (USDT on Polygon or Ethereum, per server config).';
