const { NodeSSH } = require('node-ssh');
const fs = require('fs');
const path = require('path');
const os = require('os');
require('dotenv').config({ path: path.join(__dirname, '../scripts/.env.deploy') });

async function checkQrDeep() {
  const ssh = new NodeSSH();

  try {
    await ssh.connect({
      host: process.env.LIVE_SERVER_HOST,
      username: process.env.LIVE_SERVER_USER || 'root',
      privateKey: fs.readFileSync(path.join(os.homedir(), '.ssh', 'id_rsa'), 'utf8')
    });

    console.log('✅ SSH Connected\n');
    const proj = process.env.LIVE_PROJECT_PATH;

    // 1. Test the exact file via HTTP
    console.log('=== 1. DIRECT HTTP TEST for the actual jpeg file ===');
    const httpFile = await ssh.execCommand(
      'curl -s -o /dev/null -w "HTTP %{http_code}" "http://localhost:8200/uploads/mfs/1789376401660-730314654.jpeg" 2>&1',
      { cwd: proj }
    );
    console.log('Result:', httpFile.stdout || httpFile.stderr);

    // 2. Also test via api subdomain path (traefik)
    console.log('\n=== 2. HTTP TEST via api.zinichat.com ===');
    const httpApi = await ssh.execCommand(
      'curl -s -o /dev/null -w "HTTP %{http_code}" "https://api.zinichat.com/uploads/mfs/1789376401660-730314654.jpeg" 2>&1',
      { cwd: proj }
    );
    console.log('Result:', httpApi.stdout || httpApi.stderr);

    // 3. Check NestJS is using correct static prefix
    console.log('\n=== 3. WHAT PORT does backend container expose internally? ===');
    const portCheck = await ssh.execCommand(
      'docker inspect zinichat_backend_live --format "{{json .NetworkSettings.Ports}}" 2>&1',
      { cwd: proj }
    );
    console.log(portCheck.stdout || portCheck.stderr);

    // 4. Check dist folder structure - does NestJS dist/uploads exist?
    console.log('\n=== 4. CHECK IF dist/uploads EXISTS (old static path bug) ===');
    const distCheck = await ssh.execCommand(
      'docker exec zinichat_backend_live ls /usr/src/app/dist/uploads 2>&1 || echo "dist/uploads does NOT exist (good)"',
      { cwd: proj }
    );
    console.log(distCheck.stdout || distCheck.stderr);

    // 5. Check backend Dockerfile to see final WORKDIR and how app is served
    const dockerfileCheck = await ssh.execCommand(
      'cat /opt/zinichat-live/backend/Dockerfile 2>/dev/null | head -40 || cat ~/zinichat-live/backend/Dockerfile 2>/dev/null | head -40',
      { cwd: proj }
    );
    console.log('\n=== 5. BACKEND DOCKERFILE (first 40 lines) ===');
    console.log(dockerfileCheck.stdout || dockerfileCheck.stderr);

    // 6. Test: internal curl FROM INSIDE the container itself
    console.log('\n=== 6. CURL FROM INSIDE BACKEND CONTAINER (port 3000 internally) ===');
    const internalCurl = await ssh.execCommand(
      'docker exec zinichat_backend_live wget -q -O /dev/null --server-response "http://localhost:3000/uploads/mfs/1789376401660-730314654.jpeg" 2>&1 | head -5',
      { cwd: proj }
    );
    console.log(internalCurl.stdout || internalCurl.stderr);

    // 7. Simplified DB check using psql if prisma fails
    console.log('\n=== 7. DB CHECK via psql (mfs accounts qrCodeUrl) ===');
    const psqlCheck = await ssh.execCommand(
      `docker compose --env-file .env.live exec -T backend node -e "
const { execSync } = require('child_process');
try {
  const { PrismaClient } = require('@prisma/client');
  const p = new PrismaClient();
  async function run() {
    const r = await p.mfsAccount.findMany({ select: { id: true, provider: true, qrCodeUrl: true, isActive: true } });
    console.log(JSON.stringify(r, null, 2));
    await p['$disconnect']();
  }
  run().catch(e => console.error(e.message));
} catch(e) { console.error('Prisma error:', e.message); }
" 2>&1`,
      { cwd: proj }
    );
    console.log(psqlCheck.stdout || psqlCheck.stderr);

    ssh.dispose();
    console.log('\n✅ Done.');
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

checkQrDeep();
