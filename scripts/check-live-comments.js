const { NodeSSH } = require('node-ssh');
const fs = require('fs');
const path = require('path');
const os = require('os');
require('dotenv').config({ path: path.join(__dirname, '.env.deploy') });

async function checkComments() {
  const ssh = new NodeSSH();
  try {
    await ssh.connect({
      host: process.env.LIVE_SERVER_HOST,
      username: process.env.LIVE_SERVER_USER || 'root',
      privateKey: fs.readFileSync(path.join(os.homedir(), '.ssh', 'id_rsa'), 'utf8')
    });

    console.log('✅ Connected to LIVE server\n');

    console.log('=== LAST 100 BACKEND LOG LINES ===');
    const logsRes = await ssh.execCommand('docker compose --env-file .env.live logs --tail=100 backend 2>&1', { cwd: process.env.LIVE_PROJECT_PATH });
    console.log(logsRes.stdout || logsRes.stderr);

    ssh.dispose();
  } catch (err) {
    console.error('Error:', err.message);
  }
}

checkComments();
