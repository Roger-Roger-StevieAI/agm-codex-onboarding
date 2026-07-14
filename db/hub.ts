import { env } from "cloudflare:workers";

export type HubMember = {
  id: number;
  name: string;
  email: string;
  roleKey: string;
  roleName: string;
  status: string;
  isAdmin: boolean;
  initials: string;
};

type RawHubMember = Omit<HubMember, "isAdmin"> & { isAdmin: number | boolean };

export type HubConnection = {
  id: number;
  key: string;
  name: string;
  description: string;
  authModel: "shared_brokered" | "personal_oauth" | "local_cli" | "codex_plugin" | "local_mcp" | "platform_mcp";
  delivery: string;
  status: string;
  statusDetail: string;
  accountScope: string;
  color: string;
  initials: string;
  assignmentSource?: "Template" | "Direct";
};

export type HubConnectionConfig = {
  connectionKey: string;
  provider: string;
  toolkitSlug: string | null;
  authConfigId: string | null;
  connectedAccountId: string | null;
  ownerUserId: string | null;
  testToolSlug: string | null;
  testToolVersion: string | null;
  setupNotes: string;
  setupStatus: string;
  lastSyncedAt: string | null;
  lastError: string | null;
};

export type HubDirectAssignment = {
  memberId: number;
  connectionKey: string;
  directAssignment: boolean;
  accountScope: string;
  deliveryStatus: string;
  authConfigId: string | null;
  providerAccountId: string | null;
  providerStatus: string | null;
  assignedBy: string;
  assignedAt: string;
  lastSyncedAt: string | null;
};

export type HubDiagnostic = { id: number; connectionKey: string; memberId: number | null; actor: string; status: string; stage: string; summary: string; detail: string; providerLogId: string | null; durationMs: number; createdAt: string };

export type HubCatalogConnection = Omit<HubConnection, "accountScope"> & { assignedRoles: string[]; directMemberIds: number[]; config: HubConnectionConfig | null };

export type HubSnapshot = {
  viewer: HubMember;
  members: HubMember[];
  roles: Array<{ key: string; name: string; description: string; connections: string[] }>;
  connections: HubConnection[];
  catalogConnections: HubCatalogConnection[];
  directAssignments: HubDirectAssignment[];
  diagnostics: HubDiagnostic[];
  providerState: { composioConfigured: boolean };
  availableConnections: Array<{ key: string; name: string; description: string; authModel: string; delivery: string }>;
  requests: Array<{ id: number; requester: string; requesterEmail: string; connectionKey: string; connectionName: string; reason: string; status: string; createdAt: string; decidedBy: string | null }>;
  installationReports: Array<{ id: number; memberEmail: string; connectionKey: string; operatingSystem: string; status: string; detail: string; createdAt: string }>;
  auditEvents: Array<{ id: number; actor: string; event: string; target: string; result: string; createdAt: string }>;
  installer: { repository: string; macCommand: string; windowsCommand: string };
};

type ConnectionSeed = Omit<HubConnection, "id" | "accountScope"> & { adminScope: string };

type ConfigSeed = Pick<HubConnectionConfig, "connectionKey" | "provider" | "toolkitSlug" | "testToolSlug" | "setupNotes">;

const connectionCatalog: ConnectionSeed[] = [
  { key: "meta-ads", name: "Meta Ads", description: "Shared AGM access to assigned Meta Business ad accounts.", authModel: "shared_brokered", delivery: "Protected MCP", status: "Setup required", statusDetail: "AGM Meta OAuth has not been connected in Composio.", color: "#3766e8", initials: "M", adminScope: "All AGM-authorized Meta Business accounts" },
  { key: "higgsfield", name: "Higgsfield", description: "Official CLI plus four durable Codex skills for image and video generation.", authModel: "local_cli", delivery: "CLI + Codex skills", status: "Needs login", statusDetail: "The CLI and skills are installed; each employee verifies their own local account.", color: "#18181b", initials: "H", adminScope: "Administrator test account" },
  { key: "google-drive", name: "Google Drive", description: "Drive, Docs, Sheets, and Slides tools available to this Codex session.", authModel: "personal_oauth", delivery: "Codex App", status: "Available", statusDetail: "The connector is available; authorization and file visibility remain user-specific.", color: "#f2b705", initials: "GD", adminScope: "Current signed-in Google account" },
  { key: "google-sheets", name: "Google Sheets", description: "Connected spreadsheet access through the AGM Composio project.", authModel: "personal_oauth", delivery: "OAuth + API", status: "Setup required", statusDetail: "Assign it to a template or person, then create their secure Composio sign-in link.", color: "#1f9d55", initials: "GS", adminScope: "Current signed-in Google Sheets account" },
  { key: "gmail-app", name: "Gmail", description: "Search, read, draft, label, and send email through Codex App tools.", authModel: "personal_oauth", delivery: "Codex App", status: "Available", statusDetail: "Gmail tools are present in this Codex session; mailbox authorization remains user-specific.", color: "#d94b3d", initials: "GM", adminScope: "Current signed-in Gmail account" },
  { key: "github-app", name: "GitHub", description: "Repository, issue, pull-request, workflow, and review tools available in Codex.", authModel: "personal_oauth", delivery: "Codex App", status: "Available", statusDetail: "GitHub tools are present in this Codex session; repository access follows the signed-in account.", color: "#24292f", initials: "GH", adminScope: "Repositories permitted to this Codex account" },
  { key: "vercel-app", name: "Vercel", description: "Project, deployment, domain, logs, and runtime management tools.", authModel: "personal_oauth", delivery: "Codex App", status: "Available", statusDetail: "Vercel tools are present in this Codex session; team and project access remain account-scoped.", color: "#000000", initials: "V", adminScope: "Permitted Vercel teams and projects" },
  { key: "documents-plugin", name: "Documents", description: "Create, edit, redline, and verify Word-compatible documents.", authModel: "codex_plugin", delivery: "Codex plugin", status: "Installed", statusDetail: "Installed and enabled in the current Codex profile.", color: "#2b579a", initials: "D", adminScope: "Local document creation and editing" },
  { key: "pdf-plugin", name: "PDF", description: "Read, create, render, and verify PDF documents.", authModel: "codex_plugin", delivery: "Codex plugin", status: "Installed", statusDetail: "Installed and enabled in the current Codex profile.", color: "#c43d35", initials: "P", adminScope: "Local PDF workflows" },
  { key: "spreadsheets-plugin", name: "Spreadsheets", description: "Create, edit, analyze, and verify spreadsheet files.", authModel: "codex_plugin", delivery: "Codex plugin", status: "Installed", statusDetail: "Installed and enabled in the current Codex profile.", color: "#217346", initials: "S", adminScope: "Local spreadsheet workflows" },
  { key: "presentations-plugin", name: "Presentations", description: "Create and edit PowerPoint or Google Slides-compatible decks.", authModel: "codex_plugin", delivery: "Codex plugin", status: "Installed", statusDetail: "Installed and enabled in the current Codex profile.", color: "#b7472a", initials: "PR", adminScope: "Local presentation workflows" },
  { key: "template-creator-plugin", name: "Template Creator", description: "Create reusable Codex artifact-template skills.", authModel: "codex_plugin", delivery: "Codex plugin", status: "Installed", statusDetail: "Installed and enabled in the current Codex profile.", color: "#6d55a3", initials: "TC", adminScope: "Local template creation" },
  { key: "sites-plugin", name: "Sites", description: "Build, publish, and manage hosted websites and dashboards.", authModel: "codex_plugin", delivery: "Codex plugin", status: "Installed", statusDetail: "Installed and enabled in the current Codex profile.", color: "#176b5b", initials: "SI", adminScope: "Sites projects available to this Codex account" },
  { key: "browser-plugin", name: "Browser", description: "Control and test pages through the in-app browser runtime.", authModel: "codex_plugin", delivery: "Codex plugin", status: "Installed", statusDetail: "Installed and enabled in the current Codex profile.", color: "#4275d8", initials: "BR", adminScope: "Browser testing on this device" },
  { key: "chrome-plugin", name: "Chrome", description: "Use existing Chrome tabs and signed-in browser sessions when authorized.", authModel: "codex_plugin", delivery: "Codex plugin", status: "Installed", statusDetail: "Installed and enabled in the current Codex profile.", color: "#4285f4", initials: "CH", adminScope: "Authorized Chrome sessions on this device" },
  { key: "computer-use-plugin", name: "Computer Use", description: "Operate supported local Mac applications through Codex.", authModel: "codex_plugin", delivery: "Codex plugin", status: "Installed", statusDetail: "The plugin is installed; its separate legacy MCP entry is currently disabled.", color: "#5d6770", initials: "CU", adminScope: "Supported applications on this Mac" },
  { key: "visualize-plugin", name: "Visualize", description: "Create interactive visualizations, diagrams, charts, and tools.", authModel: "codex_plugin", delivery: "Codex plugin", status: "Installed", statusDetail: "Installed and enabled in the current Codex profile.", color: "#a05fc7", initials: "VZ", adminScope: "Local visualization workflows" },
  { key: "agm-onboarding-plugin", name: "AGM Codex Onboarding", description: "The public AGM plugin that connects Codex to this onboarding hub.", authModel: "codex_plugin", delivery: "Codex plugin", status: "Installed", statusDetail: "Version 0.2.2 is installed and enabled in the current Codex profile.", color: "#123d32", initials: "AG", adminScope: "AGM onboarding tools" },
  { key: "particl-plugin", name: "Particl Market Research", description: "Connected market-research capability installed from the curated marketplace.", authModel: "codex_plugin", delivery: "Codex plugin", status: "Installed", statusDetail: "Installed and enabled in the current Codex profile.", color: "#ee6a37", initials: "PM", adminScope: "Market research available to this Codex account" },
  { key: "agm-onboarding-hub", name: "AGM Onboarding Hub MCP", description: "Authenticated role, request, inventory, and verification tools for AGM staff.", authModel: "platform_mcp", delivery: "Remote MCP", status: "Enabled", statusDetail: "Configured and enabled in the current Codex profile.", color: "#1d554a", initials: "AH", adminScope: "AGM administrator tools" },
  { key: "composio-mcp", name: "Composio", description: "OAuth MCP gateway for connected application tools and account brokerage.", authModel: "platform_mcp", delivery: "Remote MCP", status: "Enabled", statusDetail: "The Composio MCP is enabled with OAuth; individual toolkit connections remain separately scoped.", color: "#6c47ff", initials: "CO", adminScope: "Connected Composio toolkits for this account" },
  { key: "gemini-audio-mcp", name: "Gemini Audio", description: "Local audio and transcription MCP configured for this Codex profile.", authModel: "local_mcp", delivery: "Local MCP", status: "Enabled", statusDetail: "Configured and enabled locally without exposing its environment values.", color: "#4e7cf2", initials: "GA", adminScope: "Local Gemini audio workflow" },
  { key: "node-repl-mcp", name: "Node Browser Runtime", description: "Local runtime used by Codex for controlled browser and computer interaction.", authModel: "local_mcp", delivery: "Local MCP", status: "Enabled", statusDetail: "Configured and enabled locally; environment values are not copied into the hub.", color: "#4f8f42", initials: "NR", adminScope: "Local browser runtime" },
  { key: "sites-design-picker-mcp", name: "Sites Design Picker", description: "Local MCP supporting interactive design choices for Sites projects.", authModel: "local_mcp", delivery: "Local MCP", status: "Enabled", statusDetail: "Configured and enabled in the current Codex profile.", color: "#b46d3c", initials: "SD", adminScope: "Local Sites design workflows" },
  { key: "zapier-mcp", name: "Zapier", description: "Remote Zapier MCP configuration detected in this Codex profile.", authModel: "platform_mcp", delivery: "Remote MCP", status: "Needs login", statusDetail: "The MCP is enabled but Codex reports that it is not logged in. No URL credential is stored here.", color: "#ff4f00", initials: "Z", adminScope: "No active Zapier account yet" },
  { key: "computer-use-mcp", name: "Computer Use MCP", description: "Legacy local computer-use MCP entry detected alongside the installed plugin.", authModel: "local_mcp", delivery: "Local MCP", status: "Disabled", statusDetail: "The MCP entry is configured but disabled; the installed Computer Use plugin is tracked separately.", color: "#7d858c", initials: "CM", adminScope: "Disabled local MCP entry" },
];

const configSeeds: ConfigSeed[] = [
  { connectionKey: "meta-ads", provider: "composio", toolkitSlug: "metaads", testToolSlug: "METAADS_GET_AD_ACCOUNTS", setupNotes: "Use AGM's custom Meta OAuth application. Keep campaign access read-only during the pilot." },
  { connectionKey: "gmail-app", provider: "composio", toolkitSlug: "gmail", testToolSlug: "GMAIL_GET_PROFILE", setupNotes: "Personal employee OAuth through a hosted Composio Connect Link." },
  { connectionKey: "google-drive", provider: "composio", toolkitSlug: "googledrive", testToolSlug: null, setupNotes: "Personal employee OAuth. Diagnostics verify the connected-account status without reading files." },
  { connectionKey: "google-sheets", provider: "composio", toolkitSlug: "googlesheets", testToolSlug: null, setupNotes: "Personal employee OAuth. Diagnostics verify the connected-account status without reading sheet contents." },
  { connectionKey: "higgsfield", provider: "local", toolkitSlug: null, testToolSlug: null, setupNotes: "Installed and authenticated on the employee's own computer. Never upload the local token." },
];

function database(): D1Database {
  if (!env.DB) throw new Error("Connection Hub database is unavailable");
  return env.DB;
}

export async function initializeHub() {
  const db = database();
  await db.batch([
    db.prepare("CREATE TABLE IF NOT EXISTS hub_members (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE, role_key TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'Active', is_admin INTEGER NOT NULL DEFAULT 0, initials TEXT NOT NULL)"),
    db.prepare("CREATE TABLE IF NOT EXISTS hub_role_templates (id INTEGER PRIMARY KEY AUTOINCREMENT, key TEXT NOT NULL UNIQUE, name TEXT NOT NULL, description TEXT NOT NULL)"),
    db.prepare("CREATE TABLE IF NOT EXISTS hub_connections (id INTEGER PRIMARY KEY AUTOINCREMENT, key TEXT NOT NULL UNIQUE, name TEXT NOT NULL, description TEXT NOT NULL, auth_model TEXT NOT NULL, delivery TEXT NOT NULL, status TEXT NOT NULL, status_detail TEXT NOT NULL, color TEXT NOT NULL, initials TEXT NOT NULL)"),
    db.prepare("CREATE TABLE IF NOT EXISTS hub_role_connections (id INTEGER PRIMARY KEY AUTOINCREMENT, role_key TEXT NOT NULL, connection_key TEXT NOT NULL, account_scope TEXT NOT NULL)"),
    db.prepare("CREATE TABLE IF NOT EXISTS hub_connection_requests (id INTEGER PRIMARY KEY AUTOINCREMENT, member_id INTEGER NOT NULL, connection_key TEXT NOT NULL, reason TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'Pending', created_at TEXT NOT NULL, decided_by TEXT)"),
    db.prepare("CREATE TABLE IF NOT EXISTS hub_installation_reports (id INTEGER PRIMARY KEY AUTOINCREMENT, member_id INTEGER NOT NULL, connection_key TEXT NOT NULL, operating_system TEXT NOT NULL, status TEXT NOT NULL, detail TEXT NOT NULL, created_at TEXT NOT NULL)"),
    db.prepare("CREATE TABLE IF NOT EXISTS hub_audit_events (id INTEGER PRIMARY KEY AUTOINCREMENT, actor TEXT NOT NULL, event TEXT NOT NULL, target TEXT NOT NULL, result TEXT NOT NULL, created_at TEXT NOT NULL)"),
    db.prepare("CREATE TABLE IF NOT EXISTS hub_connection_configs (id INTEGER PRIMARY KEY AUTOINCREMENT, connection_key TEXT NOT NULL UNIQUE, provider TEXT NOT NULL DEFAULT 'manual', toolkit_slug TEXT, auth_config_id TEXT, connected_account_id TEXT, owner_user_id TEXT, test_tool_slug TEXT, test_tool_version TEXT, setup_notes TEXT NOT NULL DEFAULT '', setup_status TEXT NOT NULL DEFAULT 'Not configured', last_synced_at TEXT, last_error TEXT)"),
    db.prepare("CREATE TABLE IF NOT EXISTS hub_member_connections (id INTEGER PRIMARY KEY AUTOINCREMENT, member_id INTEGER NOT NULL, connection_key TEXT NOT NULL, direct_assignment INTEGER NOT NULL DEFAULT 0, account_scope TEXT NOT NULL DEFAULT 'Individual assignment', delivery_status TEXT NOT NULL DEFAULT 'Assigned', auth_config_id TEXT, provider_account_id TEXT, provider_status TEXT, assigned_by TEXT NOT NULL, assigned_at TEXT NOT NULL, last_synced_at TEXT)"),
    db.prepare("CREATE TABLE IF NOT EXISTS hub_connection_diagnostics (id INTEGER PRIMARY KEY AUTOINCREMENT, connection_key TEXT NOT NULL, member_id INTEGER, actor TEXT NOT NULL, status TEXT NOT NULL, stage TEXT NOT NULL, summary TEXT NOT NULL, detail TEXT NOT NULL, provider_log_id TEXT, duration_ms INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL)"),
    db.prepare("CREATE UNIQUE INDEX IF NOT EXISTS hub_role_connections_role_connection_unique ON hub_role_connections (role_key, connection_key)"),
    db.prepare("CREATE UNIQUE INDEX IF NOT EXISTS hub_member_connections_member_connection_unique ON hub_member_connections (member_id, connection_key)"),
  ]);

  const count = await db.prepare("SELECT COUNT(*) AS count FROM hub_members").first<{ count: number }>();
  const seedStatements = [
    db.prepare("INSERT OR IGNORE INTO hub_role_templates (key, name, description) VALUES (?, ?, ?)").bind("connection-admin", "Connection Hub Admin", "Assign templates, approve requests, manage shared connections, and revoke access."),
    db.prepare("INSERT OR IGNORE INTO hub_role_templates (key, name, description) VALUES (?, ?, ?)").bind("staff-tester", "Staff Tester", "Install approved capabilities and verify the employee onboarding experience."),
    db.prepare("INSERT OR IGNORE INTO hub_members (name, email, role_key, status, is_admin, initials) VALUES (?, ?, ?, ?, ?, ?)").bind("Stevie Kirk", "stevie@agmagency.com", "connection-admin", "Active", 1, "SK"),
    db.prepare("INSERT OR IGNORE INTO hub_members (name, email, role_key, status, is_admin, initials) VALUES (?, ?, ?, ?, ?, ?)").bind("Jean", "jean@agmagency.com", "staff-tester", "Active", 0, "J"),
    ...connectionCatalog.map((connection) => db.prepare("INSERT OR IGNORE INTO hub_connections (key, name, description, auth_model, delivery, status, status_detail, color, initials) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)").bind(connection.key, connection.name, connection.description, connection.authModel, connection.delivery, connection.status, connection.statusDetail, connection.color, connection.initials)),
    ...configSeeds.map((config) => db.prepare("INSERT OR IGNORE INTO hub_connection_configs (connection_key, provider, toolkit_slug, test_tool_slug, setup_notes, setup_status) VALUES (?, ?, ?, ?, ?, ?)").bind(config.connectionKey, config.provider, config.toolkitSlug, config.testToolSlug, config.setupNotes, "Not configured")),
    ...connectionCatalog.map((connection) => db.prepare("INSERT OR IGNORE INTO hub_role_connections (role_key, connection_key, account_scope) VALUES (?, ?, ?)").bind("connection-admin", connection.key, connection.adminScope)),
    db.prepare("INSERT OR IGNORE INTO hub_role_connections (role_key, connection_key, account_scope) VALUES (?, ?, ?)").bind("staff-tester", "meta-ads", "Read-only pilot account list and insights"),
    db.prepare("INSERT OR IGNORE INTO hub_role_connections (role_key, connection_key, account_scope) VALUES (?, ?, ?)").bind("staff-tester", "higgsfield", "Personal Higgsfield account on this device"),
    db.prepare("UPDATE hub_connections SET status = 'Available', status_detail = ? WHERE key = 'google-drive' AND status = 'Available on request'").bind("The connector is available; authorization and file visibility remain user-specific."),
  ];
  if ((count?.count ?? 0) === 0) seedStatements.push(db.prepare("INSERT INTO hub_audit_events (actor, event, target, result, created_at) VALUES (?, ?, ?, ?, ?)").bind("Connection Hub", "Initialized onboarding pilot", "Stevie + Jean", "Ready", new Date().toISOString()));
  await db.batch(seedStatements);
}

export async function getMemberByEmail(email: string): Promise<HubMember | null> {
  await initializeHub();
  const row = await database().prepare("SELECT m.id, m.name, m.email, m.role_key AS roleKey, r.name AS roleName, m.status, m.is_admin AS isAdmin, m.initials FROM hub_members m JOIN hub_role_templates r ON r.key = m.role_key WHERE lower(m.email) = lower(?) LIMIT 1").bind(email).first<RawHubMember>();
  return row ? { ...row, isAdmin: Boolean(row.isAdmin) } : null;
}

export async function getHubSnapshot(viewer: HubMember): Promise<HubSnapshot> {
  await initializeHub();
  const db = database();
  const [memberRows, roleRows, roleConnectionRows, connectionRows, catalogRows, configRows, directRows, diagnosticRows, availableConnectionRows, requestRows, reportRows, auditRows] = await Promise.all([
    viewer.isAdmin ? db.prepare("SELECT m.id, m.name, m.email, m.role_key AS roleKey, r.name AS roleName, m.status, m.is_admin AS isAdmin, m.initials FROM hub_members m JOIN hub_role_templates r ON r.key = m.role_key ORDER BY m.is_admin DESC, m.name").all() : Promise.resolve({ results: [viewer] }),
    db.prepare("SELECT key, name, description FROM hub_role_templates ORDER BY id").all(),
    db.prepare("SELECT role_key AS roleKey, connection_key AS connectionKey, account_scope AS accountScope FROM hub_role_connections ORDER BY id").all(),
    db.prepare("SELECT c.id, c.key, c.name, c.description, c.auth_model AS authModel, c.delivery, c.status, c.status_detail AS statusDetail, COALESCE(rc.account_scope, mc.account_scope) AS accountScope, c.color, c.initials, CASE WHEN rc.connection_key IS NOT NULL THEN 'Template' ELSE 'Direct' END AS assignmentSource FROM hub_connections c LEFT JOIN hub_role_connections rc ON rc.connection_key = c.key AND rc.role_key = ? LEFT JOIN hub_member_connections mc ON mc.connection_key = c.key AND mc.member_id = ? AND mc.direct_assignment = 1 WHERE rc.connection_key IS NOT NULL OR mc.connection_key IS NOT NULL GROUP BY c.id ORDER BY c.id").bind(viewer.roleKey, viewer.id).all(),
    viewer.isAdmin ? db.prepare("SELECT id, key, name, description, auth_model AS authModel, delivery, status, status_detail AS statusDetail, color, initials FROM hub_connections ORDER BY name").all() : Promise.resolve({ results: [] }),
    db.prepare("SELECT connection_key AS connectionKey, provider, toolkit_slug AS toolkitSlug, auth_config_id AS authConfigId, connected_account_id AS connectedAccountId, owner_user_id AS ownerUserId, test_tool_slug AS testToolSlug, test_tool_version AS testToolVersion, setup_notes AS setupNotes, setup_status AS setupStatus, last_synced_at AS lastSyncedAt, last_error AS lastError FROM hub_connection_configs ORDER BY connection_key").all(),
    viewer.isAdmin
      ? db.prepare("SELECT member_id AS memberId, connection_key AS connectionKey, direct_assignment AS directAssignment, account_scope AS accountScope, delivery_status AS deliveryStatus, auth_config_id AS authConfigId, provider_account_id AS providerAccountId, provider_status AS providerStatus, assigned_by AS assignedBy, assigned_at AS assignedAt, last_synced_at AS lastSyncedAt FROM hub_member_connections ORDER BY assigned_at DESC").all()
      : db.prepare("SELECT member_id AS memberId, connection_key AS connectionKey, direct_assignment AS directAssignment, account_scope AS accountScope, delivery_status AS deliveryStatus, auth_config_id AS authConfigId, provider_account_id AS providerAccountId, provider_status AS providerStatus, assigned_by AS assignedBy, assigned_at AS assignedAt, last_synced_at AS lastSyncedAt FROM hub_member_connections WHERE member_id = ? ORDER BY assigned_at DESC").bind(viewer.id).all(),
    viewer.isAdmin
      ? db.prepare("SELECT id, connection_key AS connectionKey, member_id AS memberId, actor, status, stage, summary, detail, provider_log_id AS providerLogId, duration_ms AS durationMs, created_at AS createdAt FROM hub_connection_diagnostics ORDER BY id DESC LIMIT 100").all()
      : db.prepare("SELECT id, connection_key AS connectionKey, member_id AS memberId, actor, status, stage, summary, detail, provider_log_id AS providerLogId, duration_ms AS durationMs, created_at AS createdAt FROM hub_connection_diagnostics WHERE member_id = ? ORDER BY id DESC LIMIT 30").bind(viewer.id).all(),
    db.prepare("SELECT key, name, description, auth_model AS authModel, delivery FROM hub_connections WHERE key NOT IN (SELECT connection_key FROM hub_role_connections WHERE role_key = ?) AND key NOT IN (SELECT connection_key FROM hub_member_connections WHERE member_id = ? AND direct_assignment = 1) ORDER BY id").bind(viewer.roleKey, viewer.id).all(),
    viewer.isAdmin
      ? db.prepare("SELECT q.id, m.name AS requester, m.email AS requesterEmail, q.connection_key AS connectionKey, c.name AS connectionName, q.reason, q.status, q.created_at AS createdAt, q.decided_by AS decidedBy FROM hub_connection_requests q JOIN hub_members m ON m.id = q.member_id JOIN hub_connections c ON c.key = q.connection_key ORDER BY q.id DESC").all()
      : db.prepare("SELECT q.id, m.name AS requester, m.email AS requesterEmail, q.connection_key AS connectionKey, c.name AS connectionName, q.reason, q.status, q.created_at AS createdAt, q.decided_by AS decidedBy FROM hub_connection_requests q JOIN hub_members m ON m.id = q.member_id JOIN hub_connections c ON c.key = q.connection_key WHERE q.member_id = ? ORDER BY q.id DESC").bind(viewer.id).all(),
    viewer.isAdmin
      ? db.prepare("SELECT r.id, m.email AS memberEmail, r.connection_key AS connectionKey, r.operating_system AS operatingSystem, r.status, r.detail, r.created_at AS createdAt FROM hub_installation_reports r JOIN hub_members m ON m.id = r.member_id ORDER BY r.id DESC LIMIT 50").all()
      : db.prepare("SELECT r.id, m.email AS memberEmail, r.connection_key AS connectionKey, r.operating_system AS operatingSystem, r.status, r.detail, r.created_at AS createdAt FROM hub_installation_reports r JOIN hub_members m ON m.id = r.member_id WHERE r.member_id = ? ORDER BY r.id DESC LIMIT 20").bind(viewer.id).all(),
    viewer.isAdmin ? db.prepare("SELECT id, actor, event, target, result, created_at AS createdAt FROM hub_audit_events ORDER BY id DESC LIMIT 50").all() : Promise.resolve({ results: [] }),
  ]);

  const roleConnections = roleConnectionRows.results as Array<{ roleKey: string; connectionKey: string; accountScope: string }>;
  const configs = configRows.results as HubConnectionConfig[];
  const directAssignments = (directRows.results as Array<Omit<HubDirectAssignment, "directAssignment"> & { directAssignment: number | boolean }>).map((item) => ({ ...item, directAssignment: Boolean(item.directAssignment) }));
  return {
    viewer,
    members: (memberRows.results as RawHubMember[]).map((member) => ({ ...member, isAdmin: Boolean(member.isAdmin) })),
    roles: (roleRows.results as Array<{ key: string; name: string; description: string }>).map((role) => ({ ...role, connections: roleConnections.filter((item) => item.roleKey === role.key).map((item) => item.connectionKey) })),
    connections: connectionRows.results as HubConnection[],
    catalogConnections: (catalogRows.results as Array<Omit<HubConnection, "accountScope">>).map((connection) => ({ ...connection, assignedRoles: roleConnections.filter((item) => item.connectionKey === connection.key).map((item) => item.roleKey), directMemberIds: directAssignments.filter((item) => item.connectionKey === connection.key && item.directAssignment).map((item) => item.memberId), config: configs.find((item) => item.connectionKey === connection.key) ?? null })),
    directAssignments,
    diagnostics: diagnosticRows.results as HubDiagnostic[],
    providerState: { composioConfigured: Boolean(env.COMPOSIO_API_KEY) },
    availableConnections: availableConnectionRows.results as HubSnapshot["availableConnections"],
    requests: requestRows.results as HubSnapshot["requests"],
    installationReports: reportRows.results as HubSnapshot["installationReports"],
    auditEvents: auditRows.results as HubSnapshot["auditEvents"],
    installer: {
      repository: "https://github.com/Roger-Roger-StevieAI/agm-codex-onboarding",
      macCommand: "curl -fsSL https://raw.githubusercontent.com/Roger-Roger-StevieAI/agm-codex-onboarding/v0.2.2/install/install.sh | bash",
      windowsCommand: "irm https://raw.githubusercontent.com/Roger-Roger-StevieAI/agm-codex-onboarding/v0.2.2/install/install.ps1 | iex",
    },
  };
}

export async function assignRole(memberId: number, roleKey: string, actor: HubMember) {
  if (!actor.isAdmin) throw new Error("Administrator access required");
  const db = database();
  const target = await db.prepare("SELECT name FROM hub_members WHERE id = ?").bind(memberId).first<{ name: string }>();
  await db.batch([
    db.prepare("UPDATE hub_members SET role_key = ? WHERE id = ?").bind(roleKey, memberId),
    db.prepare("INSERT INTO hub_audit_events (actor, event, target, result, created_at) VALUES (?, ?, ?, ?, ?)").bind(actor.name, "Assigned onboarding template", target?.name ?? "Member", "Saved", new Date().toISOString()),
  ]);
}

export async function setRoleConnection(roleKey: string, connectionKey: string, assigned: boolean, actor: HubMember) {
  if (!actor.isAdmin) throw new Error("Administrator access required");
  if (!assigned && roleKey === "connection-admin" && connectionKey === "agm-onboarding-hub") throw new Error("The administrator template must keep the onboarding hub");
  const db = database();
  const [role, connection] = await Promise.all([
    db.prepare("SELECT name FROM hub_role_templates WHERE key = ?").bind(roleKey).first<{ name: string }>(),
    db.prepare("SELECT name FROM hub_connections WHERE key = ?").bind(connectionKey).first<{ name: string }>(),
  ]);
  if (!role || !connection) throw new Error("Unknown role or connection");
  if (assigned) {
    await db.batch([
      db.prepare("INSERT OR IGNORE INTO hub_role_connections (role_key, connection_key, account_scope) VALUES (?, ?, ?)").bind(roleKey, connectionKey, roleKey === "staff-tester" ? "Approved staff test access" : "Current Codex inventory"),
      db.prepare("INSERT INTO hub_audit_events (actor, event, target, result, created_at) VALUES (?, ?, ?, ?, ?)").bind(actor.name, "Assigned connection to template", `${connection.name} · ${role.name}`, "Saved", new Date().toISOString()),
    ]);
    return;
  }
  await db.batch([
    db.prepare("DELETE FROM hub_role_connections WHERE role_key = ? AND connection_key = ?").bind(roleKey, connectionKey),
    db.prepare("INSERT INTO hub_audit_events (actor, event, target, result, created_at) VALUES (?, ?, ?, ?, ?)").bind(actor.name, "Removed connection from template", `${connection.name} · ${role.name}`, "Saved", new Date().toISOString()),
  ]);
}

export async function setMemberStatus(memberId: number, status: "Active" | "Disabled", actor: HubMember) {
  if (!actor.isAdmin) throw new Error("Administrator access required");
  if (memberId === actor.id && status === "Disabled") throw new Error("You cannot disable your own administrator access");
  const db = database();
  const target = await db.prepare("SELECT name FROM hub_members WHERE id = ?").bind(memberId).first<{ name: string }>();
  await db.batch([
    db.prepare("UPDATE hub_members SET status = ? WHERE id = ?").bind(status, memberId),
    db.prepare("INSERT INTO hub_audit_events (actor, event, target, result, created_at) VALUES (?, ?, ?, ?, ?)").bind(actor.name, status === "Disabled" ? "Revoked hub access" : "Restored hub access", target?.name ?? "Member", status, new Date().toISOString()),
  ]);
}

export async function requestConnection(member: HubMember, connectionKey: string, reason: string) {
  const db = database();
  const connection = await db.prepare("SELECT name FROM hub_connections WHERE key = ?").bind(connectionKey).first<{ name: string }>();
  if (!connection) throw new Error("Unknown connection");
  const assigned = await db.prepare("SELECT 1 AS found FROM hub_role_connections WHERE role_key = ? AND connection_key = ? UNION SELECT 1 AS found FROM hub_member_connections WHERE member_id = ? AND connection_key = ? AND direct_assignment = 1 LIMIT 1").bind(member.roleKey, connectionKey, member.id, connectionKey).first();
  if (assigned) throw new Error("This connection is already assigned to you");
  const pending = await db.prepare("SELECT 1 AS found FROM hub_connection_requests WHERE member_id = ? AND connection_key = ? AND status = 'Pending'").bind(member.id, connectionKey).first();
  if (pending) throw new Error("A request for this connection is already pending");
  await db.batch([
    db.prepare("INSERT INTO hub_connection_requests (member_id, connection_key, reason, status, created_at) VALUES (?, ?, ?, 'Pending', ?)").bind(member.id, connectionKey, reason.trim() || "Requested through Connection Hub", new Date().toISOString()),
    db.prepare("INSERT INTO hub_audit_events (actor, event, target, result, created_at) VALUES (?, ?, ?, ?, ?)").bind(member.name, "Requested connection", connection.name, "Pending", new Date().toISOString()),
  ]);
}

export async function decideConnectionRequest(requestId: number, decision: "Approved" | "Denied", actor: HubMember) {
  if (!actor.isAdmin) throw new Error("Administrator access required");
  const db = database();
  const request = await db.prepare("SELECT c.name AS connectionName, m.id AS memberId, m.name AS memberName, m.email AS memberEmail, q.connection_key AS connectionKey, q.status FROM hub_connection_requests q JOIN hub_connections c ON c.key = q.connection_key JOIN hub_members m ON m.id = q.member_id WHERE q.id = ?").bind(requestId).first<{ connectionName: string; memberId: number; memberName: string; memberEmail: string; connectionKey: string; status: string }>();
  if (!request || request.status !== "Pending") throw new Error("This request is no longer pending");
  const statements = [
    db.prepare("UPDATE hub_connection_requests SET status = ?, decided_by = ? WHERE id = ? AND status = 'Pending'").bind(decision, actor.email, requestId),
    db.prepare("INSERT INTO hub_audit_events (actor, event, target, result, created_at) VALUES (?, ?, ?, ?, ?)").bind(actor.name, `${decision} connection request`, `${request?.memberName ?? "Member"} · ${request?.connectionName ?? "Connection"}`, decision, new Date().toISOString()),
  ];
  if (decision === "Approved") statements.push(db.prepare("INSERT INTO hub_member_connections (member_id, connection_key, direct_assignment, account_scope, delivery_status, assigned_by, assigned_at) VALUES (?, ?, 1, 'Approved individual request', 'Sent', ?, ?) ON CONFLICT(member_id, connection_key) DO UPDATE SET direct_assignment = 1, account_scope = 'Approved individual request', delivery_status = 'Sent', assigned_by = excluded.assigned_by, assigned_at = excluded.assigned_at").bind(request.memberId, request.connectionKey, actor.email, new Date().toISOString()));
  await db.batch(statements);
}

export async function recordInstallation(member: HubMember, connectionKey: string, operatingSystem: string, status: string, detail: string) {
  const assigned = await database().prepare("SELECT 1 AS found FROM hub_role_connections WHERE role_key = ? AND connection_key = ? UNION SELECT 1 AS found FROM hub_member_connections WHERE member_id = ? AND connection_key = ? AND direct_assignment = 1 LIMIT 1").bind(member.roleKey, connectionKey, member.id, connectionKey).first();
  if (!assigned) throw new Error("This connection is not assigned to you");
  if (connectionKey === "higgsfield" && status === "Ready" && !/^https?:\/\//im.test(detail)) throw new Error("A completed Higgsfield result URL is required before marking this connection ready");
  const safeDetail = detail.replace(/(token|secret|password|authorization)\s*[:=]\s*\S+/gi, "$1=[redacted]").slice(0, 500);
  await database().prepare("INSERT INTO hub_installation_reports (member_id, connection_key, operating_system, status, detail, created_at) VALUES (?, ?, ?, ?, ?, ?)").bind(member.id, connectionKey, operatingSystem.slice(0, 30), status.slice(0, 40), safeDetail, new Date().toISOString()).run();
}

export async function setConnectionStatus(connectionKey: string, status: string, detail: string) {
  await database().prepare("UPDATE hub_connections SET status = ?, status_detail = ? WHERE key = ?").bind(status, detail, connectionKey).run();
}

function safeSlug(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48);
}

export async function getMemberById(memberId: number) {
  const row = await database().prepare("SELECT m.id, m.name, m.email, m.role_key AS roleKey, r.name AS roleName, m.status, m.is_admin AS isAdmin, m.initials FROM hub_members m JOIN hub_role_templates r ON r.key = m.role_key WHERE m.id = ? LIMIT 1").bind(memberId).first<RawHubMember>();
  return row ? { ...row, isAdmin: Boolean(row.isAdmin) } : null;
}

export async function inviteMember(input: { name: string; email: string; roleKey: string }, actor: HubMember) {
  if (!actor.isAdmin) throw new Error("Administrator access required");
  const name = input.name.trim().slice(0, 100);
  const email = input.email.trim().toLowerCase().slice(0, 200);
  if (!name || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error("Enter a valid name and email address");
  const role = await database().prepare("SELECT name FROM hub_role_templates WHERE key = ?").bind(input.roleKey).first<{ name: string }>();
  if (!role) throw new Error("Unknown template");
  const memberInitials = name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
  await database().batch([
    database().prepare("INSERT INTO hub_members (name, email, role_key, status, is_admin, initials) VALUES (?, ?, ?, 'Active', 0, ?)").bind(name, email, input.roleKey, memberInitials || "U"),
    database().prepare("INSERT INTO hub_audit_events (actor, event, target, result, created_at) VALUES (?, ?, ?, ?, ?)").bind(actor.name, "Invited staff member", email, role.name, new Date().toISOString()),
  ]);
}

export async function setMemberConnection(input: { memberId: number; connectionKey: string; assigned: boolean; accountScope?: string }, actor: HubMember) {
  if (!actor.isAdmin) throw new Error("Administrator access required");
  const db = database();
  const [member, connection] = await Promise.all([
    db.prepare("SELECT name, email FROM hub_members WHERE id = ?").bind(input.memberId).first<{ name: string; email: string }>(),
    db.prepare("SELECT name FROM hub_connections WHERE key = ?").bind(input.connectionKey).first<{ name: string }>(),
  ]);
  if (!member || !connection) throw new Error("Unknown staff member or connection");
  const now = new Date().toISOString();
  if (input.assigned) {
    await db.batch([
      db.prepare("INSERT INTO hub_member_connections (member_id, connection_key, direct_assignment, account_scope, delivery_status, assigned_by, assigned_at) VALUES (?, ?, 1, ?, 'Sent', ?, ?) ON CONFLICT(member_id, connection_key) DO UPDATE SET direct_assignment = 1, account_scope = excluded.account_scope, delivery_status = 'Sent', assigned_by = excluded.assigned_by, assigned_at = excluded.assigned_at").bind(input.memberId, input.connectionKey, (input.accountScope?.trim() || "Individual staff assignment").slice(0, 200), actor.email, now),
      db.prepare("INSERT INTO hub_audit_events (actor, event, target, result, created_at) VALUES (?, ?, ?, ?, ?)").bind(actor.name, "Sent connection to staff", `${connection.name} · ${member.email}`, "Sent", now),
    ]);
    return;
  }
  await db.batch([
    db.prepare("UPDATE hub_member_connections SET direct_assignment = 0, delivery_status = 'Revoked' WHERE member_id = ? AND connection_key = ?").bind(input.memberId, input.connectionKey),
    db.prepare("INSERT INTO hub_audit_events (actor, event, target, result, created_at) VALUES (?, ?, ?, ?, ?)").bind(actor.name, "Revoked direct connection", `${connection.name} · ${member.email}`, "Revoked", now),
  ]);
}

export async function saveMemberProviderState(input: { memberId: number; connectionKey: string; authConfigId?: string | null; providerAccountId?: string | null; providerStatus: string; directAssignment?: boolean }, actor: HubMember) {
  const now = new Date().toISOString();
  await database().prepare("INSERT INTO hub_member_connections (member_id, connection_key, direct_assignment, account_scope, delivery_status, auth_config_id, provider_account_id, provider_status, assigned_by, assigned_at, last_synced_at) VALUES (?, ?, ?, 'Personal provider account', ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(member_id, connection_key) DO UPDATE SET auth_config_id = excluded.auth_config_id, provider_account_id = excluded.provider_account_id, provider_status = excluded.provider_status, delivery_status = excluded.delivery_status, last_synced_at = excluded.last_synced_at").bind(input.memberId, input.connectionKey, input.directAssignment ? 1 : 0, input.providerStatus === "ACTIVE" ? "Connected" : input.providerStatus, input.authConfigId ?? null, input.providerAccountId ?? null, input.providerStatus, actor.email, now, now).run();
}

export async function getConnectionConfig(connectionKey: string): Promise<HubConnectionConfig | null> {
  return database().prepare("SELECT connection_key AS connectionKey, provider, toolkit_slug AS toolkitSlug, auth_config_id AS authConfigId, connected_account_id AS connectedAccountId, owner_user_id AS ownerUserId, test_tool_slug AS testToolSlug, test_tool_version AS testToolVersion, setup_notes AS setupNotes, setup_status AS setupStatus, last_synced_at AS lastSyncedAt, last_error AS lastError FROM hub_connection_configs WHERE connection_key = ?").bind(connectionKey).first<HubConnectionConfig>();
}

export async function saveConnectionConfig(input: Omit<HubConnectionConfig, "lastSyncedAt" | "lastError">, actor: HubMember) {
  if (!actor.isAdmin) throw new Error("Administrator access required");
  const connection = await database().prepare("SELECT name FROM hub_connections WHERE key = ?").bind(input.connectionKey).first<{ name: string }>();
  if (!connection) throw new Error("Unknown connection");
  const provider = ["composio", "codex", "local", "manual"].includes(input.provider) ? input.provider : "manual";
  await database().batch([
    database().prepare("INSERT INTO hub_connection_configs (connection_key, provider, toolkit_slug, auth_config_id, connected_account_id, owner_user_id, test_tool_slug, test_tool_version, setup_notes, setup_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(connection_key) DO UPDATE SET provider = excluded.provider, toolkit_slug = excluded.toolkit_slug, auth_config_id = excluded.auth_config_id, connected_account_id = excluded.connected_account_id, owner_user_id = excluded.owner_user_id, test_tool_slug = excluded.test_tool_slug, test_tool_version = excluded.test_tool_version, setup_notes = excluded.setup_notes, setup_status = excluded.setup_status").bind(input.connectionKey, provider, input.toolkitSlug || null, input.authConfigId || null, input.connectedAccountId || null, input.ownerUserId || null, input.testToolSlug || null, input.testToolVersion || null, input.setupNotes.slice(0, 1000), input.setupStatus.slice(0, 60)),
    database().prepare("INSERT INTO hub_audit_events (actor, event, target, result, created_at) VALUES (?, ?, ?, ?, ?)").bind(actor.name, "Updated connection setup", connection.name, "Saved", new Date().toISOString()),
  ]);
}

export async function updateConnectionRuntime(input: { connectionKey: string; setupStatus: string; connectedAccountId?: string | null; authConfigId?: string | null; ownerUserId?: string | null; lastError?: string | null }) {
  await database().prepare("UPDATE hub_connection_configs SET setup_status = ?, connected_account_id = COALESCE(?, connected_account_id), auth_config_id = COALESCE(?, auth_config_id), owner_user_id = COALESCE(?, owner_user_id), last_synced_at = ?, last_error = ? WHERE connection_key = ?").bind(input.setupStatus, input.connectedAccountId ?? null, input.authConfigId ?? null, input.ownerUserId ?? null, new Date().toISOString(), input.lastError ?? null, input.connectionKey).run();
}

export async function recordDiagnostic(input: Omit<HubDiagnostic, "id" | "createdAt">) {
  const safeDetail = input.detail.replace(/(token|secret|password|authorization|api[_-]?key)\s*[:=]\s*\S+/gi, "$1=[redacted]").slice(0, 1500);
  const createdAt = new Date().toISOString();
  await database().batch([
    database().prepare("INSERT INTO hub_connection_diagnostics (connection_key, member_id, actor, status, stage, summary, detail, provider_log_id, duration_ms, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").bind(input.connectionKey, input.memberId, input.actor, input.status, input.stage, input.summary.slice(0, 300), safeDetail, input.providerLogId, Math.max(0, Math.round(input.durationMs)), createdAt),
    database().prepare("INSERT INTO hub_audit_events (actor, event, target, result, created_at) VALUES (?, ?, ?, ?, ?)").bind(input.actor, "Ran connection diagnostic", input.connectionKey, input.status, createdAt),
  ]);
}

export async function createRoleTemplate(input: { name: string; description: string }, actor: HubMember) {
  if (!actor.isAdmin) throw new Error("Administrator access required");
  const name = input.name.trim().slice(0, 100);
  if (!name) throw new Error("Template name is required");
  let key = safeSlug(name);
  if (!key) throw new Error("Template name must contain letters or numbers");
  const existing = await database().prepare("SELECT 1 AS found FROM hub_role_templates WHERE key = ?").bind(key).first();
  if (existing) key = `${key}-${Date.now().toString(36).slice(-4)}`;
  await database().batch([
    database().prepare("INSERT INTO hub_role_templates (key, name, description) VALUES (?, ?, ?)").bind(key, name, input.description.trim().slice(0, 500) || "Custom AGM connection template."),
    database().prepare("INSERT INTO hub_audit_events (actor, event, target, result, created_at) VALUES (?, ?, ?, ?, ?)").bind(actor.name, "Created onboarding template", name, "Saved", new Date().toISOString()),
  ]);
}

export async function updateRoleTemplate(input: { roleKey: string; name: string; description: string }, actor: HubMember) {
  if (!actor.isAdmin) throw new Error("Administrator access required");
  if (!input.name.trim()) throw new Error("Template name is required");
  await database().batch([
    database().prepare("UPDATE hub_role_templates SET name = ?, description = ? WHERE key = ?").bind(input.name.trim().slice(0, 100), input.description.trim().slice(0, 500), input.roleKey),
    database().prepare("INSERT INTO hub_audit_events (actor, event, target, result, created_at) VALUES (?, ?, ?, ?, ?)").bind(actor.name, "Updated onboarding template", input.name.trim().slice(0, 100), "Saved", new Date().toISOString()),
  ]);
}

export async function deleteRoleTemplate(roleKey: string, actor: HubMember) {
  if (!actor.isAdmin) throw new Error("Administrator access required");
  if (["connection-admin", "staff-tester"].includes(roleKey)) throw new Error("Pilot templates are protected");
  const db = database();
  const role = await db.prepare("SELECT name FROM hub_role_templates WHERE key = ?").bind(roleKey).first<{ name: string }>();
  if (!role) throw new Error("Unknown template");
  const member = await db.prepare("SELECT 1 AS found FROM hub_members WHERE role_key = ? LIMIT 1").bind(roleKey).first();
  if (member) throw new Error("Move staff off this template before deleting it");
  await db.batch([
    db.prepare("DELETE FROM hub_role_connections WHERE role_key = ?").bind(roleKey),
    db.prepare("DELETE FROM hub_role_templates WHERE key = ?").bind(roleKey),
    db.prepare("INSERT INTO hub_audit_events (actor, event, target, result, created_at) VALUES (?, ?, ?, ?, ?)").bind(actor.name, "Deleted onboarding template", role.name, "Deleted", new Date().toISOString()),
  ]);
}

export async function createConnection(input: { name: string; description: string; authModel: HubConnection["authModel"]; delivery: string; provider: string; toolkitSlug?: string }, actor: HubMember) {
  if (!actor.isAdmin) throw new Error("Administrator access required");
  const name = input.name.trim().slice(0, 100);
  if (!name) throw new Error("Connection name is required");
  const authModels: HubConnection["authModel"][] = ["shared_brokered", "personal_oauth", "local_cli", "codex_plugin", "local_mcp", "platform_mcp"];
  if (!authModels.includes(input.authModel)) throw new Error("Choose a supported authentication model");
  const provider = ["composio", "codex", "local", "manual"].includes(input.provider) ? input.provider : "manual";
  let key = safeSlug(name);
  const db = database();
  if (await db.prepare("SELECT 1 AS found FROM hub_connections WHERE key = ?").bind(key).first()) key = `${key}-${Date.now().toString(36).slice(-4)}`;
  const initials = name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
  await db.batch([
    db.prepare("INSERT INTO hub_connections (key, name, description, auth_model, delivery, status, status_detail, color, initials) VALUES (?, ?, ?, ?, ?, 'Setup required', 'Configure the provider, connect an account, then run a diagnostic.', '#3d6f66', ?)").bind(key, name, input.description.trim().slice(0, 500) || "Custom AGM connection.", input.authModel, input.delivery.trim().slice(0, 80) || "Managed connection", initials || "C"),
    db.prepare("INSERT INTO hub_connection_configs (connection_key, provider, toolkit_slug, setup_notes, setup_status) VALUES (?, ?, ?, '', 'Not configured')").bind(key, provider, input.toolkitSlug?.trim().toLowerCase() || null),
    db.prepare("INSERT INTO hub_audit_events (actor, event, target, result, created_at) VALUES (?, ?, ?, ?, ?)").bind(actor.name, "Created connection", name, "Setup required", new Date().toISOString()),
  ]);
}
