const { NodeSSH } = require('node-ssh');
const fs = require('fs');
const path = require('path');

async function main() {
  const ssh = new NodeSSH();
  const keyPath = path.join(process.env.USERPROFILE || process.env.HOME, '.ssh', 'id_rsa');
  
  await ssh.connect({
    host: process.env.LIVE_SERVER_HOST || '103.191.178.245',
    username: process.env.LIVE_SERVER_USER || 'root',
    privateKey: fs.readFileSync(keyPath, 'utf8'),
  });

  const result = await ssh.execCommand(
    `docker exec zinichat-live-backend-1 npx prisma db execute --stdin <<'EOF'
SELECT name, "priceMonthlyBdt", "priceYearlyBdt", "priceMonthlyUsd", "priceYearlyUsd", "yearlyDiscountPercent"
FROM "Plan"
ORDER BY "priceMonthlyBdt" ASC;
EOF`
  );
  
  console.log('STDOUT:', result.stdout);
  console.log('STDERR:', result.stderr);
  
  ssh.dispose();
}

main().catch(console.error);
