const { NodeSSH } = require('node-ssh');
const fs = require('fs');
const path = require('path');
const os = require('os');
require('dotenv').config({ path: path.join(__dirname, '.env.deploy') });

async function checkServer(target) {
  const prefix = target.toUpperCase();
  const host = process.env[`${prefix}_SERVER_HOST`];
  const user = process.env[`${prefix}_SERVER_USER`] || 'root';
  const projectPath = process.env[`${prefix}_PROJECT_PATH`];
  const keyPath = process.env[`${prefix}_SSH_KEY_PATH`] || path.join(os.homedir(), '.ssh', 'id_rsa');

  console.log(`\n=================== CHECKING ${prefix} SERVER (${host}) ===================`);
  if (!host || !projectPath) {
    console.log(`❌ Config missing for ${target} server in .env.deploy`);
    return;
  }

  const ssh = new NodeSSH();
  try {
    let privateKey;
    if (fs.existsSync(keyPath)) {
      privateKey = fs.readFileSync(keyPath, 'utf8');
    }

    const sshConfig = { host, username: user };
    if (privateKey) sshConfig.privateKey = privateKey;
    const passphrase = process.env[`${prefix}_SSH_PASSPHRASE`];
    if (passphrase) sshConfig.passphrase = passphrase;

    await ssh.connect(sshConfig);
    console.log(`✅ SSH Connected to ${prefix} Server`);

    // Check backend/.env
    const envCheck = await ssh.execCommand('grep -E "WHATSAPP_VERIFY_TOKEN|MESSENGER_VERIFY_TOKEN|META_APP_SECRET|WHATSAPP_APP_SECRET|SETUP_SECRET_KEY" backend/.env || true', { cwd: projectPath });
    console.log('\n--- backend/.env values ---');
    console.log(envCheck.stdout || '(None found in backend/.env)');

    // Check root .env if exists
    const rootEnvCheck = await ssh.execCommand('grep -E "WHATSAPP_VERIFY_TOKEN|MESSENGER_VERIFY_TOKEN|META_APP_SECRET|WHATSAPP_APP_SECRET|SETUP_SECRET_KEY" .env || true', { cwd: projectPath });
    console.log('\n--- root .env values ---');
    console.log(rootEnvCheck.stdout || '(None found in root .env)');

    ssh.dispose();
  } catch (err) {
    console.error(`❌ Error checking ${target} server:`, err.message);
  }
}

async function runAll() {
  await checkServer('test');
  await checkServer('live');
}

runAll();
