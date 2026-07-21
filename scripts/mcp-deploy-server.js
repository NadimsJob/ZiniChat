const { Server } = require("@modelcontextprotocol/sdk/server/index.js");
const { StdioServerTransport } = require("@modelcontextprotocol/sdk/server/stdio.js");
const { CallToolRequestSchema, ListToolsRequestSchema } = require("@modelcontextprotocol/sdk/types.js");
const { NodeSSH } = require("node-ssh");
require("dotenv").config({ path: __dirname + "/.env.deploy" });

const server = new Server(
  { name: "deploy-server", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "deploy_to_server",
        description: "Deploys code to the remote server by connecting via SSH, pulling the requested git branch, and executing restart commands.",
        inputSchema: {
          type: "object",
          properties: {
            target: { 
              type: "string", 
              enum: ["test", "live"], 
              description: "The target server to deploy to (test or live)." 
            },
            branch: { 
              type: "string", 
              description: "The git branch to pull (e.g., main or hotfix/notification-ui-backend-fixes)." 
            }
          },
          required: ["target", "branch"]
        }
      }
    ]
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === "deploy_to_server") {
    const { target, branch } = request.params.arguments;
    
    // Load config from environment variables
    const prefix = target.toUpperCase();
    const host = process.env[`${prefix}_SERVER_HOST`];
    const username = process.env[`${prefix}_SERVER_USER`];
    const privateKeyPath = process.env[`${prefix}_SSH_KEY_PATH`];
    const password = process.env[`${prefix}_SERVER_PASSWORD`];
    const projectPath = process.env[`${prefix}_PROJECT_PATH`];
    const restartCmd = process.env[`${prefix}_RESTART_CMD`] || "npm run build && pm2 restart all";

    if (!host || !username || !projectPath) {
      return {
        content: [{ type: "text", text: `Error: Missing SSH configuration for ${target} server in scripts/.env.deploy` }],
        isError: true
      };
    }

    try {
      const ssh = new NodeSSH();
      const sshConfig = { host, username };
      const fs = require('fs');
      if (privateKeyPath) {
        sshConfig.privateKey = fs.readFileSync(privateKeyPath, 'utf8');
      } else if (password) {
        sshConfig.password = password;
      } else {
        // Fallback to PC's default SSH key
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
        `git pull origin ${branch}`,
        restartCmd
      ].join(" && ");

      const result = await ssh.execCommand(commands);
      ssh.dispose();

      if (result.code !== 0) {
        return {
          content: [
            { type: "text", text: `Deployment failed with exit code ${result.code}.\nSTDERR:\n${result.stderr}\nSTDOUT:\n${result.stdout}` }
          ],
          isError: true
        };
      }

      return {
        content: [{ type: "text", text: `Successfully deployed branch '${branch}' to ${target} server.\n\nSTDOUT:\n${result.stdout}` }]
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `SSH Connection Error: ${error.message}` }],
        isError: true
      };
    }
  }
  
  return {
    content: [{ type: "text", text: `Unknown tool: ${request.params.name}` }],
    isError: true
  };
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);
