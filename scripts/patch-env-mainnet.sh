#!/usr/bin/env bash
# Patch .env for mainnet defaults (no on-chain deploy). Run deploy:mainnet after funding mainnet SOL.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$ROOT/.env"
[[ -f "$ENV_FILE" ]] || { echo "Missing .env"; exit 1; }

patch_env() {
  local key="$1"
  local val="$2"
  if grep -q "^${key}=" "$ENV_FILE"; then
    sed -i "s|^${key}=.*|${key}=\"${val}\"|" "$ENV_FILE"
  else
    echo "${key}=\"${val}\"" >> "$ENV_FILE"
  fi
}

patch_env CLUSTER "mainnet-beta"
patch_env SOLANA_RPC_URL "https://api.mainnet-beta.solana.com"
patch_env VITE_SOLANA_RPC_URL "https://api.mainnet-beta.solana.com"
patch_env VITE_SOLANA_CLUSTER "mainnet-beta"
patch_env USDT_MINT "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB"
patch_env VITE_USDT_MINT "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB"
patch_env EVM_CHAIN_ID "137"
patch_env VITE_EVM_CHAIN_ID "137"

echo "Patched $ENV_FILE for mainnet."
echo "Next: fund deploy wallet with mainnet SOL, then: npm run deploy:mainnet"
