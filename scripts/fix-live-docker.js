const { NodeSSH } = require("node-ssh");
require("dotenv").config({ path: __dirname + "/.env.deploy" });
const fs = require('fs');

async function fixLive() {
  const target = "live";
  const prefix = target.toUpperCase();
  const host = process.env[`${prefix}_SERVER_HOST`];
  const username = process.env[`${prefix}_SERVER_USER`];
  const privateKeyPath = process.env[`${prefix}_SSH_KEY_PATH`];
  const password = process.env[`${prefix}_SERVER_PASSWORD`];
  const projectPath = process.env[`${prefix}_PROJECT_PATH`];

  const ssh = new NodeSSH();
  const sshConfig = { host, username, readyTimeout: 60000 };
  
  if (privateKeyPath) {
    sshConfig.privateKey = fs.readFileSync(privateKeyPath, 'utf8');
  } else if (password) {
    sshConfig.password = password;
  } else {
    const os = require('os');
    const path = require('path');
    sshConfig.privateKey = fs.readFileSync(path.join(os.homedir(), '.ssh', 'id_rsa'), 'utf8');
  }
  
  const passphrase = process.env[`${prefix}_SSH_PASSPHRASE`];
  if (passphrase) {
    sshConfig.passphrase = passphrase;
  }
  
  try {
    await ssh.connect(sshConfig);
    console.log("Connected to live server");
    
    // Command to fix the conflicting container
    const cmd = `cd ${projectPath} && docker compose down && docker compose rm -f || true`;
    const result = await ssh.execCommand(cmd);
    console.log("Fix Result:", result.stdout, result.stderr);
    
    ssh.dispose();
  } catch (err) {
    console.error(err);
  }
}

fixLive();
