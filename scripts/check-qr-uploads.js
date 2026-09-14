const { NodeSSH } = require('node-ssh');
const fs = require('fs');
const path = require('path');
const os = require('os');
require('dotenv').config({ path: path.join(__dirname, '../scripts/.env.deploy') });

async function checkQrUploads() {
  const ssh = new NodeSSH();

  try {
    await ssh.connect({
      host: process.env.LIVE_SERVER_HOST,
      username: process.env.LIVE_SERVER_USER || 'root',
      privateKey: fs.readFileSync(path.join(os.homedir(), '.ssh', 'id_rsa'), 'utf8')
    });

    console.log('✅ SSH Connected to LIVE server\n');
    const proj = process.env.LIVE_PROJECT_PATH;

    // 1. Check what volumes are mounted for backend
    console.log('=== 1. ALL DOCKER VOLUMES (find backend_uploads volume name) ===');
    const vols = await ssh.execCommand('docker volume ls | grep zinichat 2>&1', { cwd: proj });
    console.log(vols.stdout || vols.stderr);

    // 2. Check actual files in the mounted volume via docker exec
    console.log('\n=== 2. FILES IN /usr/src/app/uploads/mfs (inside backend container) ===');
    const files = await ssh.execCommand(
      'docker exec zinichat_backend_live ls -la /usr/src/app/uploads/mfs/ 2>&1 || echo "mfs dir not found, checking uploads root:" && docker exec zinichat_backend_live ls -la /usr/src/app/uploads/ 2>&1',
      { cwd: proj }
    );
    console.log(files.stdout || files.stderr);

    // 3. Check file permissions specifically
    console.log('\n=== 3. PERMISSIONS ON ALL FILES IN uploads/mfs ===');
    const perms = await ssh.execCommand(
      'docker exec zinichat_backend_live find /usr/src/app/uploads/mfs -type f -exec ls -la {} \\; 2>&1',
      { cwd: proj }
    );
    console.log(perms.stdout || perms.stderr || 'No files found in mfs folder!');

    // 4. Check what process.cwd() is inside the container
    console.log('\n=== 4. BACKEND CONTAINER CWD ===');
    const cwd = await ssh.execCommand(
      'docker exec zinichat_backend_live pwd 2>&1',
      { cwd: proj }
    );
    console.log('Container CWD:', cwd.stdout || cwd.stderr);

    // 5. Test HTTP access to uploads path directly via backend port
    console.log('\n=== 5. TEST HTTP GET /uploads/mfs/ on backend container (port 8200) ===');
    const httpTest = await ssh.execCommand(
      'curl -s -o /dev/null -w "HTTP %{http_code} - URL: %{url_effective}" "http://localhost:8200/uploads/mfs/" 2>&1',
      { cwd: proj }
    );
    console.log(httpTest.stdout || httpTest.stderr);

    // 6. Backend recent error logs
    console.log('\n=== 6. BACKEND LOGS - last 40 lines ===');
    const logs = await ssh.execCommand(
      'docker compose --env-file .env.live logs --tail=40 backend 2>&1',
      { cwd: proj }
    );
    console.log(logs.stdout || logs.stderr);

    // 7. Check qrCodeUrl value in MfsAccount DB
    console.log('\n=== 7. qrCodeUrl in MfsAccount (DB check via prisma) ===');
    const dbCheck = await ssh.execCommand(
      `docker exec zinichat_backend_live node -e "const {PrismaClient}=require('@prisma/client');const p=new PrismaClient();p.mfsAccount.findMany({select:{id:true,provider:true,qrCodeUrl:true,isActive:true}}).then(r=>{console.log(JSON.stringify(r,null,2));p.$disconnect();}).catch(e=>{console.error(e.message);p.$disconnect();})" 2>&1`,
      { cwd: proj }
    );
    console.log(dbCheck.stdout || dbCheck.stderr);

    ssh.dispose();
    console.log('\n✅ Investigation complete.');
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

checkQrUploads();
