const { NodeSSH } = require('node-ssh');
const fs = require('fs');
const path = require('path');
const os = require('os');
require('dotenv').config({ path: path.join(__dirname, '.env.deploy') });

async function recreateAndMigrate() {
  const ssh = new NodeSSH();
  
  try {
    await ssh.connect({
      host: process.env.LIVE_SERVER_HOST,
      username: process.env.LIVE_SERVER_USER || 'root',
      privateKey: fs.readFileSync(path.join(os.homedir(), '.ssh', 'id_rsa'), 'utf8')
    });

    console.log('✅ SSH Connected\n');

    // Verify the fix is in .env file
    const verify = await ssh.execCommand('cat backend/.env | grep DIRECT_URL', { cwd: process.env.LIVE_PROJECT_PATH });
    console.log('=== Current DIRECT_URL in file ===');
    console.log(verify.stdout);

    // docker compose up -d (NOT restart) to reload env_file
    console.log('🔄 Recreating backend container with new env (up -d)...');
    const up = await ssh.execCommand(
      'docker compose --env-file .env.live up -d backend',
      { cwd: process.env.LIVE_PROJECT_PATH }
    );
    console.log(up.stdout || up.stderr);

    // Wait for container to fully start
    console.log('\n⏳ Waiting 15s for container to start...');
    await new Promise(resolve => setTimeout(resolve, 15000));

    // Verify env inside container now
    const containerEnv = await ssh.execCommand('docker exec zinichat_backend_live env | grep DIRECT_URL');
    console.log('\n=== DIRECT_URL inside container ===');
    console.log(containerEnv.stdout || containerEnv.stderr);

    // Run prisma db push
    console.log('\n🔄 Running prisma db push...');
    const migration = await ssh.execCommand('docker exec zinichat_backend_live npx prisma db push');
    console.log('STDOUT:', migration.stdout);
    console.log('STDERR:', migration.stderr);
    console.log('Exit code:', migration.code);

    ssh.dispose();
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

recreateAndMigrate();
