/** Shown in the game UI when paid mode is not configured or prepare fails. */
export const PAYMENT_UNAVAILABLE_MESSAGE =
  'Payment is temporarily unavailable. Please try again later.';

/** Logged in dev when server/client paid config is missing. */
export const SOLANA_PAYMENT_DEV_HINT =
  'Solana paid mode: set PROGRAM_ID + VITE_PROGRAM_ID (Anchor program), or POOL_VAULT_OWNER on the API (simple USDT transfer). Also set USDT_MINT / VITE_USDT_MINT and SOLANA_RPC_URL / VITE_SOLANA_RPC_URL.';

export const EVM_PAYMENT_DEV_HINT =
  'EVM paid mode: set POOL_EVM_VAULT on the API and optionally VITE_EVM_VAULT_ADDRESS on the frontend.';
