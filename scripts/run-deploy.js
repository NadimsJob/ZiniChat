const { NodeSSH } = require("node-ssh");
require("dotenv").config({ path: "d:/ZiniChat/scripts/.env.deploy" });
const fs = require('fs');

async function deploy(target, branch) {
    console.log(`Starting deployment for ${target} on branch ${branch}...`);
    const prefix = target.toUpperCase();
    const host = process.env[`${prefix}_SERVER_HOST`];
    const username = process.env[`${prefix}_SERVER_USER`];
    const privateKeyPath = process.env[`${prefix}_SSH_KEY_PATH`];
    const password = process.env[`${prefix}_SERVER_PASSWORD`];
    const projectPath = process.env[`${prefix}_PROJECT_PATH`];
    const restartCmd = process.env[`${prefix}_RESTART_CMD`] || "npm run build && pm2 restart all";

    if (!host || !username || !projectPath) {
      console.error(`Error: Missing SSH configuration for ${target} server in scripts/.env.deploy`);
      return;
    }

    try {
      const ssh = new NodeSSH();
      const sshConfig = { host, username };
      
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
      await ssh.connect(sshConfig);
      
      const commands = [
        `cd ${projectPath}`,
        `git fetch origin`,
        `git checkout ${branch}`,
        `git reset --hard origin/${branch}`,
        `git clean -fd`,
        `git pull origin ${branch}`,
        restartCmd
      ].join(" && ");

      console.log(`Executing commands on ${target}: ${commands}`);
      const result = await ssh.execCommand(commands);
      ssh.dispose();

      if (result.code !== 0) {
        console.error(`Deployment to ${target} failed with exit code ${result.code}.\nSTDERR:\n${result.stderr}\nSTDOUT:\n${result.stdout}`);
      } else {
        console.log(`Successfully deployed branch '${branch}' to ${target} server.\n\nSTDOUT:\n${result.stdout}`);
      }
    } catch (error) {
      console.error(`SSH Connection Error for ${target}: ${error.message}`);
    }
}

async function main() {
    await deploy('test', 'staging');
    await deploy('live', 'main');
}

main();
