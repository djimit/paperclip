#!/usr/bin/env node
import { runServer } from "./index.js";

void runServer().catch(() => {
  console.error("Failed to start Google Sheets MCP server. Check configuration and credentials.");
  process.exit(1);
});
