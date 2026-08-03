const { NodeSSH } = require('node-ssh');
const fs = require('fs');
const path = require('path');
const os = require('os');
require('dotenv').config({ path: path.join(__dirname, '.env.deploy') });

async function testSubscribePage() {
  const ssh = new NodeSSH();
  
  try {
    await ssh.connect({
      host: process.env.LIVE_SERVER_HOST,
      username: process.env.LIVE_SERVER_USER || 'root',
      privateKey: fs.readFileSync(path.join(os.homedir(), '.ssh', 'id_rsa'), 'utf8')
    });

    console.log('✅ SSH Connected to LIVE server\n');

    const code = `
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const conn = await prisma.channelConnection.findFirst({
    where: { externalAccountId: '480289191838580', channelType: 'messenger' }
  });
  if (!conn) {
    console.log("No connection found");
    return;
  }
  console.log("Found Connection:", conn.displayName, conn.externalAccountId);
  const token = conn.accessTokenEncrypted;
  const pageId = conn.externalAccountId;

  const urlGet = 'https://graph.facebook.com/v21.0/' + pageId + '/subscribed_apps?access_token=' + token;
  const getSubRes = await fetch(urlGet);
  const getSubData = await getSubRes.json();
  console.log("CURRENT SUBSCRIBED APPS:", JSON.stringify(getSubData, null, 2));

  const urlPost = 'https://graph.facebook.com/v21.0/' + pageId + '/subscribed_apps?subscribed_fields=messages,messaging_postbacks,message_deliveries,message_reads&access_token=' + token;
  const subRes = await fetch(urlPost, { method: 'POST' });
  const subData = await subRes.json();
  console.log("SUBSCRIBE RESULT:", JSON.stringify(subData, null, 2));
}
main().finally(() => prisma['$disconnect']());
`;

    const b64 = Buffer.from(code).toString('base64');
    const cmd = `docker compose --env-file .env.live exec -T backend node -e "eval(Buffer.from('${b64}', 'base64').toString('utf8'))"`;
    const res = await ssh.execCommand(cmd, { cwd: process.env.LIVE_PROJECT_PATH });
    console.log(res.stdout || res.stderr);

    ssh.dispose();
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

testSubscribePage();
