#!/usr/bin/env bash
# Mainnet-beta deploy + pool initialize.
# Run AFTER testing everything on devnet first.
# ⚠️  Real SOL and real USDT — triple-check before running.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "=== 1/6  Check tools ==="
command -v solana >/dev/null 2>&1 || { echo "Install Solana CLI: https://docs.solana.com/cli/install"; exit 1; }
command -v anchor >/dev/null 2>&1 || {
  echo "Anchor CLI not found. Install: cargo install --git https://github.com/coral-xyz/anchor avm --locked && avm install 0.30.1 && avm use 0.30.1"
  exit 1
}
command -v node >/dev/null 2>&1 || { echo "Install Node 20+"; exit 1; }

echo "  solana $(solana --version)"
echo "  anchor  $(anchor --version)"

echo ""
echo "=== 2/6  Switch to mainnet-beta ==="
solana config set --url mainnet-beta
solana config set --commitment confirmed

ADMIN_PUBKEY=$(solana address)
echo "Admin wallet: $ADMIN_PUBKEY"
BALANCE=$(solana balance --lamports | awk '{print $1}')
if [[ "$BALANCE" -lt 3000000000 ]]; then
  echo "⚠️  Admin wallet has less than 3 SOL. Deploy + init costs ~2-3 SOL."
  echo "    Fund it before continuing. Exiting."
  exit 1
fi
echo "Balance: $(solana balance)"

echo ""
echo "=== 3/6  Confirm mainnet deployment ==="
echo ""
echo "  ⚠️  You are about to deploy to MAINNET-BETA."
echo "  ⚠️  This uses REAL SOL and will accept REAL USDT."
echo ""
read -r -p "Type YES to continue: " confirm
if [[ "$confirm" != "YES" ]]; then
  echo "Aborted."
  exit 0
fi

echo ""
echo "=== 4/6  Build & deploy Anchor program ==="
cd programs/lemonroad-pool

KEYPAIR_PATH="target/deploy/lemonroad_pool-keypair.json"

anchor build

PROGRAM_ID=$(solana address -k "$KEYPAIR_PATH")
echo "Program ID: $PROGRAM_ID"

# Patch declare_id!() so the binary matches the keypair
LIB_RS="programs/lemonroad-pool/src/lib.rs"
if grep -q 'declare_id!' "$LIB_RS"; then
  sed -i "s|declare_id!(\"[^\"]*\")|declare_id!(\"$PROGRAM_ID\")|" "$LIB_RS"
  echo "Patched declare_id!(\"$PROGRAM_ID\") in $LIB_RS"
  anchor build
fi

anchor deploy --provider.cluster mainnet-beta
echo "Deployed program: $PROGRAM_ID"
cd "$ROOT"

echo ""
echo "=== 5/6  Initialize pool (one-time) ==="
# Real USDT on Solana mainnet:
: "${USDT_MINT:=Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB}"
# Crank pubkey — this wallet must hold mainnet SOL for settlement txs
: "${CRANK_PUBKEY:=$(solana address)}"
: "${SOLANA_RPC_URL:=https://api.mainnet-beta.solana.com}"

export PROGRAM_ID USDT_MINT CRANK_PUBKEY SOLANA_RPC_URL

npx ts-node --project tsconfig.api.json scripts/init-pool.ts

echo ""
echo "=== 6/6  Patch .env automatically ==="
ENV_FILE="$ROOT/.env"

patch_env() {
  local key="$1"
  local val="$2"
  if grep -q "^${key}=" "$ENV_FILE"; then
    sed -i "s|^${key}=.*|${key}=\"${val}\"|" "$ENV_FILE"
  else
    echo "${key}=\"${val}\"" >> "$ENV_FILE"
  fi
}

patch_env "PROGRAM_ID"            "$PROGRAM_ID"
patch_env "VITE_PROGRAM_ID"       "$PROGRAM_ID"
patch_env "USDT_MINT"             "$USDT_MINT"
patch_env "VITE_USDT_MINT"        "$USDT_MINT"
patch_env "SOLANA_RPC_URL"        "$SOLANA_RPC_URL"
patch_env "VITE_SOLANA_RPC_URL"   "$SOLANA_RPC_URL"
patch_env "VITE_SOLANA_CLUSTER"   "mainnet-beta"
echo "Patched .env"

echo ""
echo "================================================"
echo " Mainnet deploy complete! Add these to Vercel:"
echo "================================================"
echo ""
echo "  PROGRAM_ID=$PROGRAM_ID"
echo "  VITE_PROGRAM_ID=$PROGRAM_ID"
echo "  USDT_MINT=$USDT_MINT"
echo "  VITE_USDT_MINT=$USDT_MINT"
echo "  SOLANA_RPC_URL=$SOLANA_RPC_URL"
echo "  VITE_SOLANA_RPC_URL=$SOLANA_RPC_URL"
echo "  VITE_SOLANA_CLUSTER=mainnet-beta"
echo ""
echo "  CRANK_KEYPAIR=$(cat ~/.config/solana/id.json | tr -d '[:space:]')"
echo ""
echo "  ⚠️  CRANK_KEYPAIR is a SECRET — mark it Sensitive in Vercel."
echo "  ⚠️  The crank wallet must hold MAINNET SOL for settlement txs."
echo "  ⚠️  Replace SOLANA_RPC_URL with a paid RPC (Helius/QuickNode)"
echo "      for reliable production performance."
echo ""
echo "  Redeploy Vercel to bake VITE_* vars into the frontend."
