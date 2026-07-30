const { NodeSSH } = require('node-ssh');
const fs = require('fs');
const path = require('path');
const os = require('os');
require('dotenv').config({ path: path.join(__dirname, '.env.deploy') });

async function runMigration() {
  const ssh = new NodeSSH();
  try {
    await ssh.connect({
      host: process.env.TEST_SERVER_HOST,
      username: process.env.TEST_SERVER_USER || 'root',
      privateKey: fs.readFileSync(path.join(os.homedir(), '.ssh', 'id_rsa'), 'utf8')
    });
    console.log('? SSH Connected');
    const result = await ssh.execCommand('docker exec zinichat_backend_test npx prisma db push', { cwd: process.env.TEST_PROJECT_PATH });
    console.log('STDOUT:', result.stdout);
    console.log('STDERR:', result.stderr);
    console.log('Exit code:', result.code);
    ssh.dispose();
  } catch (err) {
    console.error('? Error:', err.message);
  }
}
runMigration();
