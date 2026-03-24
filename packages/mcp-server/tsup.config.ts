import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  target: "node22",
  outDir: "dist",
  clean: true,
  // Bundle workspace packages into the output so npm users don't need them
  noExternal: ["@boltclaw/config-engine", "@boltclaw/skill-scanner"],
  // Keep npm packages as dependencies (installed from registry)
  external: ["@modelcontextprotocol/sdk", "zod"],
  banner: {
    js: "#!/usr/bin/env node",
  },
});
