# lemonroad-pool (Anchor)

Solana program for USDT vault, per-hour deposits, and crank-settled payouts.

## Prerequisites

- [Rust](https://rustup.rs/)
- [Solana CLI](https://docs.solana.com/cli/install-solana-cli-tools)
- [Anchor](https://www.anchor-lang.com/docs/installation) 0.30.x

## Build

```bash
cd programs/lemonroad-pool
anchor build
```

## Deploy (devnet example)

```bash
anchor deploy --provider.cluster devnet
```

Copy the printed program id into Vercel / `.env` as `PROGRAM_ID` and into the frontend build as `VITE_PROGRAM_ID`.

## Initialize (once per deployment)

You need a small script or Anchor test to call `initialize` with accounts: admin signer, new `GlobalConfig` PDA, USDT mint, vault authority PDA, vault token account, token program, system program. See `programs/lemonroad-pool/src/lib.rs` for the exact account list.

After deploy, update `declare_id!` in `lib.rs` to match your program id and redeploy if required by your workflow.
