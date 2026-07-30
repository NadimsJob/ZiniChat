const { Client } = require("@modelcontextprotocol/sdk/client/index.js");
const { StdioClientTransport } = require("@modelcontextprotocol/sdk/client/stdio.js");

async function deploy(target) {
  const transport = new StdioClientTransport({
    command: "node",
    args: ["mcp-deploy-server.js"]
  });

  const client = new Client(
    { name: "test-client", version: "1.0.0" },
    { capabilities: {} }
  );

  await client.connect(transport);

  console.log(`\n=================== CALLING MCP: DEPLOY TO ${target.toUpperCase()} SERVER ===================`);
  try {
    const result = await client.callTool({
      name: "deploy_to_server",
      arguments: {
        target: target,
        branch: "main"
      }
    }, undefined, { timeout: 600000 }); // 10 minutes timeout

    console.log(JSON.stringify(result, null, 2));
    if (result.isError) throw new Error("Deployment returned error");
  } catch (err) {
    console.error(`Deploy to ${target} failed:`, err);
  } finally {
    await client.close();
  }
}

async function run() {
  await deploy("test");
  await deploy("live");
}

run();
