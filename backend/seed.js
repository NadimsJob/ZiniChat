const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

async function main() {
  const hash = await bcrypt.hash('admin123', 10);
  let admin = await prisma.user.findFirst({ where: { role: 'superadmin' } });
  
  if (!admin) {
    admin = await prisma.user.create({
      data: {
        email: 'admin@admin.com',
        passwordHash: hash,
        role: 'superadmin',
        name: 'Super Admin'
      }
    });
    console.log('Created: ' + admin.email);
  } else {
    console.log('Exists: ' + admin.email);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
