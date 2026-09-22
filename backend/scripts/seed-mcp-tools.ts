import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const tools = [
  { toolKey: 'get_ad_insights', displayName: 'Get Ad Insights', riskLevel: 'READ_ONLY', isEnabled: false },
  { toolKey: 'list_campaigns', displayName: 'List Campaigns', riskLevel: 'READ_ONLY', isEnabled: false },
  { toolKey: 'create_campaign', displayName: 'Create Campaign', riskLevel: 'WRITE_STRUCTURAL', isEnabled: false },
  { toolKey: 'create_adset', displayName: 'Create AdSet', riskLevel: 'WRITE_STRUCTURAL', isEnabled: false },
  { toolKey: 'create_ad', displayName: 'Create Ad', riskLevel: 'WRITE_STRUCTURAL', isEnabled: false },
  { toolKey: 'scale_ad_budget', displayName: 'Scale Ad Budget', riskLevel: 'WRITE_SPEND', isEnabled: false },
  { toolKey: 'pause_ad', displayName: 'Pause Ad', riskLevel: 'WRITE_STRUCTURAL', isEnabled: false },
];

async function main() {
  console.log('Seeding MCP tools...');
  for (const tool of tools) {
    await prisma.mcpToolRegistry.upsert({
      where: { toolKey: tool.toolKey },
      update: {},
      create: tool,
    });
  }
  console.log('Seeding complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
