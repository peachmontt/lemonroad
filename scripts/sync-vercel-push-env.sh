#!/usr/bin/env bash
# Push VAPID keys from .env.local (or .env) to the lemonroad Vercel project.
# Required for daily-rewards cron push + client subscribe (VITE_VAPID_PUBLIC_KEY).
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

VERCEL_PROJECT_NAME="lemonroad"
ENV_FILE=".env.local"
[[ -f "$ENV_FILE" ]] || ENV_FILE=".env"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Error: .env.local or .env not found."
  echo "Generate keys: npx web-push generate-vapid-keys"
  echo "Then set VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VITE_VAPID_PUBLIC_KEY in $ENV_FILE"
  exit 1
fi

read_env() {
  local key="$1"
  grep "^${key}=" "$ENV_FILE" | cut -d= -f2- | tr -d '"' | tr -d '\n'
}

VAPID_PUBLIC_KEY="$(read_env VAPID_PUBLIC_KEY)"
VAPID_PRIVATE_KEY="$(read_env VAPID_PRIVATE_KEY)"
VAPID_SUBJECT="$(read_env VAPID_SUBJECT)"
VITE_VAPID_PUBLIC_KEY="$(read_env VITE_VAPID_PUBLIC_KEY)"

if [[ -z "${VAPID_PUBLIC_KEY:-}" || -z "${VAPID_PRIVATE_KEY:-}" ]]; then
  echo "Error: VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY required in $ENV_FILE"
  exit 1
fi

if [[ -z "${VITE_VAPID_PUBLIC_KEY:-}" ]]; then
  VITE_VAPID_PUBLIC_KEY="$VAPID_PUBLIC_KEY"
fi

if [[ -z "${VAPID_SUBJECT:-}" ]]; then
  VAPID_SUBJECT="mailto:hello@lemonroad.xyz"
fi

VERCEL_CLI_TOKEN="${VERCEL_TOKEN:-}"
TOKEN_ARGS=()
if [[ -n "${VERCEL_CLI_TOKEN}" ]]; then
  TOKEN_ARGS=(--token "${VERCEL_CLI_TOKEN}")
elif ! npx vercel@latest whoami >/dev/null 2>&1; then
  echo "Error: run 'npx vercel login' or export VERCEL_TOKEN"
  exit 1
fi

echo "Linking to Vercel project: ${VERCEL_PROJECT_NAME}"
npx vercel@latest link --project "${VERCEL_PROJECT_NAME}" --yes "${TOKEN_ARGS[@]}"

upsert_env() {
  local name="$1"
  local value="$2"
  local env="$3"
  local sensitive="${4:-false}"
  echo "Setting ${name} for ${env}..."
  npx vercel@latest env rm "${name}" "${env}" -y "${TOKEN_ARGS[@]}" 2>/dev/null || true
  local -a add_args=(env add "${name}" "${env}")
  if [[ "$sensitive" == "true" ]]; then
    add_args+=(--sensitive)
  fi
  printf '%s' "${value}" | npx vercel@latest "${add_args[@]}" -y "${TOKEN_ARGS[@]}"
}

TARGETS="${VERCEL_ENV_TARGETS:-production development}"
for target in $TARGETS; do
  echo ""
  echo "=== $target ==="
  upsert_env VAPID_PUBLIC_KEY "${VAPID_PUBLIC_KEY}" "${target}"
  # Vercel only allows --sensitive on production/preview
  if [[ "$target" == "development" ]]; then
    upsert_env VAPID_PRIVATE_KEY "${VAPID_PRIVATE_KEY}" "${target}"
  else
    upsert_env VAPID_PRIVATE_KEY "${VAPID_PRIVATE_KEY}" "${target}" true
  fi
  upsert_env VAPID_SUBJECT "${VAPID_SUBJECT}" "${target}"
  upsert_env VITE_VAPID_PUBLIC_KEY "${VITE_VAPID_PUBLIC_KEY}" "${target}"
done

echo ""
echo "Done. Redeploy production so VITE_VAPID_PUBLIC_KEY is baked into the build:"
echo "  npx vercel@latest --prod"
