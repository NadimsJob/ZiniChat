const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.user.findUnique({where: {email: 'admin@platform.com'}}).then(res => console.log(JSON.stringify(res))).finally(()=>prisma.$disconnect());
