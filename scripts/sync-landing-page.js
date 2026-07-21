/**
 * sync-landing-page.js
 * 
 * Reads landingPageConfig from local DB and syncs it to Test + Live servers.
 * Run from: f:\AI Assistant SAAS\scripts\
 * Command: node sync-landing-page.js
 */

const { NodeSSH } = require('node-ssh');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
require('dotenv').config({ path: path.join(__dirname, '.env.deploy') });

// ─── STEP 1: Read local landing page data ──────────────────────────────────
async function readLocalData() {
  console.log('📖 Step 1: Reading local landingPageConfig...\n');

  const exportScript = path.join(__dirname, '..', 'backend', 'export_landing.js');
  const outputFile = path.join(__dirname, '..', 'backend', 'landing_page_export.json');

  // Temporarily update export script to save to a local path we control
  const tempScript = `
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
async function main() {
  const prisma = new PrismaClient();
  try {
    const config = await prisma.landingPageConfig.findFirst();
    if (config) {
      fs.writeFileSync(${JSON.stringify(outputFile)}, JSON.stringify(config, null, 2));
      console.log('Exported successfully');
    } else {
      console.log('No config found');
      process.exit(1);
    }
  } catch(e) { console.error(e); process.exit(1); }
  finally { await prisma.$disconnect(); }
}
main();
`;

  const tempScriptPath = path.join(__dirname, '..', 'backend', '_temp_export.js');
  fs.writeFileSync(tempScriptPath, tempScript);

  try {
    execSync(`node "${tempScriptPath}"`, {
      cwd: path.join(__dirname, '..', 'backend'),
      stdio: 'inherit'
    });
  } finally {
    fs.unlinkSync(tempScriptPath);
  }

  if (!fs.existsSync(outputFile)) {
    throw new Error('Export failed - no output file found');
  }

  const data = JSON.parse(fs.readFileSync(outputFile, 'utf8'));
  fs.unlinkSync(outputFile);

  console.log(`\n✅ Local data read successfully (id: ${data.id})\n`);
  return data;
}

// ─── STEP 2: Sync to a server via SSH ──────────────────────────────────────
async function syncToServer(serverName, prefix, data) {
  const host = process.env[`${prefix}_SERVER_HOST`];
  const username = process.env[`${prefix}_SERVER_USER`] || 'root';
  const projectPath = process.env[`${prefix}_PROJECT_PATH`];
  const containerName = `zinichat_backend_${serverName}`;
  const envFile = `.env.${serverName}`;

  console.log(`\n🚀 Syncing to ${serverName.toUpperCase()} server (${host})...`);

  const ssh = new NodeSSH();
  try {
    await ssh.connect({
      host,
      username,
      privateKey: fs.readFileSync(path.join(os.homedir(), '.ssh', 'id_rsa'), 'utf8')
    });

    console.log(`  ✅ SSH connected`);

    // Build the upsert script to run inside the container
    const upsertData = { ...data };
    delete upsertData.id;
    delete upsertData.createdAt;
    delete upsertData.updatedAt;

    // Escape the JSON for shell injection
    const escapedJson = JSON.stringify(JSON.stringify(upsertData));

    const inlineScript = `
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const raw = ${escapedJson};
  const data = JSON.parse(raw);
  const existing = await prisma.landingPageConfig.findFirst();
  if (existing) {
    await prisma.landingPageConfig.update({ where: { id: existing.id }, data });
    console.log('Updated existing config');
  } else {
    await prisma.landingPageConfig.create({ data });
    console.log('Created new config');
  }
  await prisma.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
`;

    // Write script to temp file on the server
    const remoteTempPath = '/tmp/_sync_landing.js';
    await ssh.execCommand(`cat > ${remoteTempPath} << 'HEREDOC'\n${inlineScript}\nHEREDOC`);

    // Copy temp script into the container
    const copyResult = await ssh.execCommand(
      `docker cp ${remoteTempPath} ${containerName}:/usr/src/app/_sync_landing.js`
    );
    if (copyResult.code !== 0) {
      throw new Error(`docker cp failed: ${copyResult.stderr}`);
    }

    // Run it inside the container
    console.log(`  🔄 Running upsert inside ${containerName}...`);
    const runResult = await ssh.execCommand(
      `docker exec ${containerName} node /usr/src/app/_sync_landing.js`
    );
    console.log(`  STDOUT: ${runResult.stdout}`);
    if (runResult.stderr) console.log(`  STDERR: ${runResult.stderr}`);

    // Cleanup
    await ssh.execCommand(`docker exec ${containerName} rm -f /usr/src/app/_sync_landing.js`);
    await ssh.execCommand(`rm -f ${remoteTempPath}`);

    if (runResult.code === 0) {
      console.log(`  ✅ ${serverName.toUpperCase()} sync complete!`);
    } else {
      console.log(`  ❌ ${serverName.toUpperCase()} sync failed!`);
    }

    ssh.dispose();
  } catch (err) {
    console.error(`  ❌ Error: ${err.message}`);
    try { ssh.dispose(); } catch(_) {}
  }
}

// ─── MAIN ───────────────────────────────────────────────────────────────────
async function main() {
  console.log('=== Landing Page Config Sync ===\n');
  console.log('This will copy your local landingPageConfig to Test + Live servers.\n');

  try {
    const data = await readLocalData();

    await syncToServer('test', 'TEST', data);
    await syncToServer('live', 'LIVE', data);

    console.log('\n🎉 All done! Landing page config synced to Test and Live servers.\n');
  } catch (err) {
    console.error('\n❌ Fatal Error:', err.message);
  }
}

main();
