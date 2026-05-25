-- Add payment_chain to support Solana and EVM verified deposits
ALTER TABLE "verified_deposits"
  ADD COLUMN "payment_chain" TEXT NOT NULL DEFAULT 'solana';
