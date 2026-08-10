/**
 * Vector migration: discover container name, copy SQL in, run via prisma db execute
 */
const { NodeSSH } = require('node-ssh');
const fs = require('fs');
const path = require('path');
const os = require('os');
require('dotenv').config({ path: path.join(__dirname, '.env.deploy') });

const MIGRATION_SQL = `DROP INDEX IF EXISTS knowledge_chunks_embedding_hnsw_idx;
UPDATE "knowledge_chunks" SET "embedding" = NULL;
ALTER TABLE "knowledge_chunks" ALTER COLUMN "embedding" TYPE vector(768) USING NULL;
CREATE INDEX IF NOT EXISTS knowledge_chunks_embedding_hnsw_idx ON knowledge_chunks USING hnsw (embedding vector_cosine_ops);
UPDATE "knowledge_documents" SET "status" = 'pending' WHERE "status" = 'completed';
`;

async function getSSH(target) {
  const prefix = target.toUpperCase();
  const host = process.env[`${prefix}_SERVER_HOST`];
  const username = process.env[`${prefix}_SERVER_USER`];
  const privateKeyPath = process.env[`${prefix}_SSH_KEY_PATH`];
  const password = process.env[`${prefix}_SERVER_PASSWORD`];

  const ssh = new NodeSSH();
  const sshConfig = { host, username, readyTimeout: 60000 };
  if (privateKeyPath && fs.existsSync(privateKeyPath)) {
    sshConfig.privateKey = fs.readFileSync(privateKeyPath, 'utf8');
  } else if (password) {
    sshConfig.password = password;
  } else {
    sshConfig.privateKey = fs.readFileSync(path.join(os.homedir(), '.ssh', 'id_rsa'), 'utf8');
  }
  const passphrase = process.env[`${prefix}_SSH_PASSPHRASE`];
  if (passphrase) sshConfig.passphrase = passphrase;
  await ssh.connect(sshConfig);
  return ssh;
}

async function exec(ssh, cmd) {
  const r = await ssh.execCommand(cmd);
  return r;
}

async function runMigration(target) {
  const prefix = target.toUpperCase();
  const projectPath = process.env[`${prefix}_PROJECT_PATH`];
  const envFile = target === 'live' ? '.env.live' : '.env.test';
  const keyword = target === 'live' ? 'live' : 'test';

  console.log(`\n====== ${target.toUpperCase()} migration ======`);
  const ssh = await getSSH(target);
  console.log(`✅ SSH connected`);

  // Step 1: Find the backend container name
  const listResult = await exec(ssh, `docker ps --format '{{.Names}}' | grep ${keyword}`);
  const containerLines = (listResult.stdout || '').trim().split('\n').filter(Boolean);
  console.log('Running containers:', containerLines);

  const backendContainer = containerLines.find(n => n.includes('backend')) || containerLines[0];
  if (!backendContainer) {
    console.error('❌ No running container found! Containers:', containerLines);
    console.log('docker ps output:', listResult.stdout, listResult.stderr);
    ssh.dispose();
    return;
  }
  console.log(`📦 Using container: ${backendContainer}`);

  // Step 2: Write SQL to remote /tmp
  await exec(ssh, `cat > /tmp/vm768.sql << 'SQLEOF'\n${MIGRATION_SQL}\nSQLEOF`);

  // Step 3: Copy SQL into container
  const cpResult = await exec(ssh, `docker cp /tmp/vm768.sql ${backendContainer}:/tmp/vm768.sql`);
  console.log('docker cp:', cpResult.stdout || cpResult.stderr || 'ok');

  // Step 4: Run via prisma db execute inside container
  const execResult = await exec(ssh, `docker exec ${backendContainer} sh -c 'cd /usr/src/app && npx prisma db execute --file /tmp/vm768.sql --schema ./prisma/schema.prisma 2>&1'`);
  console.log('STDOUT:', execResult.stdout || '(empty)');
  if (execResult.stderr) console.log('STDERR:', execResult.stderr);
  console.log('Exit:', execResult.code);

  if (execResult.code === 0 && !execResult.stdout.toLowerCase().includes('error')) {
    console.log(`✅ Migration OK on ${target}!`);
  } else {
    console.log(`❌ prisma db execute failed. Trying via DIRECT_URL...`);

    // Fallback: get DIRECT_URL from container env and use psql node package or raw prisma
    const envResult = await exec(ssh, `docker exec ${backendContainer} sh -c 'echo $DIRECT_URL'`);
    const directUrl = (envResult.stdout || '').trim();
    console.log('DIRECT_URL found:', directUrl ? 'YES' : 'NO (empty)');

    if (directUrl) {
      // Use psql-like approach via node with pg
      const nodeScript = `
const { Client } = require('pg');
const sql = require('fs').readFileSync('/tmp/vm768.sql','utf8');
const c = new Client({ connectionString: '${directUrl}' });
c.connect().then(() => c.query(sql)).then(r => { console.log('Done'); c.end(); process.exit(0); }).catch(e => { console.error(e.message); process.exit(1); });
`.trim();
      const nodeResult = await exec(ssh, `docker exec ${backendContainer} sh -c 'node -e "${nodeScript.replace(/"/g, '\\"').replace(/\n/g, ' ')}"'`);
      console.log('Node pg STDOUT:', nodeResult.stdout);
      console.log('Node pg STDERR:', nodeResult.stderr);
    }
  }

  ssh.dispose();
}

async function main() {
  try {
    await runMigration('test');
    await runMigration('live');
    console.log('\n🎉 Done!');
  } catch (err) {
    console.error('Fatal:', err.message);
  }
}

main();
