const { NodeSSH } = require('node-ssh');
const fs = require('fs');
const path = require('path');
const os = require('os');
require('dotenv').config({ path: path.join(__dirname, '.env.deploy') });

async function runCheck() {
  const ssh = new NodeSSH();
  
  try {
    await ssh.connect({
      host: process.env.LIVE_SERVER_HOST,
      username: process.env.LIVE_SERVER_USER || 'root',
      privateKey: fs.readFileSync(path.join(os.homedir(), '.ssh', 'id_rsa'), 'utf8')
    });

    console.log('✅ SSH Connected\n');

    const scriptToRun = `
const { NestFactory } = require('@nestjs/core');
const { AppModule } = require('./dist/app.module');

async function run() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const tenantsService = app.get(require('./dist/tenants/tenants.service').TenantsService);
  const result = await tenantsService.findAll();
  const tenantRaw = await app.get(require('./dist/prisma/prisma.service').PrismaService).tenant.findFirst({
    where: { businessName: { contains: "Nadim" } },
    include: { subscriptions: { include: { plan: true } } }
  });
  console.log("SUBSCRIPTIONS FOR NADIM:");
  console.log(JSON.stringify(tenantRaw.subscriptions, null, 2));
  await app.close();
}

run().catch(console.error);
`;

    // Save script to a temporary file on the remote server
    const remoteScriptPath = '/tmp/check_features.js';
    await ssh.execCommand(`cat << 'EOF' > ${remoteScriptPath}\n${scriptToRun}\nEOF`);

    await ssh.execCommand(`docker cp ${remoteScriptPath} zinichat_backend_live:/usr/src/app/check_features.js`);

    // Run the script inside the backend container
    console.log('Running check...');
    const result = await ssh.execCommand(
      `docker exec zinichat_backend_live node check_features.js`
    );

    console.log('--- OUTPUT ---');
    console.log(result.stdout);
    if (result.stderr) {
      console.log('--- ERRORS ---');
      console.log(result.stderr);
    }
    
    // Cleanup
    await ssh.execCommand(`rm ${remoteScriptPath}`);
    
  } catch (error) {
    console.error('SSH Connection Failed:', error);
  } finally {
    ssh.dispose();
  }
}

runCheck();
