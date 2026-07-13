import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("ships the Connection Hub instead of the starter preview", async () => {
  const [page, layout, packageJson] = await Promise.all([
    readFile(new URL("app/page.tsx", root), "utf8"),
    readFile(new URL("app/layout.tsx", root), "utf8"),
    readFile(new URL("package.json", root), "utf8"),
  ]);

  assert.match(page, /<ConnectionHub/);
  assert.match(layout, /Connection Hub/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
  await assert.rejects(access(new URL("app/_sites-preview/SkeletonPreview.tsx", root)));
});

test("includes a team plugin backed by the MCP gateway", async () => {
  const [pluginJson, mcpJson, route] = await Promise.all([
    readFile(new URL("plugins/connection-hub/.codex-plugin/plugin.json", root), "utf8"),
    readFile(new URL("plugins/connection-hub/.mcp.json", root), "utf8"),
    readFile(new URL("app/mcp/route.ts", root), "utf8"),
  ]);

  const plugin = JSON.parse(pluginJson);
  const mcp = JSON.parse(mcpJson);
  assert.equal(plugin.name, "connection-hub");
  assert.equal(plugin.mcpServers, "./.mcp.json");
  assert.match(mcp.mcpServers["agm-connection-hub"].url, /\/mcp$/);
  assert.match(route, /hub_list_connections/);
  assert.match(route, /readOnlyHint: true/);
});

test("requires ChatGPT identity and an explicit reviewer allowlist", async () => {
  const [page, access, api, mcp] = await Promise.all([
    readFile(new URL("app/page.tsx", root), "utf8"),
    readFile(new URL("app/hub-access.ts", root), "utf8"),
    readFile(new URL("app/api/hub/route.ts", root), "utf8"),
    readFile(new URL("app/mcp/route.ts", root), "utf8"),
  ]);

  assert.match(page, /requireAuthorizedHubUser/);
  assert.match(access, /HUB_ALLOWED_EMAILS/);
  assert.match(api, /getAuthorizedHubUser/);
  assert.match(mcp, /getAuthorizedHubUser/);
});
