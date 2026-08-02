const { NodeSSH } = require("node-ssh");
const fs = require('fs');
const path = require('path');
const os = require('os');
require("dotenv").config({ path: __dirname + "/.env.deploy" });

async function main() {
  const host = process.env.LIVE_SERVER_HOST;
  const username = process.env.LIVE_SERVER_USER;
  const privateKeyPath = process.env.LIVE_SSH_KEY_PATH;
  const projectPath = process.env.LIVE_PROJECT_PATH;
  
  const ssh = new NodeSSH();
  const sshConfig = { host, username, readyTimeout: 60000 };
  
  if (privateKeyPath) {
    sshConfig.privateKey = fs.readFileSync(privateKeyPath, 'utf8');
  } else {
    sshConfig.privateKey = fs.readFileSync(path.join(os.homedir(), '.ssh', 'id_rsa'), 'utf8');
  }
  
  console.log('Connecting to LIVE SERVER...');
  await ssh.connect(sshConfig);

  console.log('Uploading scripts to host...');
  await ssh.putFile(
    path.join(__dirname, '../backend/delete-plans.js'), 
    `${projectPath}/delete-plans.js`
  );
  await ssh.putFile(
    path.join(__dirname, '../backend/delete-tenants.js'), 
    `${projectPath}/delete-tenants.js`
  );

  console.log('Copying scripts into backend container...');
  await ssh.execCommand(
    `docker cp delete-plans.js zinichat_backend_live:/usr/src/app/delete-plans.js`,
    { cwd: projectPath }
  );
  await ssh.execCommand(
    `docker cp delete-tenants.js zinichat_backend_live:/usr/src/app/delete-tenants.js`,
    { cwd: projectPath }
  );

  console.log('Executing delete-tenants.js...');
  const resTenants = await ssh.execCommand(
    `docker compose --env-file .env.live -f docker-compose.yml exec -T backend node delete-tenants.js`,
    { cwd: projectPath }
  );
  console.log(resTenants.stdout);
  if (resTenants.stderr) console.error(resTenants.stderr);

  ssh.dispose();
  console.log('Done.');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
