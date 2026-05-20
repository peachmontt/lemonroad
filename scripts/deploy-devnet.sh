#!/usr/bin/env bash
# Full devnet deploy + pool initialize.
# Run once after cloning. Re-run after Anchor program changes.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "=== 1/5  Check tools ==="
command -v solana   >/dev/null 2>&1 || { echo "Install Solana CLI: https://docs.solana.com/cli/install"; exit 1; }
command -v anchor   >/dev/null 2>&1 || { echo "Install Anchor CLI: https://www.anchor-lang.com/docs/installation"; exit 1; }
command -v node     >/dev/null 2>&1 || { echo "Install Node 20+"; exit 1; }

echo "=== 2/5  Switch to devnet ==="
solana config set --url devnet
solana config set --commitment confirmed

echo "=== 3/5  Fund admin wallet (airdrop) ==="
ADMIN_PUBKEY=$(solana address)
echo "Admin: $ADMIN_PUBKEY"
solana airdrop 2 "$ADMIN_PUBKEY" || echo "(airdrop may fail if already funded)"
sleep 3
solana balance

echo "=== 4/5  Build & deploy Anchor program ==="
cd programs/lemonroad-pool
anchor build
anchor deploy --provider.cluster devnet

# Extract deployed program id from anchor deploy output
PROGRAM_ID=$(anchor keys list 2>/dev/null | grep lemonroad_pool | awk '{print $2}')
if [[ -z "$PROGRAM_ID" ]]; then
  # Fall back to reading from target/deploy
  PROGRAM_ID=$(solana address -k target/deploy/lemonroad_pool-keypair.json 2>/dev/null || echo "")
fi
if [[ -z "$PROGRAM_ID" ]]; then
  echo "Could not determine deployed program id automatically."
  echo "Run: solana address -k programs/lemonroad-pool/target/deploy/lemonroad_pool-keypair.json"
  echo "Then set PROGRAM_ID= in .env and re-run step 5."
  exit 1
fi
echo "Deployed PROGRAM_ID: $PROGRAM_ID"
cd "$ROOT"

echo "=== 5/5  Initialize pool (one-time) ==="
# Use a devnet test USDC mint if USDT_MINT is not set
: "${USDT_MINT:=4zMMC9srt5Ri5X14GAgXhaHii3GnPEPpGqyejCcJxw4H}"
# Use admin key as crank on devnet (change in production)
: "${CRANK_PUBKEY:=$(solana address)}"

export PROGRAM_ID USDT_MINT CRANK_PUBKEY
export SOLANA_RPC_URL=https://api.devnet.solana.com

npx ts-node --project tsconfig.api.json scripts/init-pool.ts

echo ""
echo "=== Done! ==="
echo "Add to .env (and Vercel env vars):"
echo ""
echo "  PROGRAM_ID=$PROGRAM_ID"
echo "  VITE_PROGRAM_ID=$PROGRAM_ID"
echo "  USDT_MINT=$USDT_MINT"
echo "  VITE_USDT_MINT=$USDT_MINT"
echo "  SOLANA_RPC_URL=https://api.devnet.solana.com"
echo "  VITE_SOLANA_RPC_URL=https://api.devnet.solana.com"
echo "  VITE_SOLANA_CLUSTER=devnet"
