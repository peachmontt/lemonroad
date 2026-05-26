#!/usr/bin/env bash
# Push DATABASE_URL (pooled) and DIRECT_URL (direct) to the lemonroad Vercel project only.
# Production: https://www.lemonroad.xyz (peachmontt/lemonroad)
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

VERCEL_PROJECT_NAME="lemonroad"

VERCEL_CLI_TOKEN="${VERCEL_TOKEN:-}"
TOKEN_ARGS=()
if [[ -n "${VERCEL_CLI_TOKEN}" ]]; then
  TOKEN_ARGS=(--token "${VERCEL_CLI_TOKEN}")
elif ! vercel whoami >/dev/null 2>&1; then
  echo "Error: expired 'vercel login' session. Use either:"
  echo "  export VERCEL_TOKEN=vcp_...   # from https://vercel.com/account/tokens"
  echo "  vercel login"
  exit 1
fi

echo "Linking to Vercel project: ${VERCEL_PROJECT_NAME}"
npx vercel@latest link --project "${VERCEL_PROJECT_NAME}" --yes "${TOKEN_ARGS[@]}"

if [[ ! -f .env ]]; then
  echo "Error: .env not found."
  exit 1
fi

read_env() {
  local key="$1"
  grep "^${key}=" .env | cut -d= -f2- | tr -d '"' | tr -d '\n'
}

DATABASE_URL="$(read_env DATABASE_URL)"
DIRECT_URL="$(read_env DIRECT_URL)"

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "Error: DATABASE_URL missing in .env"
  exit 1
fi

if [[ -z "${DIRECT_URL:-}" ]]; then
  echo "Error: DIRECT_URL missing in .env"
  exit 1
fi

if [[ "${DATABASE_URL}" != *pooler* ]]; then
  echo "Warning: DATABASE_URL does not look pooled (expected Neon *-pooler* host)."
fi

if [[ "${DIRECT_URL}" == *pooler* ]]; then
  echo "Error: DIRECT_URL must be the non-pooled Neon host."
  exit 1
fi

upsert_env() {
  local name="$1"
  local value="$2"
  local env="$3"
  echo "Setting ${name} for ${env}..."
  npx vercel@latest env rm "${name}" "${env}" -y "${TOKEN_ARGS[@]}" 2>/dev/null || true
  printf '%s' "${value}" | npx vercel@latest env add "${name}" "${env}" "${TOKEN_ARGS[@]}"
}

for target in production preview development; do
  upsert_env DATABASE_URL "${DATABASE_URL}" "${target}"
  upsert_env DIRECT_URL "${DIRECT_URL}" "${target}"
done

echo ""
echo "Done (${VERCEL_PROJECT_NAME}). Redeploy production:"
echo "  npx vercel@latest --prod \${VERCEL_TOKEN:+--token \"\$VERCEL_TOKEN\"}"
echo ""
echo "Do not use the accidental 'lemonroad_site' project — delete it in the Vercel dashboard if it exists."
