require('dotenv').config({ path: '../backend/.env' });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const plans = await prisma.plan.findMany();
  console.log(JSON.stringify(plans, null, 2));
}
run().finally(() => prisma.$disconnect());
