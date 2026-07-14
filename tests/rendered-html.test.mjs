import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("ships the onboarding hub instead of demonstration data", async () => {
  const [page, layout, hub, dashboard, api] = await Promise.all([
    readFile(new URL("app/page.tsx", root), "utf8"),
    readFile(new URL("app/layout.tsx", root), "utf8"),
    readFile(new URL("db/hub.ts", root), "utf8"),
    readFile(new URL("app/ConnectionHub.tsx", root), "utf8"),
    readFile(new URL("app/api/hub/route.ts", root), "utf8"),
  ]);

  assert.match(page, /<ConnectionHub/);
  assert.match(layout, /AGM Codex Onboarding/);
  assert.match(hub, /jean@agmagency\.com/);
  assert.match(hub, /shared_brokered/);
  assert.match(hub, /personal_oauth/);
  assert.match(hub, /local_cli/);
  assert.match(hub, /gmail-app/);
  assert.match(hub, /github-app/);
  assert.match(hub, /composio-mcp/);
  assert.match(hub, /zapier-mcp/);
  assert.match(hub, /catalogConnections/);
  assert.match(dashboard, /Set up, assign, and debug connections/);
  assert.match(dashboard, /set-role-connection/);
  assert.match(dashboard, /Set up & debug/);
  assert.match(dashboard, /Send connections to/);
  assert.match(dashboard, /Create a template/);
  assert.match(api, /setRoleConnection/);
  assert.doesNotMatch(hub, /demonstration/i);
  await assert.rejects(access(new URL("app/_sites-preview/SkeletonPreview.tsx", root)));
});

test("ships provider setup, individual delivery, templates, and persistent diagnostics", async () => {
  const [schema, hub, api, runtime, composio, dashboard, migration] = await Promise.all([
    readFile(new URL("db/schema.ts", root), "utf8"),
    readFile(new URL("db/hub.ts", root), "utf8"),
    readFile(new URL("app/api/hub/route.ts", root), "utf8"),
    readFile(new URL("app/connection-runtime.ts", root), "utf8"),
    readFile(new URL("app/composio-runtime.ts", root), "utf8"),
    readFile(new URL("app/ConnectionHub.tsx", root), "utf8"),
    readFile(new URL("drizzle/0002_wooden_cyclops.sql", root), "utf8"),
  ]);

  for (const source of [schema, hub, migration]) {
    assert.match(source, /hub_connection_configs|connectionConfigs/);
    assert.match(source, /hub_member_connections|memberConnections/);
    assert.match(source, /hub_connection_diagnostics|connectionDiagnostics/);
  }
  assert.match(api, /begin-connection/);
  assert.match(api, /run-diagnostic/);
  assert.match(api, /create-template/);
  assert.match(api, /set-member-connection/);
  assert.match(runtime, /ensureAssigned/);
  assert.match(runtime, /recordDiagnostic/);
  assert.match(composio, /\/connected_accounts\/link/);
  assert.match(composio, /\/logs\/tool_execution/);
  assert.match(composio, /safeDiagnosticTools/);
  assert.match(dashboard, /Create secure sign-in link/);
  assert.match(dashboard, /Diagnostic history/);
  assert.doesNotMatch(composio, /COMPOSIO_API_KEY\s*=/);
});

test("includes a valid public AGM plugin backed by the protected MCP", async () => {
  const [pluginJson, mcpJson, marketplaceJson, route, skill] = await Promise.all([
    readFile(new URL("plugins/agm-codex-onboarding/.codex-plugin/plugin.json", root), "utf8"),
    readFile(new URL("plugins/agm-codex-onboarding/.mcp.json", root), "utf8"),
    readFile(new URL(".agents/plugins/marketplace.json", root), "utf8"),
    readFile(new URL("app/mcp/route.ts", root), "utf8"),
    readFile(new URL("plugins/agm-codex-onboarding/skills/agm-onboarding/SKILL.md", root), "utf8"),
  ]);

  const plugin = JSON.parse(pluginJson);
  const mcp = JSON.parse(mcpJson);
  const marketplace = JSON.parse(marketplaceJson);
  assert.equal(plugin.name, "agm-codex-onboarding");
  assert.equal(plugin.mcpServers, "./.mcp.json");
  assert.equal(marketplace.name, "agm-codex-onboarding");
  assert.equal(marketplace.plugins.length, 1);
  assert.match(mcp.mcpServers["agm-onboarding-hub"].url, /\/mcp$/);
  assert.match(route, /hub_get_my_setup/);
  assert.match(route, /hub_list_assigned_connections/);
  assert.match(route, /hub_request_connection/);
  assert.match(route, /hub_get_request_status/);
  assert.match(route, /hub_test_connection/);
  assert.match(route, /meta_list_ad_accounts/);
  assert.match(route, /meta_get_campaign_insights/);
  assert.match(skill, /result URL/);
});

test("uses database-managed invitations and immediate active-member checks", async () => {
  const [page, hubAccess, api, mcp] = await Promise.all([
    readFile(new URL("app/page.tsx", root), "utf8"),
    readFile(new URL("app/hub-access.ts", root), "utf8"),
    readFile(new URL("app/api/hub/route.ts", root), "utf8"),
    readFile(new URL("app/mcp/route.ts", root), "utf8"),
  ]);

  assert.match(page, /requireAuthorizedHubUser/);
  assert.match(hubAccess, /getMemberByEmail/);
  assert.match(hubAccess, /status === "Active"/);
  assert.doesNotMatch(hubAccess, /HUB_ALLOWED_EMAILS/);
  assert.match(api, /getAuthorizedHubUser/);
  assert.match(mcp, /getAuthorizedHubUser/);
});

test("ships secret-free Mac and Windows installers", async () => {
  const [mac, windows] = await Promise.all([
    readFile(new URL("install/install.sh", root), "utf8"),
    readFile(new URL("install/install.ps1", root), "utf8"),
  ]);

  for (const installer of [mac, windows]) {
    assert.match(installer, /codex plugin marketplace add/);
    assert.match(installer, /codex plugin marketplace upgrade/);
    assert.match(installer, /codex plugin add/);
    assert.match(installer, /higgsfield account status/);
    assert.match(installer, /higgsfield generate create z_image/);
    assert.match(installer, /higgsfield-marketplace-cards/);
    assert.doesNotMatch(installer, /COMPOSIO_API_KEY/);
    assert.doesNotMatch(installer, /access[_-]?token\s*=/i);
  }
  assert.doesNotMatch(mac, /codex plugin list\s*\|/, "Codex list output must not be piped to an early-closing verifier");
});
