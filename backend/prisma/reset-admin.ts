import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL || 'admin@gmail.com';
  const newPassword = process.env.ADMIN_PASSWORD || 'Admin@1234';

  const hashedPassword = await bcrypt.hash(newPassword, 10);

  const admin = await prisma.admin.upsert({
    where: { email },
    update: {
      password: hashedPassword,
    },
    create: {
      name: 'Super Admin',
      email,
      password: hashedPassword,
      role: 'admin',
    },
  });

  console.log('----------------------------------------------------');
  console.log('✅ Admin credentials updated successfully!');
  console.log(`   Email:    ${admin.email}`);
  console.log(`   Password: ${newPassword}`);
  console.log('----------------------------------------------------');
}

main()
  .catch((e) => {
    console.error('❌ Error updating admin credentials:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
