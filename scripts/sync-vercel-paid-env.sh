#!/usr/bin/env bash
# Push Solana paid-mode env vars from .env to the linked Vercel project (lemonroad).
# Requires: vercel login (valid token) and .vercel/project.json from vercel link.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if [[ ! -f .env ]]; then
  echo "Error: .env not found. Copy .env.example to .env first."
  exit 1
fi

if ! vercel whoami &>/dev/null; then
  echo "Vercel CLI is not logged in. Run:"
  echo "  vercel login"
  echo "Then run this script again."
  exit 1
fi

# shellcheck disable=SC1091
set -a
source <(grep -E '^(PROGRAM_ID|VITE_PROGRAM_ID|USDT_MINT|VITE_USDT_MINT|SOLANA_RPC_URL|VITE_SOLANA_RPC_URL|VITE_SOLANA_CLUSTER|CRANK_KEYPAIR)=' .env | sed 's/\r$//')
set +a

missing=()
[[ -z "${PROGRAM_ID:-}" ]] && missing+=("PROGRAM_ID")
[[ -z "${VITE_PROGRAM_ID:-}" ]] && missing+=("VITE_PROGRAM_ID")
[[ -z "${USDT_MINT:-}" ]] && missing+=("USDT_MINT")
[[ -z "${VITE_USDT_MINT:-}" ]] && missing+=("VITE_USDT_MINT")
[[ -z "${SOLANA_RPC_URL:-}" ]] && missing+=("SOLANA_RPC_URL")
[[ -z "${VITE_SOLANA_RPC_URL:-}" ]] && missing+=("VITE_SOLANA_RPC_URL")
[[ -z "${VITE_SOLANA_CLUSTER:-}" ]] && missing+=("VITE_SOLANA_CLUSTER")

if [[ ${#missing[@]} -gt 0 ]]; then
  echo "Error: missing in .env: ${missing[*]}"
  echo "Run: bash scripts/deploy-devnet.sh"
  exit 1
fi

upsert_env() {
  local key="$1"
  local value="$2"
  local target="$3"
  local sensitive="${4:-false}"

  # Remove existing var in this target (ignore errors if missing)
  vercel env rm "$key" "$target" --yes 2>/dev/null || true

  if [[ "$sensitive" == "true" ]]; then
    printf '%s' "$value" | vercel env add "$key" "$target" --sensitive
  else
    printf '%s' "$value" | vercel env add "$key" "$target"
  fi
  echo "  ✓ $key → $target"
}

echo "Syncing paid-mode env to Vercel project (lemonroad)..."
for target in production preview development; do
  echo ""
  echo "=== $target ==="
  upsert_env "PROGRAM_ID" "$PROGRAM_ID" "$target"
  upsert_env "VITE_PROGRAM_ID" "$VITE_PROGRAM_ID" "$target"
  upsert_env "USDT_MINT" "$USDT_MINT" "$target"
  upsert_env "VITE_USDT_MINT" "$VITE_USDT_MINT" "$target"
  upsert_env "SOLANA_RPC_URL" "$SOLANA_RPC_URL" "$target"
  upsert_env "VITE_SOLANA_RPC_URL" "$VITE_SOLANA_RPC_URL" "$target"
  upsert_env "VITE_SOLANA_CLUSTER" "$VITE_SOLANA_CLUSTER" "$target"
  if [[ -n "${CRANK_KEYPAIR:-}" ]]; then
    upsert_env "CRANK_KEYPAIR" "$CRANK_KEYPAIR" "$target" true
  else
    echo "  ⚠ CRANK_KEYPAIR empty in .env — skipping (hourly settlement disabled)"
  fi
done

echo ""
echo "Done. Redeploy production so VITE_* vars are baked into the frontend:"
echo "  vercel --prod"
echo "Or push to main if Git integration auto-deploys."
