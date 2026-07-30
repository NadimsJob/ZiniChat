const { NodeSSH } = require('node-ssh');
const fs = require('fs');
const path = require('path');
const os = require('os');
require('dotenv').config({ path: path.join(__dirname, '.env.deploy') });

async function configureServer(target) {
  const prefix = target.toUpperCase();
  const host = process.env[`${prefix}_SERVER_HOST`];
  const user = process.env[`${prefix}_SERVER_USER`] || 'root';
  const projectPath = process.env[`${prefix}_PROJECT_PATH`];
  const keyPath = process.env[`${prefix}_SSH_KEY_PATH`] || path.join(os.homedir(), '.ssh', 'id_rsa');

  console.log(`\n=================== CONFIGURING ${prefix} SERVER (${host}) ===================`);
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

    // Append WHATSAPP_VERIFY_TOKEN and MESSENGER_VERIFY_TOKEN if missing
    const commands = [
      `cd ${projectPath}/backend`,
      `grep -q "WHATSAPP_VERIFY_TOKEN" .env || echo '\nWHATSAPP_VERIFY_TOKEN="zinichat_webhook_verify_2026"' >> .env`,
      `grep -q "MESSENGER_VERIFY_TOKEN" .env || echo 'MESSENGER_VERIFY_TOKEN="zinichat_webhook_verify_2026"' >> .env`
    ].join(' && ');

    await ssh.execCommand(commands);
    console.log(`✅ Added WHATSAPP_VERIFY_TOKEN & MESSENGER_VERIFY_TOKEN to backend/.env on ${prefix} Server`);

    const result = await ssh.execCommand('grep -E "WHATSAPP_VERIFY_TOKEN|MESSENGER_VERIFY_TOKEN|SETUP_SECRET_KEY" backend/.env', { cwd: projectPath });
    console.log('\n--- Updated backend/.env ---');
    console.log(result.stdout);

    ssh.dispose();
  } catch (err) {
    console.error(`❌ Error configuring ${target} server:`, err.message);
  }
}

async function runAll() {
  await configureServer('test');
  await configureServer('live');
}

runAll();
