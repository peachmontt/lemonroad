import { PrismaClient } from '@prisma/client';
import { LEMON_XP_PER_DISTANCE } from '../api/_lib/lemon-xp';

const prisma = new PrismaClient();
const divisor = LEMON_XP_PER_DISTANCE;

async function main() {
  const aggregates = await prisma.$queryRaw<
    { player_id: string; total_xp: number }[]
  >`
    SELECT
      gr.player_id,
      COALESCE(SUM(FLOOR(gr.distance / ${divisor})), 0)::int AS total_xp
    FROM game_runs gr
    WHERE gr.is_valid = true
    GROUP BY gr.player_id
  `;

  console.log(`Backfilling lemon_xp for ${aggregates.length} players with valid runs…`);

  let updated = 0;
  for (const row of aggregates) {
    await prisma.player.update({
      where: { id: row.player_id },
      data: { lemonXp: row.total_xp },
    });
    updated += 1;
  }

  let resetCount = 0;
  if (aggregates.length > 0) {
    const zeroed = await prisma.player.updateMany({
      where: {
        id: { notIn: aggregates.map((r) => r.player_id) },
        lemonXp: { not: 0 },
      },
      data: { lemonXp: 0 },
    });
    resetCount = zeroed.count;
  }

  console.log(`Updated ${updated} players; reset ${resetCount} others to 0.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
