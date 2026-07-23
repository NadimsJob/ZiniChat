const fs = require('fs');
const envContent = fs.readFileSync(__dirname + '/../backend/.env.live', 'utf-8');
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    process.env[match[1]] = match[2].trim().replace(/^['"](.*)['"]$/, '$1');
  }
});
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const plans = await prisma.plan.findMany();
  console.log(JSON.stringify(plans, null, 2));
  
  const addons = await prisma.addon.findMany();
  console.log('ADDONS:');
  console.log(JSON.stringify(addons, null, 2));
}
run().finally(() => prisma.$disconnect());
