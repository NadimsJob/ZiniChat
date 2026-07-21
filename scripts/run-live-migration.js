const { NodeSSH } = require('node-ssh');
const fs = require('fs');
const path = require('path');
const os = require('os');
require('dotenv').config({ path: path.join(__dirname, '.env.deploy') });

async function runMigration() {
  const ssh = new NodeSSH();
  
  try {
    await ssh.connect({
      host: process.env.LIVE_SERVER_HOST,
      username: process.env.LIVE_SERVER_USER || 'root',
      privateKey: fs.readFileSync(path.join(os.homedir(), '.ssh', 'id_rsa'), 'utf8')
    });

    console.log('✅ SSH Connected\n');
    console.log('🔄 Running prisma db push inside live backend container...\n');

    const result = await ssh.execCommand(
      'docker exec zinichat_backend_live npx prisma db push',
      { cwd: process.env.LIVE_PROJECT_PATH }
    );

    console.log('STDOUT:', result.stdout);
    console.log('STDERR:', result.stderr);
    console.log('Exit code:', result.code);

    ssh.dispose();
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

runMigration();
