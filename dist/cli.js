#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createServer } from "./index.js";
// npm/npx launches the bin through a symlink named x402engine-mcp, not index.js.
createServer().connect(new StdioServerTransport()).catch((error) => {
    console.error("Fatal:", error);
    process.exit(1);
});
//# sourceMappingURL=cli.js.map