#!/usr/bin/env bash
# Wait until admin wallet has >=3 SOL on mainnet, then run deploy-mainnet.sh
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

solana config set --url mainnet-beta >/dev/null
ADMIN=$(solana address)
echo "Admin wallet: $ADMIN"
echo "Send at least 3 SOL on mainnet-beta to this address, then this script continues."
echo ""

MIN_LAMPORTS=3000000000
for i in $(seq 1 120); do
  BAL=$(solana balance --lamports "$ADMIN" 2>/dev/null | awk '{print $1}')
  if [[ "${BAL:-0}" -ge "$MIN_LAMPORTS" ]]; then
    echo "Balance OK ($(solana balance "$ADMIN")). Starting deploy…"
    printf 'YES\n' | bash scripts/deploy-mainnet.sh
    exit $?
  fi
  echo "[$(date +%H:%M:%S)] Waiting for SOL… ($(solana balance "$ADMIN" 2>/dev/null || echo 0))"
  sleep 30
done

echo "Timed out after 60 minutes. Fund $ADMIN and run: npm run deploy:mainnet"
exit 1
