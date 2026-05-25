#!/usr/bin/env bash
# Full devnet deploy + pool initialize.
# Run once after cloning, or re-run after Anchor program changes.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "=== 1/6  Check tools ==="
command -v solana >/dev/null 2>&1 || { echo "Install Solana CLI: https://docs.solana.com/cli/install"; exit 1; }
command -v anchor >/dev/null 2>&1 || {
  echo ""
  echo "Anchor CLI not found. Install it with:"
  echo "  cargo install --git https://github.com/coral-xyz/anchor avm --locked"
  echo "  avm install 0.30.1 && avm use 0.30.1"
  echo ""
  echo "Also requires Rust: https://rustup.rs/"
  exit 1
}
command -v node >/dev/null 2>&1 || { echo "Install Node 20+"; exit 1; }
echo "  solana $(solana --version)"
echo "  anchor  $(anchor --version)"
echo "  node    $(node --version)"

echo ""
echo "=== 2/6  Switch to devnet ==="
solana config set --url devnet
solana config set --commitment confirmed

echo ""
echo "=== 3/6  Fund admin wallet (airdrop) ==="
ADMIN_PUBKEY=$(solana address)
echo "Admin: $ADMIN_PUBKEY"
solana airdrop 2 "$ADMIN_PUBKEY" || echo "(airdrop may fail if already funded)"
sleep 3
echo "Balance: $(solana balance)"

echo ""
echo "=== 4/6  Build & deploy Anchor program ==="
cd programs/lemonroad-pool

# Pin deps so Solana's bundled Rust/Cargo 1.75 can parse the lockfile.
# Cargo 1.95 resolves newer crates that use edition2024, which Rust 1.75 cannot handle.
fix_cargo_lock_for_sbf() {
  if [[ ! -f Cargo.lock ]] || grep -q "^version = 4" Cargo.lock 2>/dev/null; then
    RUSTUP_TOOLCHAIN=1.75.0 cargo generate-lockfile
  fi
  RUSTUP_TOOLCHAIN=1.75.0 cargo update -p blake3 --precise 1.5.0 2>/dev/null || true
  RUSTUP_TOOLCHAIN=1.75.0 cargo update -p borsh@1.6.1 --precise 1.5.1 2>/dev/null || true
  RUSTUP_TOOLCHAIN=1.75.0 cargo update -p proc-macro-crate@3.5.0 --precise 3.1.0 2>/dev/null || true
  RUSTUP_TOOLCHAIN=1.75.0 cargo update -p cc --precise 1.0.83 2>/dev/null || true
  RUSTUP_TOOLCHAIN=1.75.0 cargo update -p jobserver --precise 0.1.26 2>/dev/null || true
  RUSTUP_TOOLCHAIN=1.75.0 cargo update -p indexmap --precise 2.2.6 2>/dev/null || true
  RUSTUP_TOOLCHAIN=1.75.0 cargo update -p unicode-segmentation --precise 1.11.0 2>/dev/null || true
}

# Check for incompatible crates and fix if needed
needs_fix=false
[[ ! -f Cargo.lock ]] && needs_fix=true
grep -q "^version = 4" Cargo.lock 2>/dev/null && needs_fix=true
grep -q 'name = "wit-bindgen"' Cargo.lock 2>/dev/null && needs_fix=true
grep -q '"crypto-common 0.2' Cargo.lock 2>/dev/null && needs_fix=true

if [[ "$needs_fix" == "true" ]]; then
  echo "Fixing Cargo.lock for Solana Rust 1.75 (edition2024 incompatible deps)..."
  fix_cargo_lock_for_sbf
fi

# Abort early if lockfile is still incompatible
if ! RUSTUP_TOOLCHAIN=1.75.0 cargo metadata --format-version 1 --locked >/dev/null 2>&1; then
  bad=$(RUSTUP_TOOLCHAIN=1.75.0 cargo metadata --format-version 1 --locked 2>&1 | grep -oP 'failed to parse manifest at `.*/\K[^/]+(?=/Cargo)' | head -1 || echo unknown)
  echo "Error: Cargo.lock still has edition2024-incompatible crate: ${bad}"
  echo "Run: cd programs/lemonroad-pool && RUSTUP_TOOLCHAIN=1.75.0 cargo update -p ${bad%%-*} --precise <older-version>"
  exit 1
fi

# Extract program id from keypair BEFORE first deploy (stable across redeploys)
KEYPAIR_PATH="target/deploy/lemonroad_pool-keypair.json"
if [[ ! -f "$KEYPAIR_PATH" ]]; then
  echo "(keypair not found yet — will be created by anchor build)"
fi

anchor build --no-idl -- -- --locked

# Get the real program id from the keypair file (created by anchor build)
PROGRAM_ID=$(solana address -k "$KEYPAIR_PATH")
echo "Program ID: $PROGRAM_ID"

# Patch declare_id!() in lib.rs and Anchor.toml so the deployed binary matches the keypair
LIB_RS="programs/lemonroad-pool/src/lib.rs"
ANCHOR_TOML="Anchor.toml"
if grep -q 'declare_id!' "$LIB_RS"; then
  sed -i "s|declare_id!(\"[^\"]*\")|declare_id!(\"$PROGRAM_ID\")|" "$LIB_RS"
  sed -i "s|lemonroad_pool = \"[^\"]*\"|lemonroad_pool = \"$PROGRAM_ID\"|g" "$ANCHOR_TOML"
  echo "Patched declare_id!(\"$PROGRAM_ID\") in $LIB_RS and $ANCHOR_TOML"
  # Patch lockfile back to v3 before second build
  sed -i 's/^version = 4$/version = 3/' Cargo.lock 2>/dev/null || true
  # Rebuild with correct ID embedded
  anchor build --no-idl -- -- --locked
fi

# Retry deploy up to 3 times (devnet can drop write transactions)
for attempt in 1 2 3; do
  echo "Deploy attempt $attempt/3..."
  if anchor deploy --provider.cluster devnet; then
    echo "Deployed program: $PROGRAM_ID"
    break
  fi
  if [[ $attempt -lt 3 ]]; then
    echo "Deploy failed, retrying in 10s..."
    sleep 10
  else
    echo "Deploy failed after 3 attempts. Run 'anchor deploy --provider.cluster devnet' to retry manually."
    exit 1
  fi
done
cd "$ROOT"

echo ""
echo "=== 5/6  Initialize pool (one-time) ==="
# Devnet test USDT token (6 decimals), created via: spl-token create-token --decimals 6
: "${USDT_MINT:=tXciLnmNxoKLDbBzWWwGHeBadd58PzDhyXFLvxGwmKA}"
: "${CRANK_PUBKEY:=$(2UtQnhYtCR6wW49dUjkfkMabuir2yFNt47CEBjfFau186CvpSTZtqWbxpmYGkjfwfEbRSTuRV26MhsuyuaQnuaNB)}"

export PROGRAM_ID USDT_MINT CRANK_PUBKEY
export SOLANA_RPC_URL=https://api.devnet.solana.com

# Non-fatal: pool may already be initialized from a prior deploy
npx ts-node --project tsconfig.api.json scripts/init-pool.ts || \
  echo "(init-pool exited non-zero — pool may already be initialized, continuing)"

echo ""
echo "=== 6/6  Patch .env automatically ==="
ENV_FILE="$ROOT/.env"

patch_env() {
  local key="$1"
  local val="${2:-}"
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
patch_env "SOLANA_RPC_URL"        "https://api.devnet.solana.com"
patch_env "VITE_SOLANA_RPC_URL"   "https://api.devnet.solana.com"
patch_env "VITE_SOLANA_CLUSTER"   "devnet"
echo "Patched .env"

echo ""
echo "================================================"
echo " Done! Add these to Vercel env vars:"
echo "================================================"
echo ""
echo "  PROGRAM_ID=$PROGRAM_ID"
echo "  VITE_PROGRAM_ID=$PROGRAM_ID"
echo "  USDT_MINT=$USDT_MINT"
echo "  VITE_USDT_MINT=$USDT_MINT"
echo "  SOLANA_RPC_URL=https://api.devnet.solana.com"
echo "  VITE_SOLANA_RPC_URL=https://api.devnet.solana.com"
echo "  VITE_SOLANA_CLUSTER=devnet"
echo ""
echo "  CRANK_KEYPAIR=$(cat ~/.config/solana/id.json | tr -d '[:space:]')"
echo ""
echo "  ⚠️  CRANK_KEYPAIR is a SECRET — mark it Sensitive in Vercel."
echo "  ⚠️  Fund the crank wallet with devnet SOL for settlement txs:"
echo "      solana airdrop 1 $ADMIN_PUBKEY"
echo ""
echo "  Then redeploy Vercel to bake VITE_* vars into the frontend."
