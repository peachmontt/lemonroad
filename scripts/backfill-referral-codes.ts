import { PrismaClient } from '@prisma/client';
import { generateUniqueReferralCode } from '../api/_lib/referrals';

const prisma = new PrismaClient();

async function main() {
  const players = await prisma.player.findMany({
    where: { referralCode: null },
    select: { id: true },
  });

  console.log(`Backfilling referral codes for ${players.length} players…`);

  for (const player of players) {
    const code = await generateUniqueReferralCode();
    await prisma.player.update({
      where: { id: player.id },
      data: { referralCode: code },
    });
  }

  console.log('Done.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
