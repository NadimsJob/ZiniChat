const { NodeSSH } = require('node-ssh');
const fs = require('fs');
const path = require('path');
const os = require('os');
require('dotenv').config({ path: path.join(__dirname, '.env.deploy') });

async function checkNetwork() {
  const ssh = new NodeSSH();
  
  try {
    await ssh.connect({
      host: process.env.LIVE_SERVER_HOST,
      username: process.env.LIVE_SERVER_USER || 'root',
      privateKey: fs.readFileSync(path.join(os.homedir(), '.ssh', 'id_rsa'), 'utf8')
    });

    console.log('✅ SSH Connected\n');

    // Check what the SUPABASE_NETWORK_NAME is in the live env file
    const envFile = await ssh.execCommand('cat .env.live | grep -i supabase', { cwd: process.env.LIVE_PROJECT_PATH });
    console.log('=== LIVE ENV (supabase vars) ===');
    console.log(envFile.stdout || envFile.stderr);

    // Check docker networks
    const networks = await ssh.execCommand('docker network ls | grep supabase', { cwd: process.env.LIVE_PROJECT_PATH });
    console.log('\n=== SUPABASE DOCKER NETWORKS ===');
    console.log(networks.stdout || networks.stderr);

    // Check which network backend is connected to
    const inspect = await ssh.execCommand('docker inspect zinichat_backend_live --format "{{json .NetworkSettings.Networks}}"', { cwd: process.env.LIVE_PROJECT_PATH });
    console.log('\n=== BACKEND NETWORKS ===');
    console.log(inspect.stdout || inspect.stderr);

    ssh.dispose();
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

checkNetwork();
