-- CreateEnum
CREATE TYPE "DailyRewardStatus" AS ENUM ('PENDING', 'PAID', 'REJECTED');

-- CreateEnum
CREATE TYPE "DailyLeaderboardStatus" AS ENUM ('PENDING', 'AWARDED', 'REJECTED');

-- AlterTable: add new columns to game_runs
ALTER TABLE "game_runs"
  ADD COLUMN "day_bucket"       TEXT,
  ADD COLUMN "device_type"      TEXT,
  ADD COLUMN "anti_cheat_score" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "is_valid"         BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex for daily game_run lookups
CREATE INDEX "game_runs_mode_day_bucket_distance_idx"
  ON "game_runs" ("mode", "day_bucket", "distance" DESC);

-- CreateTable: daily_leaderboard
CREATE TABLE "daily_leaderboard" (
  "id"           TEXT NOT NULL,
  "date"         DATE NOT NULL,
  "player_id"    TEXT NOT NULL,
  "best_distance" DOUBLE PRECISION NOT NULL,
  "total_runs"   INTEGER NOT NULL DEFAULT 1,
  "position"     INTEGER,
  "reward_status" "DailyLeaderboardStatus" NOT NULL DEFAULT 'PENDING',
  "created_at"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"   TIMESTAMP(3) NOT NULL,

  CONSTRAINT "daily_leaderboard_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "daily_leaderboard_date_player_id_key"
  ON "daily_leaderboard" ("date", "player_id");

CREATE INDEX "daily_leaderboard_date_best_distance_idx"
  ON "daily_leaderboard" ("date", "best_distance" DESC);

CREATE INDEX "daily_leaderboard_date_position_idx"
  ON "daily_leaderboard" ("date", "position");

ALTER TABLE "daily_leaderboard"
  ADD CONSTRAINT "daily_leaderboard_player_id_fkey"
  FOREIGN KEY ("player_id") REFERENCES "players" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: daily_rewards
CREATE TABLE "daily_rewards" (
  "id"             TEXT NOT NULL,
  "date"           DATE NOT NULL,
  "player_id"      TEXT NOT NULL,
  "position"       INTEGER NOT NULL,
  "reward_amount"  TEXT NOT NULL,
  "reward_currency" TEXT NOT NULL,
  "status"         "DailyRewardStatus" NOT NULL DEFAULT 'PENDING',
  "tx_hash"        TEXT,
  "created_at"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"     TIMESTAMP(3) NOT NULL,

  CONSTRAINT "daily_rewards_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "daily_rewards_date_player_id_key"
  ON "daily_rewards" ("date", "player_id");

CREATE INDEX "daily_rewards_date_status_idx"
  ON "daily_rewards" ("date", "status");

ALTER TABLE "daily_rewards"
  ADD CONSTRAINT "daily_rewards_player_id_fkey"
  FOREIGN KEY ("player_id") REFERENCES "players" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: push_subscriptions
CREATE TABLE "push_subscriptions" (
  "id"          TEXT NOT NULL,
  "player_id"   TEXT NOT NULL,
  "endpoint"    TEXT NOT NULL,
  "p256dh"      TEXT NOT NULL,
  "auth"        TEXT NOT NULL,
  "enabled"     BOOLEAN NOT NULL DEFAULT true,
  "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "last_used_at" TIMESTAMP(3),

  CONSTRAINT "push_subscriptions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "push_subscriptions_endpoint_key"
  ON "push_subscriptions" ("endpoint");

CREATE INDEX "push_subscriptions_player_id_enabled_idx"
  ON "push_subscriptions" ("player_id", "enabled");

ALTER TABLE "push_subscriptions"
  ADD CONSTRAINT "push_subscriptions_player_id_fkey"
  FOREIGN KEY ("player_id") REFERENCES "players" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
