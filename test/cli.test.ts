import { afterAll, beforeAll, expect, it } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { mkdtemp, readFile, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createServer, type Server } from "node:http";
import { once } from "node:events";

let directory: string;
let gateway: Server;
let baseUrl: string;
beforeAll(async () => {
  directory = await mkdtemp(path.join(tmpdir(), "x402-mcp-bin-"));
  gateway = createServer((req, res) => {
    expect(req.url).toBe("/.well-known/x402.json");
    expect(req.headers["payment-signature"]).toBeUndefined();
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({ services: [{ id: "example", price: "$0.01" }] }));
  }).listen(0, "127.0.0.1");
  await once(gateway, "listening");
  baseUrl = `http://127.0.0.1:${(gateway.address() as { port: number }).port}`;
});
afterAll(async () => {
  await new Promise<void>(resolve => gateway.close(() => resolve()));
  await rm(directory, { recursive: true, force: true });
});

it("initializes and discovers without credentials through the npm bin symlink", async () => {
  const root = fileURLToPath(new URL("../", import.meta.url));
  const pkg = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));
  const binary = path.join(directory, "x402engine-mcp");
  await symlink(path.join(root, pkg.bin["x402engine-mcp"]), binary);
  const client = new Client({ name: "bin-test", version: "1.0.0" });
  const transport = new StdioClientTransport({ command: process.execPath, args: [binary],
    env: { PATH: process.env.PATH!, X402_BASE_URL: baseUrl, X402_PAYMENT_NETWORK: "auto" } });
  try {
    await client.connect(transport, { timeout: 5000 });
    const { tools } = await client.listTools();
    expect(tools.some(tool => tool.name === "discover_services")).toBe(true);
    const result = await client.callTool({ name: "discover_services", arguments: {} });
    const text = result.content as { type: string; text: string }[];
    expect(JSON.parse(text.find(item => item.type === "text")!.text)).toEqual({ services: [{ id: "example", price: "$0.01" }] });
  } finally {
    await client.close();
  }
}, 10000);
