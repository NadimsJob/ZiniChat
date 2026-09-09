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

  console.log('Fetching live backend logs for Facebook/Messenger authentication...');
  const logsRes = await ssh.execCommand('docker logs zinichat_backend_live --tail 200');
  console.log('--- STDOUT LOGS ---');
  console.log(logsRes.stdout);
  console.log('--- STDERR LOGS ---');
  console.log(logsRes.stderr);

  ssh.dispose();
}

main().catch(console.error);
