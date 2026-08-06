# Lemon Road
https://www.lemonroad.xyz/

Vite + React game with **Vercel serverless API**, **Postgres** (run history, display names), and optional **Solana** paid mode (1 USDT per attempt, daily degen prize pool).

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

5. Open **http://localhost:5173** — free runs save after death; rename in the top bar; paid mode needs wallet + USDT on the configured cluster (see below).

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

4. **Cron** runs daily at 21:05 GMT+3 via GitHub Actions (`cron-daily.yml`: free rewards + degen pool settle). On Hobby, confirm cron availability in Vercel docs for your plan.

---

## Paid mode (Solana + optional EVM)

Production uses **Solana mainnet-beta** and **Polygon mainnet (137)** by default. See [docs/MAINNET_PREREQUISITES.md](docs/MAINNET_PREREQUISITES.md).

| Variable | Where | Purpose |
|----------|--------|---------|
| `SOLANA_RPC_URL` | Server | Mainnet RPC (paid provider recommended) |
| `USDT_MINT` | Server | Mainnet USDT `Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB` |
| `PROGRAM_ID` | Server | Deployed Anchor program — **or** use `POOL_VAULT_OWNER` instead |
| `POOL_VAULT_OWNER` | Server | Simple USDT transfer mode (no program) |
| `CRANK_KEYPAIR` | Server | Settlement wallet secret (fund with mainnet SOL) |
| `VITE_SOLANA_*`, `VITE_PROGRAM_ID`, `VITE_USDT_MINT` | Build | Must match server; redeploy after changes |
| `EVM_CHAIN_ID`, `POOL_EVM_VAULT`, `EVM_RPC_URL` | Server | Polygon `137` or Ethereum `1` |
| `VITE_EVM_*` | Build | EVM chain + vault for MetaMask |

### Mainnet deploy (production)

```bash
npm run deploy:mainnet    # deploy + init pool (real SOL/USDT)
npm run sync:vercel-paid  # push .env paid vars to Vercel lemonroad
```

### Devnet (local testing only)

```bash
npm run deploy:devnet
```

Anchor program: `programs/lemonroad-pool/`. Set `PROGRAM_ID` / `VITE_PROGRAM_ID` and run `npm run init:pool` once per cluster.

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Vite only (expects API at proxy or `VITE_API_BASE`) |
| `npm run dev:api` | `vercel dev` — API + Prisma |
| `npm run dev:stack` | Postgres (if not up) + `vercel dev` + Vite |
| `npm run build` | `prisma generate` + `tsc` + Vite production build |
| `npm run db:migrate` | `prisma migrate deploy` |
| `npm run deploy:mainnet` | Solana mainnet deploy + pool init |
| `npm run deploy:devnet` | Solana devnet deploy + pool init |
| `npm run sync:vercel-paid` | Sync paid env to Vercel `lemonroad` |

---

## Security notes

- **Client distance** can be spoofed until you add server-side validation; paid runs are gated by verified 1 USDT deposits only.
- Never commit `.env` or `CRANK_KEYPAIR` to git.

---

## License

Private project (`package.json`).
