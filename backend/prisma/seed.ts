import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash('Admin@1234', 10);

  const admin = await prisma.admin.upsert({
    where: { email: 'admin@ggallery.com' },
    update: {},
    create: {
      name: 'Super Admin',
      email: 'admin@ggallery.com',
      password: hashedPassword,
      role: 'admin',
    },
  });

  console.log('✅ Admin seeded:', admin);

  const collectorPassword = await bcrypt.hash('Collector@1234', 10);
  const collector = await prisma.collector.upsert({
    where: { email: 'collector@ggallery.com' },
    update: {},
    create: {
      name: 'Sample Collector',
      email: 'collector@ggallery.com',
      password: collectorPassword,
      phone: '+1234567890',
      address: '123 Art Avenue',
    },
  });

  console.log('✅ Collector seeded:', collector);

  const exhibitorPassword = await bcrypt.hash('Exhibitor@1234', 10);

  // 3 Exhibitors with 1 Painting each
  for (let i = 1; i <= 3; i++) {
    await prisma.exhibitor.upsert({
      where: { email: `exhibitor${i}@ggallery.com` },
      update: { password: exhibitorPassword },
      create: {
        name: `Exhibitor ${i} (Painting)`,
        email: `exhibitor${i}@ggallery.com`,
        password: exhibitorPassword,
        artworks: {
          create: [{
            title: `Masterpiece ${i}`,
            type: 'painting',
            price: 1500 * i,
            status: 'Available',
            attributes: { medium: 'Oil', canvasType: 'Linen', height: 80, width: 60 },
          }]
        }
      }
    });
  }

  // 2 Exhibitors with 1 Sculpture each
  for (let i = 4; i <= 5; i++) {
    await prisma.exhibitor.upsert({
      where: { email: `exhibitor${i}@ggallery.com` },
      update: { password: exhibitorPassword },
      create: {
        name: `Exhibitor ${i} (Sculpture)`,
        email: `exhibitor${i}@ggallery.com`,
        password: exhibitorPassword,
        artworks: {
          create: [{
            title: `Statue ${i}`,
            type: 'sculpture',
            price: 2000 * i,
            status: 'Available',
            attributes: { material: 'Bronze', height: 50, width: 30, depth: 20, weight: 15 },
          }]
        }
      }
    });
  }

  console.log('✅ 5 Exhibitors seeded with their artworks');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
