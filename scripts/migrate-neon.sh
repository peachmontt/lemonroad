#!/usr/bin/env bash
# Run Prisma migrations against a Neon (or any Postgres) DATABASE_URL.
# Usage:
#   DATABASE_URL="postgresql://..." bash scripts/migrate-neon.sh
#   or: just set DATABASE_URL in .env and run npm run db:migrate
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if [[ -z "${DATABASE_URL:-}" ]]; then
  if [[ -f .env ]]; then
    export DATABASE_URL
    DATABASE_URL=$(grep '^DATABASE_URL=' .env | cut -d= -f2- | tr -d '"')
  fi
fi

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "Error: DATABASE_URL is not set."
  echo "Set it in .env or export it before running this script:"
  echo '  export DATABASE_URL="postgresql://user:pass@host/db?sslmode=require"'
  exit 1
fi

if [[ -z "${DIRECT_URL:-}" ]]; then
  if [[ -f .env ]]; then
    DIRECT_URL=$(grep '^DIRECT_URL=' .env | cut -d= -f2- | tr -d '"' || true)
    export DIRECT_URL
  fi
fi

if [[ -z "${DIRECT_URL:-}" ]]; then
  echo "Warning: DIRECT_URL not set; using DATABASE_URL for migrations."
  echo "For Neon/Supabase, set DIRECT_URL to the non-pooled host for prisma migrate."
  export DIRECT_URL="${DATABASE_URL}"
fi

echo "Running migrations against: ${DATABASE_URL%%@*}@***"
npx prisma migrate deploy
echo "✅ Migrations applied."
