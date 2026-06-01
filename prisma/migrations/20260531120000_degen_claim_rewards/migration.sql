-- CreateEnum
CREATE TYPE "PrizePayoutStatus" AS ENUM ('CLAIMABLE', 'PAID', 'EXPIRED');

-- AlterTable
ALTER TABLE "hourly_pools" ADD COLUMN "finalized_at" TIMESTAMP(3);

UPDATE "hourly_pools" SET "finalized_at" = "settled_at" WHERE "settled_at" IS NOT NULL;

-- AlterTable
ALTER TABLE "game_runs" ADD COLUMN "payment_chain" TEXT NOT NULL DEFAULT 'solana';

-- AlterTable
ALTER TABLE "prize_payouts" ADD COLUMN "status" "PrizePayoutStatus" NOT NULL DEFAULT 'CLAIMABLE';
ALTER TABLE "prize_payouts" ADD COLUMN "payment_chain" TEXT NOT NULL DEFAULT 'solana';
ALTER TABLE "prize_payouts" ADD COLUMN "player_id" TEXT;
ALTER TABLE "prize_payouts" ADD COLUMN "claimed_at" TIMESTAMP(3);
ALTER TABLE "prize_payouts" ADD COLUMN "claim_tx" TEXT;

UPDATE "prize_payouts"
SET "status" = 'PAID', "claim_tx" = "tx_signature", "claimed_at" = NOW()
WHERE "tx_signature" IS NOT NULL;

CREATE INDEX "prize_payouts_player_id_status_idx" ON "prize_payouts"("player_id", "status");
