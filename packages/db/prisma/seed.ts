import { BADGE_DEFINITIONS } from '../src/badges';
import { createPrismaClient } from '../src/client';

const prisma = createPrismaClient();

try {
  for (const badge of BADGE_DEFINITIONS) {
    await prisma.badge.upsert({
      where: { key: badge.key },
      update: { title: badge.title, description: badge.description },
      create: badge,
    });
  }
  console.log(`seeded ${BADGE_DEFINITIONS.length} badges`);
} finally {
  await prisma.$disconnect();
}
