#!/usr/bin/env bash
# Link this repo to the production Vercel project "lemonroad" only.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

VERCEL_PROJECT_NAME="lemonroad"
TOKEN_ARGS=()
if [[ -n "${VERCEL_TOKEN:-}" ]]; then
  TOKEN_ARGS=(--token "${VERCEL_TOKEN}")
fi

npx vercel@latest link --project "${VERCEL_PROJECT_NAME}" --yes "${TOKEN_ARGS[@]}"
echo "Linked to ${VERCEL_PROJECT_NAME} (https://www.lemonroad.xyz)"
