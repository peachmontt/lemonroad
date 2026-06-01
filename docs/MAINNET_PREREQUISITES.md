# Mainnet prerequisites

Complete before `npm run deploy:mainnet` and production paid mode.

## Wallets

| Wallet | Purpose | Fund with |
|--------|---------|-----------|
| Admin / deploy | `anchor deploy` + `init-pool` | ~3+ **SOL** (mainnet) |
| Crank (`CRANK_KEYPAIR`) | Per-claim Solana `crank_payout` txs | Ongoing **SOL** |
| EVM vault (`POOL_EVM_VAULT`) | Receives 1 USDT per paid run | N/A (receives USDT) |
| EVM vault signer (`EVM_VAULT_PRIVATE_KEY`) | Sends USDT on EVM claims | **MATIC** (Polygon) / **ETH** (Ethereum) for gas |

## RPC URLs (paid recommended)

- `SOLANA_RPC_URL` / `VITE_SOLANA_RPC_URL` — Helius, QuickNode, or Triton mainnet
- `EVM_RPC_URL` or `VITE_EVM_RPC_URL_POLYGON` — Polygon mainnet
- `VITE_EVM_RPC_URL_ETHEREUM` — Ethereum mainnet (if `EVM_CHAIN_ID=1`)

## EVM vault

Set `POOL_EVM_VAULT` and `VITE_EVM_VAULT_ADDRESS` to the address that receives USDT on the active chain (`EVM_CHAIN_ID`):

- **137** Polygon: `0xc2132D05D31c914a87C6611C10748AEb04B58e8F` (USDT)
- **1** Ethereum: `0xdAC17F958D2ee523a2206206994597C13D831ec7` (USDT)

Set `EVM_VAULT_PRIVATE_KEY` to the private key that **controls** `POOL_EVM_VAULT` (used only server-side for EVM claim payouts).

## Degen payout flow (claim-based)

1. Players deposit 1 USDT per Degen run (Solana program or EVM transfer).
2. Daily cron **finalizes** the previous game day (`/api/cron/finalize-degen-pool`) — computes winners and writes `CLAIMABLE` rows in the DB. **No batch vault drain.**
3. Winners open **Lemon Club → Degen Claims** and claim when ready:
   - **Solana**: server crank calls program `crank_payout` (one recipient per claim).
   - **EVM**: server sends USDT from the vault wallet via `EVM_VAULT_PRIVATE_KEY`.

## Phase 0 checklist

- [ ] Neon `DATABASE_URL` + `DIRECT_URL` on Vercel
- [ ] `IP_HASH_SALT`, `CRON_SECRET`, `ADMIN_PASSWORD`
- [ ] Run migrations: `npx prisma migrate deploy`
- [ ] Verify: `GET /api/health` returns `ok: true`

## Deploy order

1. Upgrade Anchor program (includes `crank_payout`): `bash scripts/deploy-mainnet.sh` (type `YES`)
2. `bash scripts/sync-vercel-paid-env.sh` (includes `EVM_VAULT_PRIVATE_KEY` as sensitive)
3. `npm run vercel:link` then redeploy production
4. Confirm cron hits `/api/cron/finalize-degen-pool` (not legacy batch settle)

## Devnet testing

```bash
npm run deploy:devnet   # program upgrade with crank_payout
npx prisma migrate deploy
# finalize a test day via admin or cron, then claim in Lemon Club
```
