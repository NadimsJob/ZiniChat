const { NodeSSH } = require('node-ssh');
const fs = require('fs');
const path = require('path');
const os = require('os');
require('dotenv').config({ path: path.join(__dirname, '.env.deploy') });
async function runLogs() {
  const ssh = new NodeSSH();
  try {
    await ssh.connect({
      host: process.env.TEST_SERVER_HOST,
      username: process.env.TEST_SERVER_USER || 'root',
      privateKey: fs.readFileSync(path.join(os.homedir(), '.ssh', 'id_rsa'), 'utf8')
    });
    console.log('? SSH Connected');
    const result = await ssh.execCommand('docker logs --tail 50 zinichat_backend_test', { cwd: process.env.TEST_PROJECT_PATH });
    console.log('STDOUT:', result.stdout);
    console.log('STDERR:', result.stderr);
    ssh.dispose();
  } catch (err) {
    console.error('? Error:', err.message);
  }
}
runLogs();
