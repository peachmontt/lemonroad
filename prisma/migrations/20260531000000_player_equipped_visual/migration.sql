-- Lemon Club equipped badge / skin shown on leaderboards
ALTER TABLE "players" ADD COLUMN "selected_badge" TEXT;
ALTER TABLE "players" ADD COLUMN "selected_skin" TEXT;
