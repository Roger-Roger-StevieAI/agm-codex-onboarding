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
  authModel: "shared_brokered" | "personal_oauth" | "local_cli";
  delivery: string;
  status: string;
  statusDetail: string;
  accountScope: string;
  color: string;
  initials: string;
};

export type HubSnapshot = {
  viewer: HubMember;
  members: HubMember[];
  roles: Array<{ key: string; name: string; description: string; connections: string[] }>;
  connections: HubConnection[];
  availableConnections: Array<{ key: string; name: string; description: string; authModel: string; delivery: string }>;
  requests: Array<{ id: number; requester: string; requesterEmail: string; connectionKey: string; connectionName: string; reason: string; status: string; createdAt: string; decidedBy: string | null }>;
  installationReports: Array<{ id: number; memberEmail: string; connectionKey: string; operatingSystem: string; status: string; detail: string; createdAt: string }>;
  auditEvents: Array<{ id: number; actor: string; event: string; target: string; result: string; createdAt: string }>;
  installer: { repository: string; macCommand: string; windowsCommand: string };
};

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
    db.prepare("CREATE UNIQUE INDEX IF NOT EXISTS hub_role_connections_role_connection_unique ON hub_role_connections (role_key, connection_key)"),
  ]);

  const count = await db.prepare("SELECT COUNT(*) AS count FROM hub_members").first<{ count: number }>();
  if ((count?.count ?? 0) > 0) return;

  await db.batch([
    db.prepare("INSERT INTO hub_role_templates (key, name, description) VALUES (?, ?, ?)").bind("connection-admin", "Connection Hub Admin", "Assign templates, approve requests, manage shared connections, and revoke access."),
    db.prepare("INSERT INTO hub_role_templates (key, name, description) VALUES (?, ?, ?)").bind("staff-tester", "Staff Tester", "Install approved capabilities and verify the employee onboarding experience."),
    db.prepare("INSERT INTO hub_members (name, email, role_key, status, is_admin, initials) VALUES (?, ?, ?, ?, ?, ?)").bind("Stevie Kirk", "stevie@agmagency.com", "connection-admin", "Active", 1, "SK"),
    db.prepare("INSERT INTO hub_members (name, email, role_key, status, is_admin, initials) VALUES (?, ?, ?, ?, ?, ?)").bind("Jean", "jean@agmagency.com", "staff-tester", "Active", 0, "J"),
    db.prepare("INSERT INTO hub_connections (key, name, description, auth_model, delivery, status, status_detail, color, initials) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)").bind("meta-ads", "Meta Ads", "Shared AGM access to assigned Meta Business ad accounts.", "shared_brokered", "Protected MCP", "Setup required", "AGM Meta OAuth has not been connected in Composio.", "#3766e8", "M"),
    db.prepare("INSERT INTO hub_connections (key, name, description, auth_model, delivery, status, status_detail, color, initials) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)").bind("higgsfield", "Higgsfield", "Official CLI plus four durable Codex skills for image and video generation.", "local_cli", "CLI + Codex skills", "Needs login", "Install locally, sign in with Jean's Higgsfield account, then run the test image.", "#18181b", "H"),
    db.prepare("INSERT INTO hub_connections (key, name, description, auth_model, delivery, status, status_detail, color, initials) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)").bind("google-drive", "Google Drive", "Personal Google Drive connection for future role templates.", "personal_oauth", "OAuth + MCP", "Available on request", "A Connection Hub admin must approve this connection before setup.", "#f2b705", "G"),
    db.prepare("INSERT INTO hub_role_connections (role_key, connection_key, account_scope) VALUES (?, ?, ?)").bind("connection-admin", "meta-ads", "All AGM-authorized Meta Business accounts"),
    db.prepare("INSERT INTO hub_role_connections (role_key, connection_key, account_scope) VALUES (?, ?, ?)").bind("connection-admin", "higgsfield", "Administrator test account"),
    db.prepare("INSERT INTO hub_role_connections (role_key, connection_key, account_scope) VALUES (?, ?, ?)").bind("staff-tester", "meta-ads", "Read-only pilot account list and insights"),
    db.prepare("INSERT INTO hub_role_connections (role_key, connection_key, account_scope) VALUES (?, ?, ?)").bind("staff-tester", "higgsfield", "Personal Higgsfield account on this device"),
    db.prepare("INSERT INTO hub_audit_events (actor, event, target, result, created_at) VALUES (?, ?, ?, ?, ?)").bind("Connection Hub", "Initialized onboarding pilot", "Stevie + Jean", "Ready", new Date().toISOString()),
  ]);
}

export async function getMemberByEmail(email: string): Promise<HubMember | null> {
  await initializeHub();
  const row = await database().prepare("SELECT m.id, m.name, m.email, m.role_key AS roleKey, r.name AS roleName, m.status, m.is_admin AS isAdmin, m.initials FROM hub_members m JOIN hub_role_templates r ON r.key = m.role_key WHERE lower(m.email) = lower(?) LIMIT 1").bind(email).first<RawHubMember>();
  return row ? { ...row, isAdmin: Boolean(row.isAdmin) } : null;
}

export async function getHubSnapshot(viewer: HubMember): Promise<HubSnapshot> {
  await initializeHub();
  const db = database();
  const [memberRows, roleRows, roleConnectionRows, connectionRows, availableConnectionRows, requestRows, reportRows, auditRows] = await Promise.all([
    viewer.isAdmin ? db.prepare("SELECT m.id, m.name, m.email, m.role_key AS roleKey, r.name AS roleName, m.status, m.is_admin AS isAdmin, m.initials FROM hub_members m JOIN hub_role_templates r ON r.key = m.role_key ORDER BY m.is_admin DESC, m.name").all() : Promise.resolve({ results: [viewer] }),
    db.prepare("SELECT key, name, description FROM hub_role_templates ORDER BY id").all(),
    db.prepare("SELECT role_key AS roleKey, connection_key AS connectionKey, account_scope AS accountScope FROM hub_role_connections ORDER BY id").all(),
    db.prepare("SELECT c.id, c.key, c.name, c.description, c.auth_model AS authModel, c.delivery, c.status, c.status_detail AS statusDetail, rc.account_scope AS accountScope, c.color, c.initials FROM hub_connections c JOIN hub_role_connections rc ON rc.connection_key = c.key WHERE rc.role_key = ? ORDER BY c.id").bind(viewer.roleKey).all(),
    db.prepare("SELECT key, name, description, auth_model AS authModel, delivery FROM hub_connections WHERE key NOT IN (SELECT connection_key FROM hub_role_connections WHERE role_key = ?) ORDER BY id").bind(viewer.roleKey).all(),
    viewer.isAdmin
      ? db.prepare("SELECT q.id, m.name AS requester, m.email AS requesterEmail, q.connection_key AS connectionKey, c.name AS connectionName, q.reason, q.status, q.created_at AS createdAt, q.decided_by AS decidedBy FROM hub_connection_requests q JOIN hub_members m ON m.id = q.member_id JOIN hub_connections c ON c.key = q.connection_key ORDER BY q.id DESC").all()
      : db.prepare("SELECT q.id, m.name AS requester, m.email AS requesterEmail, q.connection_key AS connectionKey, c.name AS connectionName, q.reason, q.status, q.created_at AS createdAt, q.decided_by AS decidedBy FROM hub_connection_requests q JOIN hub_members m ON m.id = q.member_id JOIN hub_connections c ON c.key = q.connection_key WHERE q.member_id = ? ORDER BY q.id DESC").bind(viewer.id).all(),
    viewer.isAdmin
      ? db.prepare("SELECT r.id, m.email AS memberEmail, r.connection_key AS connectionKey, r.operating_system AS operatingSystem, r.status, r.detail, r.created_at AS createdAt FROM hub_installation_reports r JOIN hub_members m ON m.id = r.member_id ORDER BY r.id DESC LIMIT 50").all()
      : db.prepare("SELECT r.id, m.email AS memberEmail, r.connection_key AS connectionKey, r.operating_system AS operatingSystem, r.status, r.detail, r.created_at AS createdAt FROM hub_installation_reports r JOIN hub_members m ON m.id = r.member_id WHERE r.member_id = ? ORDER BY r.id DESC LIMIT 20").bind(viewer.id).all(),
    viewer.isAdmin ? db.prepare("SELECT id, actor, event, target, result, created_at AS createdAt FROM hub_audit_events ORDER BY id DESC LIMIT 50").all() : Promise.resolve({ results: [] }),
  ]);

  const roleConnections = roleConnectionRows.results as Array<{ roleKey: string; connectionKey: string; accountScope: string }>;
  return {
    viewer,
    members: (memberRows.results as RawHubMember[]).map((member) => ({ ...member, isAdmin: Boolean(member.isAdmin) })),
    roles: (roleRows.results as Array<{ key: string; name: string; description: string }>).map((role) => ({ ...role, connections: roleConnections.filter((item) => item.roleKey === role.key).map((item) => item.connectionKey) })),
    connections: connectionRows.results as HubConnection[],
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
  const assigned = await db.prepare("SELECT 1 AS found FROM hub_role_connections WHERE role_key = ? AND connection_key = ?").bind(member.roleKey, connectionKey).first();
  if (assigned) throw new Error("This connection is already assigned to your role");
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
  const request = await db.prepare("SELECT c.name AS connectionName, m.name AS memberName, m.role_key AS roleKey, q.connection_key AS connectionKey, q.status FROM hub_connection_requests q JOIN hub_connections c ON c.key = q.connection_key JOIN hub_members m ON m.id = q.member_id WHERE q.id = ?").bind(requestId).first<{ connectionName: string; memberName: string; roleKey: string; connectionKey: string; status: string }>();
  if (!request || request.status !== "Pending") throw new Error("This request is no longer pending");
  const statements = [
    db.prepare("UPDATE hub_connection_requests SET status = ?, decided_by = ? WHERE id = ? AND status = 'Pending'").bind(decision, actor.email, requestId),
    db.prepare("INSERT INTO hub_audit_events (actor, event, target, result, created_at) VALUES (?, ?, ?, ?, ?)").bind(actor.name, `${decision} connection request`, `${request?.memberName ?? "Member"} · ${request?.connectionName ?? "Connection"}`, decision, new Date().toISOString()),
  ];
  if (decision === "Approved") statements.push(db.prepare("INSERT OR IGNORE INTO hub_role_connections (role_key, connection_key, account_scope) VALUES (?, ?, ?)").bind(request.roleKey, request.connectionKey, "Approved personal connection"));
  await db.batch(statements);
}

export async function recordInstallation(member: HubMember, connectionKey: string, operatingSystem: string, status: string, detail: string) {
  const assigned = await database().prepare("SELECT 1 AS found FROM hub_role_connections WHERE role_key = ? AND connection_key = ?").bind(member.roleKey, connectionKey).first();
  if (!assigned) throw new Error("This connection is not assigned to your role");
  if (connectionKey === "higgsfield" && status === "Ready" && !/^https?:\/\//im.test(detail)) throw new Error("A completed Higgsfield result URL is required before marking this connection ready");
  const safeDetail = detail.replace(/(token|secret|password|authorization)\s*[:=]\s*\S+/gi, "$1=[redacted]").slice(0, 500);
  await database().prepare("INSERT INTO hub_installation_reports (member_id, connection_key, operating_system, status, detail, created_at) VALUES (?, ?, ?, ?, ?, ?)").bind(member.id, connectionKey, operatingSystem.slice(0, 30), status.slice(0, 40), safeDetail, new Date().toISOString()).run();
}

export async function setConnectionStatus(connectionKey: string, status: string, detail: string) {
  await database().prepare("UPDATE hub_connections SET status = ?, status_detail = ? WHERE key = ?").bind(status, detail, connectionKey).run();
}
