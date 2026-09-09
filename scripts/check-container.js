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

  const pwdRes = await ssh.execCommand('docker exec zinichat_backend_live pwd');
  console.log('Backend container PWD:', pwdRes.stdout);

  const lsRes = await ssh.execCommand('docker exec zinichat_backend_live ls -la');
  console.log('Backend container LS:\n', lsRes.stdout);

  ssh.dispose();
}

main().catch(console.error);
