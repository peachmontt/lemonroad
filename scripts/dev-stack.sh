#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker not found. Install Docker or run Postgres yourself and set DATABASE_URL."
  exit 1
fi

if ! docker compose ps postgres 2>/dev/null | grep -q "running\\|healthy"; then
  echo "Starting Postgres..."
  docker compose up -d postgres
  for i in $(seq 1 30); do
    if docker compose exec -T postgres pg_isready -U lemonroad -d lemonroad >/dev/null 2>&1; then
      break
    fi
    sleep 1
  done
fi

export DATABASE_URL="${DATABASE_URL:-postgresql://lemonroad:lemonroad@localhost:5432/lemonroad?schema=public}"

if [[ ! -f node_modules/.bin/prisma ]]; then
  echo "Run npm install first."
  exit 1
fi

echo "Applying Prisma migrations..."
npx prisma migrate deploy

if ! command -v vercel >/dev/null 2>&1; then
  echo "Vercel CLI not found. Install: npm i -g vercel"
  echo "Then run: vercel dev   (terminal 1)   and   npm run dev   (terminal 2)"
  exit 1
fi

echo "Starting Vercel dev (API) on :3000 and Vite on :5173..."
echo "Press Ctrl+C to stop both."
trap 'kill 0' EXIT
vercel dev -y --listen 127.0.0.1:3000 &
sleep 2
npm run dev -- --host
