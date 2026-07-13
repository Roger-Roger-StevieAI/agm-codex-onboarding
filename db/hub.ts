import { env } from "cloudflare:workers";

export type HubSnapshot = {
  staff: Array<{ id: number; name: string; email: string; role: string; status: string; initials: string }>;
  roles: Array<{ id: number; name: string; description: string; members: number; providers: string[]; accessLevel: string }>;
  connections: Array<{ id: number; provider: string; scope: string; ownerType: string; status: string; coverage: string; lastChecked: string; color: string; initials: string }>;
  approvals: Array<{ id: number; requester: string; action: string; provider: string; resource: string; risk: string; status: string; createdAt: string }>;
  auditEvents: Array<{ id: number; actor: string; event: string; target: string; result: string; createdAt: string }>;
};

function database(): D1Database {
  if (!env.DB) throw new Error("Connection Hub database is unavailable");
  return env.DB;
}

export async function initializeHub() {
  const db = database();
  await db.batch([
    db.prepare("CREATE TABLE IF NOT EXISTS staff (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE, role TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'Active', initials TEXT NOT NULL)"),
    db.prepare("CREATE TABLE IF NOT EXISTS roles (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE, description TEXT NOT NULL, members INTEGER NOT NULL DEFAULT 0, providers TEXT NOT NULL, access_level TEXT NOT NULL)"),
    db.prepare("CREATE TABLE IF NOT EXISTS connections (id INTEGER PRIMARY KEY AUTOINCREMENT, provider TEXT NOT NULL, scope TEXT NOT NULL, owner_type TEXT NOT NULL, status TEXT NOT NULL, coverage TEXT NOT NULL, last_checked TEXT NOT NULL, color TEXT NOT NULL, initials TEXT NOT NULL)"),
    db.prepare("CREATE TABLE IF NOT EXISTS approvals (id INTEGER PRIMARY KEY AUTOINCREMENT, requester TEXT NOT NULL, action TEXT NOT NULL, provider TEXT NOT NULL, resource TEXT NOT NULL, risk TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'Pending', created_at TEXT NOT NULL)"),
    db.prepare("CREATE TABLE IF NOT EXISTS audit_events (id INTEGER PRIMARY KEY AUTOINCREMENT, actor TEXT NOT NULL, event TEXT NOT NULL, target TEXT NOT NULL, result TEXT NOT NULL, created_at TEXT NOT NULL)"),
  ]);

  const count = await db.prepare("SELECT COUNT(*) AS count FROM roles").first<{ count: number }>();
  if ((count?.count ?? 0) > 0) return;

  await db.batch([
    db.prepare("INSERT INTO roles (name, description, members, providers, access_level) VALUES (?, ?, ?, ?, ?)").bind("Brand Manager", "Manage client campaigns, content, files, and reporting across every assigned brand.", 14, "Meta Ads|Amazon Ads|TikTok Ads|YouTube|GHL|Google Drive|Egnyte|Higgsfield", "Read + confirmed writes"),
    db.prepare("INSERT INTO roles (name, description, members, providers, access_level) VALUES (?, ?, ?, ?, ?)").bind("Accountant", "Review spend, settlements, invoices, billing, and financial exports without campaign editing.", 5, "Meta Billing|Amazon Seller|Amazon Ads|GHL Payments|Google Drive|Egnyte", "Financial read access"),
    db.prepare("INSERT INTO roles (name, description, members, providers, access_level) VALUES (?, ?, ?, ?, ?)").bind("Administrator", "Manage staff, templates, shared connections, approvals, and company access policy.", 3, "Connection Hub|All providers", "Administration"),
    db.prepare("INSERT INTO staff (name, email, role, status, initials) VALUES (?, ?, ?, ?, ?)").bind("Maya Chen", "maya@agmagency.com", "Brand Manager", "Active", "MC"),
    db.prepare("INSERT INTO staff (name, email, role, status, initials) VALUES (?, ?, ?, ?, ?)").bind("Jordan Ellis", "jordan@agmagency.com", "Brand Manager", "Active", "JE"),
    db.prepare("INSERT INTO staff (name, email, role, status, initials) VALUES (?, ?, ?, ?, ?)").bind("Lena Ortiz", "lena@agmagency.com", "Accountant", "Active", "LO"),
    db.prepare("INSERT INTO staff (name, email, role, status, initials) VALUES (?, ?, ?, ?, ?)").bind("Marcus Reed", "marcus@agmagency.com", "Brand Manager", "Needs setup", "MR"),
    db.prepare("INSERT INTO staff (name, email, role, status, initials) VALUES (?, ?, ?, ?, ?)").bind("Priya Shah", "priya@agmagency.com", "Administrator", "Active", "PS"),
    db.prepare("INSERT INTO staff (name, email, role, status, initials) VALUES (?, ?, ?, ?, ?)").bind("Daniel Kim", "daniel@agmagency.com", "Accountant", "Active", "DK"),
    db.prepare("INSERT INTO connections (provider, scope, owner_type, status, coverage, last_checked, color, initials) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").bind("Meta Ads", "Company shared", "Client", "Connected", "20 of 20 clients", "2 min ago", "#3766e8", "M"),
    db.prepare("INSERT INTO connections (provider, scope, owner_type, status, coverage, last_checked, color, initials) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").bind("Google Drive", "Personal OAuth", "Personal", "Connected", "24 staff", "5 min ago", "#f2b705", "G"),
    db.prepare("INSERT INTO connections (provider, scope, owner_type, status, coverage, last_checked, color, initials) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").bind("Egnyte", "Company + personal", "Mixed", "Connected", "22 staff", "8 min ago", "#7b45d6", "E"),
    db.prepare("INSERT INTO connections (provider, scope, owner_type, status, coverage, last_checked, color, initials) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").bind("Higgsfield", "Company workspace", "Company", "Connected", "18 seats", "12 min ago", "#18181b", "H"),
    db.prepare("INSERT INTO connections (provider, scope, owner_type, status, coverage, last_checked, color, initials) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").bind("YouTube", "Client channels", "Client", "Attention", "17 of 20 clients", "1 hr ago", "#e52d27", "Y"),
    db.prepare("INSERT INTO connections (provider, scope, owner_type, status, coverage, last_checked, color, initials) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").bind("GHL", "Agency locations", "Client", "Connected", "20 locations", "18 min ago", "#15a374", "GHL"),
    db.prepare("INSERT INTO connections (provider, scope, owner_type, status, coverage, last_checked, color, initials) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").bind("Amazon", "Seller + Ads", "Client", "Setup required", "0 of 12 clients", "Not connected", "#ef8c1a", "A"),
    db.prepare("INSERT INTO connections (provider, scope, owner_type, status, coverage, last_checked, color, initials) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").bind("TikTok Ads", "Business accounts", "Client", "Setup required", "0 of 8 clients", "Not connected", "#202124", "T"),
    db.prepare("INSERT INTO approvals (requester, action, provider, resource, risk, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)").bind("Maya Chen", "Increase campaign budget to $4,500", "Meta Ads", "Hartwell Summer Launch", "Financial", "Pending", "12 minutes ago"),
    db.prepare("INSERT INTO approvals (requester, action, provider, resource, risk, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)").bind("Jordan Ellis", "Publish product launch video", "YouTube", "Northstar Home", "Publishing", "Pending", "34 minutes ago"),
    db.prepare("INSERT INTO approvals (requester, action, provider, resource, risk, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)").bind("Marcus Reed", "Connect personal Google Drive", "Google Drive", "Personal account", "Connection", "Pending", "1 hour ago"),
    db.prepare("INSERT INTO audit_events (actor, event, target, result, created_at) VALUES (?, ?, ?, ?, ?)").bind("Maya Chen", "Viewed campaign insights", "Meta Ads · all clients", "Allowed", "2 minutes ago"),
    db.prepare("INSERT INTO audit_events (actor, event, target, result, created_at) VALUES (?, ?, ?, ?, ?)").bind("Priya Shah", "Updated role template", "Brand Manager", "Saved", "18 minutes ago"),
    db.prepare("INSERT INTO audit_events (actor, event, target, result, created_at) VALUES (?, ?, ?, ?, ?)").bind("Lena Ortiz", "Exported settlement report", "Amazon · Willow & Pine", "Allowed", "42 minutes ago"),
    db.prepare("INSERT INTO audit_events (actor, event, target, result, created_at) VALUES (?, ?, ?, ?, ?)").bind("Connection Hub", "Blocked unauthorized tool", "Meta Ads · delete campaign", "Blocked", "1 hour ago"),
    db.prepare("INSERT INTO audit_events (actor, event, target, result, created_at) VALUES (?, ?, ?, ?, ?)").bind("Daniel Kim", "Opened billing summary", "GHL · 20 locations", "Allowed", "2 hours ago"),
  ]);
}

export async function getHubSnapshot(): Promise<HubSnapshot> {
  await initializeHub();
  const db = database();
  const [staffRows, roleRows, connectionRows, approvalRows, auditRows] = await Promise.all([
    db.prepare("SELECT id, name, email, role, status, initials FROM staff ORDER BY name").all(),
    db.prepare("SELECT id, name, description, members, providers, access_level AS accessLevel FROM roles ORDER BY id").all(),
    db.prepare("SELECT id, provider, scope, owner_type AS ownerType, status, coverage, last_checked AS lastChecked, color, initials FROM connections ORDER BY id").all(),
    db.prepare("SELECT id, requester, action, provider, resource, risk, status, created_at AS createdAt FROM approvals ORDER BY id DESC").all(),
    db.prepare("SELECT id, actor, event, target, result, created_at AS createdAt FROM audit_events ORDER BY id DESC LIMIT 50").all(),
  ]);

  return {
    staff: staffRows.results as HubSnapshot["staff"],
    roles: (roleRows.results as Array<Omit<HubSnapshot["roles"][number], "providers"> & { providers: string }>).map((role) => ({ ...role, providers: role.providers.split("|") })),
    connections: connectionRows.results as HubSnapshot["connections"],
    approvals: approvalRows.results as HubSnapshot["approvals"],
    auditEvents: auditRows.results as HubSnapshot["auditEvents"],
  };
}

export async function updateStaffRole(id: number, role: string, actor: string) {
  await initializeHub();
  const db = database();
  const person = await db.prepare("SELECT name FROM staff WHERE id = ?").bind(id).first<{ name: string }>();
  await db.batch([
    db.prepare("UPDATE staff SET role = ? WHERE id = ?").bind(role, id),
    db.prepare("INSERT INTO audit_events (actor, event, target, result, created_at) VALUES (?, ?, ?, ?, ?)").bind(actor, "Changed staff role", `${person?.name ?? "Staff member"} → ${role}`, "Saved", "Just now"),
  ]);
}

export async function decideApproval(id: number, status: "Approved" | "Denied", actor: string) {
  await initializeHub();
  const db = database();
  const approval = await db.prepare("SELECT action, provider FROM approvals WHERE id = ?").bind(id).first<{ action: string; provider: string }>();
  await db.batch([
    db.prepare("UPDATE approvals SET status = ? WHERE id = ?").bind(status, id),
    db.prepare("INSERT INTO audit_events (actor, event, target, result, created_at) VALUES (?, ?, ?, ?, ?)").bind(actor, `${status} request`, `${approval?.provider ?? "Provider"} · ${approval?.action ?? "Action"}`, status, "Just now"),
  ]);
}

export async function markConnectionReady(id: number, actor: string) {
  await initializeHub();
  const db = database();
  const connection = await db.prepare("SELECT provider FROM connections WHERE id = ?").bind(id).first<{ provider: string }>();
  await db.batch([
    db.prepare("UPDATE connections SET status = 'Connected', last_checked = 'Just now' WHERE id = ?").bind(id),
    db.prepare("INSERT INTO audit_events (actor, event, target, result, created_at) VALUES (?, ?, ?, ?, ?)").bind(actor, "Completed connection review", connection?.provider ?? "Provider", "Connected", "Just now"),
  ]);
}
