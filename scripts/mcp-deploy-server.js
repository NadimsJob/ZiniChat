#!/usr/bin/env node

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../backend/.env') });
const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { CallToolRequestSchema, ListToolsRequestSchema } = require('@modelcontextprotocol/sdk/types.js');
const { NodeSSH } = require('node-ssh');

const ssh = new NodeSSH();

const server = new Server(
  {
    name: 'zinichat-deployment-server',
    version: '1.1.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Register tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'deploy_test_server',
        description: 'Deploys the ZiniChat application to the Test (Staging) server by SSHing, pulling the latest code from the staging branch, and rebuilding docker containers.',
        inputSchema: { type: 'object', properties: {}, required: [] },
      },
      {
        name: 'deploy_live_server',
        description: 'Deploys the ZiniChat application to the Live (Production) server by SSHing, pulling the latest code from the main branch, and rebuilding docker containers.',
        inputSchema: { type: 'object', properties: {}, required: [] },
      },
      {
        name: 'check_server_health',
        description: 'Checks the VPS server health including RAM usage, Disk space, and CPU usage.',
        inputSchema: { type: 'object', properties: {}, required: [] },
      },
      {
        name: 'get_docker_logs',
        description: 'Fetches the recent docker logs for a specific service in either the test or live environment.',
        inputSchema: {
          type: 'object',
          properties: {
            targetEnv: { type: 'string', description: 'Environment to check. Must be "test" or "live"', enum: ['test', 'live'] },
            serviceName: { type: 'string', description: 'The name of the docker service (e.g. "backend", "frontend", "redis", "postgres")' }
          },
          required: ['targetEnv', 'serviceName'],
        },
      },
      {
        name: 'restart_services',
        description: 'Restarts all docker services for a specific environment.',
        inputSchema: {
          type: 'object',
          properties: {
            targetEnv: { type: 'string', description: 'Environment to restart. Must be "test" or "live"', enum: ['test', 'live'] }
          },
          required: ['targetEnv'],
        },
      }
    ],
  };
});

// Helper function to connect and execute commands
async function executeSSHCommand(command, cwd = null) {
  require('dotenv').config({ path: path.join(__dirname, '../backend/.env') });
  const host = process.env.VPS_HOST;
  const username = process.env.VPS_USERNAME || 'root';
  const privateKeyPath = process.env.VPS_PRIVATE_KEY_PATH;

  if (!host || !privateKeyPath) {
    throw new Error('VPS_HOST or VPS_PRIVATE_KEY_PATH is not set in the environment variables.');
  }

  try {
    await ssh.connect({ host, username, privateKeyPath });
    const result = await ssh.execCommand(command, cwd ? { cwd } : {});
    
    let output = `STDOUT:\\n${result.stdout}\\n`;
    if (result.stderr) output += `STDERR:\\n${result.stderr}\\n`;
    if (result.code !== 0) throw new Error(`Command failed: ${command}\\n${result.stderr}`);
    
    return output;
  } finally {
    ssh.dispose();
  }
}

// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  switch (request.params.name) {
    case 'deploy_test_server': {
      try {
        const cmd = `git pull origin staging && docker compose up -d --build`;
        const result = await executeSSHCommand(cmd, '/var/www/zinichat-test');
        return { content: [{ type: 'text', text: `Successfully deployed to TEST server:\\n${result}` }] };
      } catch (e) {
        return { content: [{ type: 'text', text: `Failed: ${e.message}` }], isError: true };
      }
    }

    case 'deploy_live_server': {
      try {
        const cmd = `git pull origin main && docker compose up -d --build`;
        const result = await executeSSHCommand(cmd, '/var/www/zinichat-live');
        return { content: [{ type: 'text', text: `Successfully deployed to LIVE server:\\n${result}` }] };
      } catch (e) {
        return { content: [{ type: 'text', text: `Failed: ${e.message}` }], isError: true };
      }
    }

    case 'check_server_health': {
      try {
        const cmd = `echo "--- RAM USAGE ---" && free -h && echo "\\n--- DISK USAGE ---" && df -h / && echo "\\n--- CPU USAGE ---" && top -b -n 1 | head -n 10`;
        const result = await executeSSHCommand(cmd);
        return { content: [{ type: 'text', text: `Server Health Report:\\n${result}` }] };
      } catch (e) {
        return { content: [{ type: 'text', text: `Failed: ${e.message}` }], isError: true };
      }
    }

    case 'get_docker_logs': {
      try {
        const { targetEnv, serviceName } = request.params.arguments;
        if (!['test', 'live'].includes(targetEnv)) throw new Error('Invalid targetEnv');
        
        const dir = targetEnv === 'test' ? '/var/www/zinichat-test' : '/var/www/zinichat-live';
        const cmd = `docker compose logs --tail=100 ${serviceName}`;
        const result = await executeSSHCommand(cmd, dir);
        return { content: [{ type: 'text', text: `Logs for ${serviceName} in ${targetEnv}:\\n${result}` }] };
      } catch (e) {
        return { content: [{ type: 'text', text: `Failed: ${e.message}` }], isError: true };
      }
    }

    case 'restart_services': {
      try {
        const { targetEnv } = request.params.arguments;
        if (!['test', 'live'].includes(targetEnv)) throw new Error('Invalid targetEnv');
        
        const dir = targetEnv === 'test' ? '/var/www/zinichat-test' : '/var/www/zinichat-live';
        const cmd = `docker compose restart`;
        const result = await executeSSHCommand(cmd, dir);
        return { content: [{ type: 'text', text: `Successfully restarted ${targetEnv} services:\\n${result}` }] };
      } catch (e) {
        return { content: [{ type: 'text', text: `Failed: ${e.message}` }], isError: true };
      }
    }

    default:
      throw new Error('Unknown tool');
  }
});

// Start the server
async function run() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('ZiniChat Deployment & Monitoring MCP server running on stdio');
}

run().catch((error) => {
  console.error('Fatal error in deploy server:', error);
  process.exit(1);
});
