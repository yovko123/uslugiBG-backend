// prisma/seed.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const categories = [
    { name: 'Home Cleaning', description: 'House cleaning and maintenance services' },
    { name: 'Plumbing', description: 'Plumbing installation and repair services' },
    { name: 'Electrical', description: 'Electrical installation and repair services' },
    { name: 'Moving', description: 'Moving and relocation services' },
    { name: 'Gardening', description: 'Garden maintenance and landscaping' },
    { name: 'Painting', description: 'Interior and exterior painting services' },
    { name: 'Handyman', description: 'General repair and maintenance services' },
    { name: 'Construction', description: 'Construction and renovation services' }
  ];

  for (const category of categories) {
    await prisma.category.upsert({
      where: { name: category.name },
      update: {},
      create: category,
    });
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });