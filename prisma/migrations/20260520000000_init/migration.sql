-- CreateTable
CREATE TABLE "players" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "ip_hash" TEXT NOT NULL,
    "wallet_pubkey" TEXT,
    "display_name" TEXT NOT NULL DEFAULT 'Anonymous Lemon',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "players_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "game_runs" (
    "id" TEXT NOT NULL,
    "player_id" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "distance" DOUBLE PRECISION NOT NULL,
    "juice_level" TEXT NOT NULL,
    "citric_velocity" DOUBLE PRECISION NOT NULL,
    "duration_ms" INTEGER NOT NULL,
    "died_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deposit_tx" TEXT,
    "hour_bucket" TEXT,
    "wallet_pubkey" TEXT,

    CONSTRAINT "game_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hourly_pools" (
    "hour_start" TIMESTAMP(3) NOT NULL,
    "participant_count" INTEGER NOT NULL DEFAULT 0,
    "deposited_usdt" BIGINT NOT NULL DEFAULT 0,
    "rollover_in" BIGINT NOT NULL DEFAULT 0,
    "rollover_out" BIGINT NOT NULL DEFAULT 0,
    "settled_at" TIMESTAMP(3),
    "settle_tx" TEXT,

    CONSTRAINT "hourly_pools_pkey" PRIMARY KEY ("hour_start")
);

-- CreateTable
CREATE TABLE "prize_payouts" (
    "id" TEXT NOT NULL,
    "hour_start" TIMESTAMP(3) NOT NULL,
    "place" INTEGER NOT NULL,
    "wallet_pubkey" TEXT NOT NULL,
    "amount_usdt" BIGINT NOT NULL,
    "tx_signature" TEXT,

    CONSTRAINT "prize_payouts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verified_deposits" (
    "tx_signature" TEXT NOT NULL,
    "wallet_pubkey" TEXT NOT NULL,
    "hour_bucket" TEXT NOT NULL,
    "amount_usdt" BIGINT NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "verified_deposits_pkey" PRIMARY KEY ("tx_signature")
);

-- CreateIndex
CREATE UNIQUE INDEX "players_session_id_key" ON "players"("session_id");

-- CreateIndex
CREATE UNIQUE INDEX "players_wallet_pubkey_key" ON "players"("wallet_pubkey");

-- CreateIndex
CREATE INDEX "players_ip_hash_idx" ON "players"("ip_hash");

-- CreateIndex
CREATE INDEX "game_runs_player_id_died_at_idx" ON "game_runs"("player_id", "died_at" DESC);

-- CreateIndex
CREATE INDEX "game_runs_mode_hour_bucket_distance_idx" ON "game_runs"("mode", "hour_bucket", "distance" DESC);

-- CreateIndex
CREATE INDEX "game_runs_deposit_tx_idx" ON "game_runs"("deposit_tx");

-- CreateIndex
CREATE UNIQUE INDEX "prize_payouts_hour_start_place_key" ON "prize_payouts"("hour_start", "place");

-- CreateIndex
CREATE INDEX "verified_deposits_wallet_pubkey_hour_bucket_used_at_idx" ON "verified_deposits"("wallet_pubkey", "hour_bucket", "used_at");

-- AddForeignKey
ALTER TABLE "game_runs" ADD CONSTRAINT "game_runs_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prize_payouts" ADD CONSTRAINT "prize_payouts_hour_start_fkey" FOREIGN KEY ("hour_start") REFERENCES "hourly_pools"("hour_start") ON DELETE CASCADE ON UPDATE CASCADE;
