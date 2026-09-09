const { NodeSSH } = require('node-ssh');
const fs = require('fs');
const path = require('path');
const os = require('os');
require('dotenv').config({ path: path.join(__dirname, '.env.deploy') });

async function main() {
  const ssh = new NodeSSH();
  const keyPath = process.env.LIVE_SSH_KEY_PATH || path.join(os.homedir(), '.ssh', 'id_rsa');
  
  await ssh.connect({
    host: process.env.LIVE_SERVER_HOST || '76.13.187.85',
    username: process.env.LIVE_SERVER_USER || 'root',
    privateKey: fs.readFileSync(keyPath, 'utf8'),
  });

  const tenantId = '606acee1-7dc3-4773-a2d8-3660249bdf79';

  console.log('Searching docker logs for tenantId:', tenantId);
  const logsRes = await ssh.execCommand(`docker logs zinichat_backend_live 2>&1 | grep -i "${tenantId}" | tail -n 50`);
  
  console.log('--- MATCHED LOGS ---');
  console.log(logsRes.stdout);

  ssh.dispose();
}

main().catch(console.error);
