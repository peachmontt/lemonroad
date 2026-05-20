# Lemon Road

Vite + React game with **Vercel serverless API**, **Postgres** (run history, display names), and optional **Solana** paid mode (1 USDT per attempt, hourly prize pool).

## Quick local enable (database + API + UI)

1. **Install** Node 20+ and Docker (for local Postgres).

2. **Bootstrap DB** (creates `.env` from `.env.example`, starts Postgres, runs migrations):

   ```bash
   chmod +x scripts/bootstrap-local.sh
   ./scripts/bootstrap-local.sh
   ```

3. **Secrets in `.env`** (required for sessions / cron):

   - `IP_HASH_SALT` — random string (e.g. `openssl rand -hex 32`)
   - `CRON_SECRET` — random string (for manual cron tests; Vercel injects the same when configured)

4. **Run app + API** (single command; needs [Vercel CLI](https://vercel.com/docs/cli) and a one-time `vercel link` in this repo):

   ```bash
   npm install
   vercel link
   npm run dev:stack
   ```

   Or two terminals:

   ```bash
   vercel dev          # API on :3000
   npm run dev         # Vite on :5173, proxies /api → :3000
   ```

5. Open **http://localhost:5173** — free runs save after death; rename in the top bar; paid mode needs wallet + devnet USDT (see below).

### Local `DATABASE_URL` (Docker default)

If you use the included `docker-compose.yml` and did not override `DATABASE_URL`:

```text
postgresql://lemonroad:lemonroad@localhost:5432/lemonroad?schema=public
```

Put that in `.env` after `bootstrap-local.sh`, or export it before `npm run db:migrate`.

---

## Production (Vercel + Neon)

1. Create a **Neon** Postgres database and add `DATABASE_URL` to the Vercel project.
2. Add **`IP_HASH_SALT`** (long random) and **`CRON_SECRET`** (Vercel cron uses `Authorization: Bearer <CRON_SECRET>`).
3. Deploy; run migrations once against production DB:

   ```bash
   DATABASE_URL="postgresql://..." npm run db:migrate
   ```

4. **Cron** is defined in `vercel.json` (`/api/cron/settle-hour` at minute 5 each hour). On Hobby, confirm cron availability in Vercel docs for your plan.

---

## Paid mode (Solana)

| Variable | Where | Purpose |
|----------|--------|---------|
| `SOLANA_RPC_URL` | Server | RPC for verifying deposits / settlement |
| `USDT_MINT` | Server | SPL mint (6 decimals) |
| `PROGRAM_ID` | Server | Deployed Anchor program (optional if using fallback) |
| `POOL_VAULT_OWNER` | Server | Wallet pubkey that owns the pool USDT ATA (fallback when no program) |
| `CRANK_KEYPAIR` | Server | JSON array or base58 secret for `settle_hour` (keep off git) |
| `VITE_SOLANA_RPC_URL`, `VITE_SOLANA_CLUSTER`, `VITE_PROGRAM_ID`, `VITE_USDT_MINT` | Build | Frontend |

Anchor program lives under `programs/lemonroad-pool/`. From that directory (with Anchor + Rust installed):

```bash
anchor build
anchor deploy --provider.cluster devnet
```

Then set `PROGRAM_ID` / `VITE_PROGRAM_ID` to the deployed address and run program `initialize` once (admin + vault setup).

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Vite only (expects API at proxy or `VITE_API_BASE`) |
| `npm run dev:api` | `vercel dev` — API + Prisma |
| `npm run dev:stack` | Postgres (if not up) + `vercel dev` + Vite |
| `npm run build` | `prisma generate` + `tsc` + Vite production build |
| `npm run db:migrate` | `prisma migrate deploy` |

---

## Security notes

- **Client distance** can be spoofed until you add server-side validation; paid runs are gated by verified 1 USDT deposits only.
- Never commit `.env` or `CRANK_KEYPAIR` to git.

---

## License

Private project (`package.json`).
