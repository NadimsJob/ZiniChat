const { Client } = require("@modelcontextprotocol/sdk/client/index.js");
const { StdioClientTransport } = require("@modelcontextprotocol/sdk/client/stdio.js");

async function main() {
  const transport = new StdioClientTransport({
    command: "node",
    args: ["mcp-deploy-server.js"]
  });

  const client = new Client(
    { name: "test-client", version: "1.0.0" },
    { capabilities: {} }
  );

  await client.connect(transport);

  console.log("Calling deploy_to_server...");
  try {
    const result = await client.callTool({
      name: "deploy_to_server",
      arguments: {
        target: "live",
        branch: "main"
      }
    }, undefined, { timeout: 600000 }); // 10 minutes timeout

    console.log(JSON.stringify(result, null, 2));
  } catch (err) {
    console.error("Deploy failed:", err);
  } finally {
    process.exit(0);
  }
}

main().catch(console.error);
