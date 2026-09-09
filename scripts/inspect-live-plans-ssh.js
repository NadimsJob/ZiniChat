const { NodeSSH } = require('node-ssh');
const fs = require('fs');
const path = require('path');
const os = require('os');
require('dotenv').config({ path: path.join(__dirname, '.env.deploy') });

async function inspectLivePlans() {
  const ssh = new NodeSSH();
  
  try {
    await ssh.connect({
      host: process.env.LIVE_SERVER_HOST || '76.13.187.85',
      username: process.env.LIVE_SERVER_USER || 'root',
      privateKey: fs.readFileSync(path.join(os.homedir(), '.ssh', 'id_rsa'), 'utf8')
    });

    console.log('✅ SSH Connected to Live Server\n');

    const cmd = `docker compose --env-file .env.live exec -T backend node -e "const { PrismaClient } = require('@prisma/client'); new PrismaClient().plan.findMany().then(plans => console.log(JSON.stringify(plans, null, 2))).catch(console.error);"`

    const result = await ssh.execCommand(cmd, { cwd: process.env.LIVE_PROJECT_PATH || '/var/www/zinichat-live' });

    console.log('--- LIVE DB PLANS ---');
    console.log(result.stdout);
    if (result.stderr) console.error('STDERR:', result.stderr);

  } catch (err) {
    console.error('❌ Error inspecting live plans:', err);
  } finally {
    ssh.dispose();
  }
}

inspectLivePlans();
