const { NodeSSH } = require('node-ssh');
const fs = require('fs');
const path = require('path');
const os = require('os');
require('dotenv').config({ path: path.join(__dirname, '.env.deploy') });

async function checkAndFix() {
  const ssh = new NodeSSH();
  
  try {
    await ssh.connect({
      host: process.env.LIVE_SERVER_HOST,
      username: process.env.LIVE_SERVER_USER || 'root',
      privateKey: fs.readFileSync(path.join(os.homedir(), '.ssh', 'id_rsa'), 'utf8')
    });

    console.log('✅ SSH Connected\n');

    // Check DIRECT_URL in backend .env on the server
    const directUrl = await ssh.execCommand('cat backend/.env | grep DIRECT_URL', { cwd: process.env.LIVE_PROJECT_PATH });
    console.log('=== DIRECT_URL in backend/.env ===');
    console.log(directUrl.stdout || directUrl.stderr);

    // Also check DATABASE_URL 
    const dbUrl = await ssh.execCommand('cat backend/.env | grep DATABASE_URL', { cwd: process.env.LIVE_PROJECT_PATH });
    console.log('\n=== DATABASE_URL in backend/.env ===');
    console.log(dbUrl.stdout || dbUrl.stderr);

    // Check env vars inside the running container
    const containerEnv = await ssh.execCommand('docker exec zinichat_backend_live env | grep -E "DATABASE_URL|DIRECT_URL"');
    console.log('\n=== ENV VARS INSIDE CONTAINER ===');
    console.log(containerEnv.stdout || containerEnv.stderr);

    ssh.dispose();
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

checkAndFix();
