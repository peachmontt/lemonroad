import { SOLANA_CLUSTER } from './solana';

const IS_SOLANA_MAINNET =
  SOLANA_CLUSTER === 'mainnet-beta' || SOLANA_CLUSTER === 'mainnet';

/** When false, Degen Mode pay/play stays disabled in the UI. */
export const PAID_MODE_ENABLED = false;

/** Shown in paid mode when the wallet is connected but play is not open yet. */
export const PAID_MODE_COMING_SOON_MESSAGE =
  "What's next: Degen Mode is in test mode. Estimated release June 10. Use Free Run until then.";

/** Shown in the game UI when paid mode is not configured or prepare fails. */
export const PAYMENT_UNAVAILABLE_MESSAGE =
  'Payment is temporarily unavailable. Please try again later.';

/** Shown when the on-chain payment succeeded but the server could not persist it. */
export const PAYMENT_SAVE_ERROR_MESSAGE =
  'Payment could not be saved, please try again';

/** Logged in dev when server/client paid config is missing. */
export const SOLANA_PAYMENT_DEV_HINT =
  'Solana paid mode: set PROGRAM_ID + VITE_PROGRAM_ID (Anchor program), or POOL_VAULT_OWNER on the API (simple USDT transfer). Also set USDT_MINT / VITE_USDT_MINT and SOLANA_RPC_URL / VITE_SOLANA_RPC_URL.';

export const EVM_PAYMENT_DEV_HINT =
  'EVM paid mode: set POOL_EVM_VAULT on the API and optionally VITE_EVM_VAULT_ADDRESS on the frontend.';

/** Map wallet/RPC errors to short UI copy (never log secrets). */
export function formatPaymentError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (/unexpected error/i.test(msg)) {
    return IS_SOLANA_MAINNET
      ? 'Wallet could not send the payment. Use Solana Mainnet in Phantom, keep some SOL for fees, and ensure you have 1 USDT.'
      : 'Wallet could not send the payment. Use Solana Devnet in Phantom, keep some SOL for fees, and ensure you have 1 test USDT.';
  }
  if (/user rejected|rejected the request|transaction cancelled/i.test(msg)) {
    return 'Payment cancelled in wallet.';
  }
  if (/insufficient funds|insufficient lamports/i.test(msg)) {
    return 'Not enough SOL for fees or USDT for the 1 USDT payment.';
  }
  if (/blockhash not found|expired/i.test(msg)) {
    return 'Network timed out — please try again.';
  }
  if (/simulation failed|custom program error|0x1/i.test(msg)) {
    return IS_SOLANA_MAINNET
      ? 'On-chain payment failed. Ensure you have 1 USDT and are on Solana Mainnet.'
      : 'On-chain payment failed. Ensure you have test USDT and are on devnet.';
  }
  if (msg.includes('Payment could not be saved')) {
    return PAYMENT_SAVE_ERROR_MESSAGE;
  }
  if (msg.length > 0 && msg.length <= 140) {
    return msg;
  }
  return PAYMENT_UNAVAILABLE_MESSAGE;
}
