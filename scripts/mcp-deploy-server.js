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
    version: '1.0.0',
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
        inputSchema: {
          type: 'object',
          properties: {},
          required: [],
        },
      },
      {
        name: 'deploy_live_server',
        description: 'Deploys the ZiniChat application to the Live (Production) server by SSHing, pulling the latest code from the main branch, and rebuilding docker containers.',
        inputSchema: {
          type: 'object',
          properties: {},
          required: [],
        },
      },
    ],
  };
});

// Helper function to connect and execute commands
async function executeDeployment(targetDir, branch) {
  // Reload env in case it changed
  require('dotenv').config({ path: path.join(__dirname, '../backend/.env') });
  const host = process.env.VPS_HOST;
  const username = process.env.VPS_USERNAME || 'root';
  const privateKeyPath = process.env.VPS_PRIVATE_KEY_PATH;

  if (!host || !privateKeyPath) {
    throw new Error('VPS_HOST or VPS_PRIVATE_KEY_PATH is not set in the environment variables.');
  }

  try {
    await ssh.connect({
      host: host,
      username: username,
      privateKeyPath: privateKeyPath,
    });

    const commands = [
      `cd ${targetDir}`,
      `git pull origin ${branch}`,
      `docker compose up -d --build`
    ];

    let output = '';

    for (const cmd of commands) {
      const result = await ssh.execCommand(cmd, { cwd: targetDir });
      output += `\\n--- Executed: ${cmd} ---\\n`;
      output += `STDOUT: ${result.stdout}\\n`;
      if (result.stderr) {
        output += `STDERR: ${result.stderr}\\n`;
      }
      
      if (result.code !== 0) {
        throw new Error(`Command failed: ${cmd}\\n${result.stderr}`);
      }
    }

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
        const result = await executeDeployment('/var/www/zinichat-test', 'staging');
        return {
          content: [
            {
              type: 'text',
              text: `Successfully deployed to TEST server:\\n${result}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Failed to deploy to TEST server: ${error.message}`,
            },
          ],
          isError: true,
        };
      }
    }

    case 'deploy_live_server': {
      try {
        const result = await executeDeployment('/var/www/zinichat-live', 'main');
        return {
          content: [
            {
              type: 'text',
              text: `Successfully deployed to LIVE server:\\n${result}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Failed to deploy to LIVE server: ${error.message}`,
            },
          ],
          isError: true,
        };
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
  console.error('ZiniChat Deployment MCP server running on stdio');
}

run().catch((error) => {
  console.error('Fatal error in deploy server:', error);
  process.exit(1);
});
