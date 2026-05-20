#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if [[ ! -f .env ]]; then
  echo "Creating .env from .env.example — edit DATABASE_URL and secrets before production."
  cp .env.example .env
fi

echo "Starting Postgres (Docker)..."
docker compose up -d postgres

echo "Waiting for Postgres to accept connections..."
for i in $(seq 1 40); do
  if docker compose exec -T postgres pg_isready -U lemonroad -d lemonroad >/dev/null 2>&1; then
    break
  fi
  sleep 1
  if [[ "$i" == 40 ]]; then
    echo "Postgres did not become ready in time."
    exit 1
  fi
done

export DATABASE_URL="${DATABASE_URL:-postgresql://lemonroad:lemonroad@localhost:5432/lemonroad?schema=public}"

echo "Running Prisma migrations..."
npm run db:migrate

echo ""
echo "Done. Next:"
echo "  1. Set IP_HASH_SALT in .env (e.g. openssl rand -hex 32)"
echo "  2. Run API + app:  npm run dev:stack   (or: vercel dev  +  npm run dev)"
echo ""
