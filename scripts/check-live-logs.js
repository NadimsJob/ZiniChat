const { NodeSSH } = require('node-ssh');
const fs = require('fs');
const path = require('path');
const os = require('os');
require('dotenv').config({ path: path.join(__dirname, '../scripts/.env.deploy') });

async function checkLiveLogs() {
  const ssh = new NodeSSH();
  
  try {
    await ssh.connect({
      host: process.env.LIVE_SERVER_HOST,
      username: process.env.LIVE_SERVER_USER || 'root',
      privateKey: fs.readFileSync(path.join(os.homedir(), '.ssh', 'id_rsa'), 'utf8')
    });

    console.log('✅ SSH Connected to LIVE server\n');

    // Check running containers
    const containers = await ssh.execCommand('docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"', { cwd: process.env.LIVE_PROJECT_PATH });
    console.log('=== RUNNING CONTAINERS ===');
    console.log(containers.stdout || containers.stderr);

    // Check backend logs (last 50 lines)
    const logs = await ssh.execCommand('docker compose --env-file .env.live logs --tail=50 backend 2>&1', { cwd: process.env.LIVE_PROJECT_PATH });
    console.log('\n=== BACKEND LOGS (last 50 lines) ===');
    console.log(logs.stdout || logs.stderr);

    ssh.dispose();
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

checkLiveLogs();
