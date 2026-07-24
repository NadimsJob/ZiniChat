const { NodeSSH } = require('node-ssh');
require('dotenv').config({ path: 'scripts/.env.deploy' });
const ssh = new NodeSSH();
(async () => {
  const fs = require('fs');
  await ssh.connect({ 
    host: process.env.LIVE_HOST, 
    username: process.env.LIVE_USER, 
    privateKey: fs.readFileSync(process.env.LIVE_KEY_PATH, 'utf8') 
  });
  
  const cmd = `docker compose exec -T backend node -e "const { PrismaClient } = require('@prisma/client'); const p = new PrismaClient(); p.mfsAccount.findFirst({where: {provider: 'BANGLA_QR'}}).then(console.log);"`;
  const r = await ssh.execCommand(cmd);
  console.log(r.stdout);
  console.error(r.stderr);
  process.exit(0);
})();
