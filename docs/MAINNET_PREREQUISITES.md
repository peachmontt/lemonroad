# Mainnet prerequisites

Complete before `npm run deploy:mainnet` and production paid mode.

## Wallets

| Wallet | Purpose | Fund with |
|--------|---------|-----------|
| Admin / deploy | `anchor deploy` + `init-pool` | ~3+ **SOL** (mainnet) |
| Crank (`CRANK_KEYPAIR`) | Hourly settlement txs | Ongoing **SOL** |
| EVM vault | Receives 1 USDT per paid run | N/A (receives USDT) |
| EVM vault owner | Gas for ops (if needed) | **MATIC** (Polygon) / **ETH** (Ethereum) |

## RPC URLs (paid recommended)

- `SOLANA_RPC_URL` / `VITE_SOLANA_RPC_URL` — Helius, QuickNode, or Triton mainnet
- `EVM_RPC_URL` or `VITE_EVM_RPC_URL_POLYGON` — Polygon mainnet
- `VITE_EVM_RPC_URL_ETHEREUM` — Ethereum mainnet (if `EVM_CHAIN_ID=1`)

## EVM vault

Set `POOL_EVM_VAULT` and `VITE_EVM_VAULT_ADDRESS` to the address that receives USDT on the active chain (`EVM_CHAIN_ID`):

- **137** Polygon: `0xc2132D05D31c914a87C6611C10748AEb04B58e8F` (USDT)
- **1** Ethereum: `0xdAC17F958D2ee523a2206206994597C13D831ec7` (USDT)

## Deploy order

1. `bash scripts/deploy-mainnet.sh` (type `YES`)
2. `bash scripts/sync-vercel-paid-env.sh`
3. `npm run vercel:link` then redeploy production
