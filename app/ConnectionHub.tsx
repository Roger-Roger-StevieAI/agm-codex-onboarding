"use client";

import { useEffect, useState } from "react";

type View = "setup" | "connections" | "team" | "templates" | "requests" | "activity";
type Member = { id: number; name: string; email: string; roleKey: string; roleName: string; status: string; isAdmin: boolean; initials: string };
type Connection = { id: number; key: string; name: string; description: string; authModel: string; delivery: string; status: string; statusDetail: string; accountScope: string; color: string; initials: string };
type Snapshot = {
  viewer: Member;
  members: Member[];
  roles: Array<{ key: string; name: string; description: string; connections: string[] }>;
  connections: Connection[];
  catalogConnections: Array<Omit<Connection, "accountScope"> & { assignedRoles: string[] }>;
  availableConnections: Array<{ key: string; name: string; description: string; authModel: string; delivery: string }>;
  requests: Array<{ id: number; requester: string; requesterEmail: string; connectionKey: string; connectionName: string; reason: string; status: string; createdAt: string; decidedBy: string | null }>;
  installationReports: Array<{ id: number; memberEmail: string; connectionKey: string; operatingSystem: string; status: string; detail: string; createdAt: string }>;
  auditEvents: Array<{ id: number; actor: string; event: string; target: string; result: string; createdAt: string }>;
  installer: { repository: string; macCommand: string; windowsCommand: string };
};

const adminNav: Array<{ id: View; label: string; symbol: string }> = [
  { id: "setup", label: "My setup", symbol: "⌂" },
  { id: "connections", label: "Connections", symbol: "⊞" },
  { id: "team", label: "Staff", symbol: "◎" },
  { id: "templates", label: "Templates", symbol: "◇" },
  { id: "requests", label: "Requests", symbol: "✓" },
  { id: "activity", label: "Activity", symbol: "≡" },
];

const staffNav = adminNav.filter((item) => item.id === "setup" || item.id === "requests");

export function ConnectionHub({ viewer }: { viewer: { name: string; email: string; isAdmin: boolean } }) {
  const [view, setView] = useState<View>("setup");
  const [data, setData] = useState<Snapshot | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [os, setOs] = useState<"mac" | "windows">(() => typeof navigator !== "undefined" && /Windows/i.test(navigator.userAgent) ? "windows" : "mac");
  const nav = viewer.isAdmin ? adminNav : staffNav;

  useEffect(() => {
    fetch("/api/hub").then(async (response) => {
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Unable to load onboarding");
      setData(payload as Snapshot);
    }).catch((error) => setNotice(error instanceof Error ? error.message : "Unable to load onboarding"));
  }, []);

  async function mutate(body: Record<string, unknown>, key: string, success: string) {
    setBusy(key);
    setNotice(null);
    try {
      const response = await fetch("/api/hub", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const payload = await response.json() as { snapshot?: Snapshot; error?: string; testResult?: unknown };
      if (!response.ok) throw new Error(payload.error ?? "Update failed");
      if (payload.snapshot) setData(payload.snapshot);
      setNotice(success);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Update failed");
    } finally {
      setBusy(null);
    }
  }

  const pending = data?.requests.filter((request) => request.status === "Pending").length ?? 0;
  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><span className="brand-mark"><i /><i /><i /></span><span>AGM Onboarding</span></div>
      <nav className="main-nav" aria-label="Onboarding navigation">
        <p className="nav-eyebrow">Codex setup</p>
        {nav.map((item) => <button key={item.id} className={view === item.id ? "nav-item active" : "nav-item"} onClick={() => setView(item.id)}><span className="nav-symbol">{item.symbol}</span><span>{item.label}</span>{item.id === "requests" && pending > 0 ? <span className="nav-count">{pending}</span> : null}</button>)}
      </nav>
      <div className="sidebar-callout"><span className="callout-icon">✦</span><strong>One installer</strong><p>Adds the AGM plugin and only the capabilities assigned to your role.</p><span className="plugin-state"><i /> Pilot package</span></div>
      <div className="profile"><span className="avatar admin">{initials(viewer.name)}</span><span><strong>{viewer.name}</strong><small>{viewer.isAdmin ? "Connection Hub admin" : "Staff tester"}</small></span></div>
    </aside>

    <main className="main-content">
      <header className="topbar"><div><p className="mobile-brand">AGM Codex Onboarding</p><h1>{heading(view, viewer.isAdmin)}</h1><p>{subheading(view, viewer.isAdmin)}</p></div></header>
      <div className="mobile-nav" aria-label="Mobile navigation">{nav.map((item) => <button key={item.id} className={view === item.id ? "active" : ""} onClick={() => setView(item.id)}>{item.label}</button>)}</div>
      {notice ? <div className="notice" role="status"><span>✓</span>{notice}<button onClick={() => setNotice(null)} aria-label="Dismiss">×</button></div> : null}
      {!data ? <LoadingState /> : <>
        {view === "setup" ? <MySetup data={data} os={os} setOs={setOs} busy={busy} mutate={mutate} openConnections={() => setView("connections")} notify={setNotice} /> : null}
        {view === "connections" && data.viewer.isAdmin ? <Connections data={data} busy={busy} mutate={mutate} /> : null}
        {view === "team" && data.viewer.isAdmin ? <Team data={data} busy={busy} mutate={mutate} /> : null}
        {view === "templates" && data.viewer.isAdmin ? <Templates data={data} /> : null}
        {view === "requests" ? <Requests data={data} busy={busy} mutate={mutate} /> : null}
        {view === "activity" && data.viewer.isAdmin ? <Activity data={data} /> : null}
      </>}
    </main>
  </div>;
}

function MySetup({ data, os, setOs, busy, mutate, openConnections, notify }: { data: Snapshot; os: "mac" | "windows"; setOs: (os: "mac" | "windows") => void; busy: string | null; mutate: (body: Record<string, unknown>, key: string, success: string) => Promise<void>; openConnections: () => void; notify: (message: string) => void }) {
  const command = os === "mac" ? data.installer.macCommand : data.installer.windowsCommand;
  const ready = data.connections.filter((connection) => isReadyStatus(connection.status)).length;
  const featured = data.connections.filter((connection) => connection.key === "meta-ads" || connection.key === "higgsfield");
  return <div className="page-stack">
    <section className="hero-strip onboarding-hero"><div><span className="eyebrow">Your assigned Codex package</span><h2>Set up once.<br />Start working faster.</h2><p>Your role controls what gets installed and which company connections Codex can use. Provider passwords and API tokens never appear here.</p><div className="role-pill"><span>{data.viewer.initials}</span><div><small>Assigned template</small><strong>{data.viewer.roleName}</strong></div></div></div><div className="setup-score"><span>{ready}/{data.connections.length}</span><strong>capabilities available</strong><small>{data.viewer.email}</small></div></section>
    {data.viewer.isAdmin ? <section className="inventory-callout"><div><span className="inventory-icon">⊞</span><div><span className="eyebrow">Live test inventory</span><h3>{data.catalogConnections.length} Codex connections and capabilities detected</h3><p>Installed plugins, configured MCPs, Codex Apps, and local CLI capabilities are now listed. Assign or remove them from either role template directly.</p></div></div><button className="primary-button" onClick={openConnections}>Manage connections</button></section> : null}
    <section className="split-grid install-layout">
      <article className="card install-card"><div className="card-heading"><div><span className="eyebrow">Step 1</span><h3>Run the AGM installer</h3></div><div className="os-switch"><button className={os === "mac" ? "active" : ""} onClick={() => setOs("mac")}>Mac</button><button className={os === "windows" ? "active" : ""} onClick={() => setOs("windows")}>Windows</button></div></div><p>The installer checks for Codex, adds the public AGM marketplace, installs the onboarding plugin, and adds Higgsfield for assigned staff.</p><div className="command-box"><code>{command}</code><button onClick={async () => { await navigator.clipboard.writeText(command); notify("Installer command copied."); }}>Copy</button></div><ol className="step-list"><li><span>1</span>Open Terminal {os === "windows" ? "or PowerShell" : "on your Mac"}.</li><li><span>2</span>Paste the command and follow the prompts.</li><li><span>3</span>Restart Codex, then ask: “Show my AGM setup.”</li></ol></article>
      <article className="card pilot-note"><span className="callout-icon">⌾</span><h3>Pilot safety</h3><p>Meta is read-only. Higgsfield signs in locally with the employee’s own account. The public installer contains no AGM credentials.</p><a href={data.installer.repository} target="_blank" rel="noreferrer">Review public installer ↗</a></article>
    </section>
    <section className="connection-grid onboarding-grid">{featured.map((connection) => <ConnectionCard key={connection.key} connection={connection} busy={busy} mutate={mutate} />)}</section>
    {data.installationReports.length > 0 ? <section className="card table-card"><div className="card-heading"><div><span className="eyebrow">Verification</span><h3>Recent installation checks</h3></div></div><ReportTable reports={data.installationReports} /></section> : null}
  </div>;
}

function ConnectionCard({ connection, busy, mutate }: { connection: Connection; busy: string | null; mutate: (body: Record<string, unknown>, key: string, success: string) => Promise<void> }) {
  const isMeta = connection.key === "meta-ads";
  return <article className="connection-tile onboarding-tile"><div className="tile-top"><span className="provider-logo large" style={{ background: connection.color }}>{connection.initials}</span><span className={`status ${statusClass(connection.status)}`}><i />{connection.status}</span></div><h3>{connection.name}</h3><p>{connection.description}</p><dl><div><dt>Delivery</dt><dd>{connection.delivery}</dd></div><div><dt>Authentication</dt><dd>{authLabel(connection.authModel)}</dd></div><div><dt>Your scope</dt><dd>{connection.accountScope}</dd></div></dl><div className="connection-detail">{connection.statusDetail}</div>{isMeta ? <button className="mini-primary full-action" disabled={busy === "test-meta"} onClick={() => mutate({ action: "test-meta" }, "test-meta", "Meta account access was verified without changing any ad data.")}>{busy === "test-meta" ? "Checking…" : "Test read-only Meta access"}</button> : <div className="local-check"><strong>After install</strong><span>Run <code>higgsfield auth login</code>, then generate one test image.</span></div>}</article>;
}

function Connections({ data, busy, mutate }: { data: Snapshot; busy: string | null; mutate: (body: Record<string, unknown>, key: string, success: string) => Promise<void> }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "plugins" | "mcps" | "apps" | "attention">("all");
  const normalizedQuery = query.trim().toLowerCase();
  const filtered = data.catalogConnections.filter((connection) => {
    const matchesQuery = !normalizedQuery || `${connection.name} ${connection.description} ${connection.delivery} ${connection.status}`.toLowerCase().includes(normalizedQuery);
    const matchesFilter = filter === "all"
      || (filter === "plugins" && connection.delivery === "Codex plugin")
      || (filter === "mcps" && connection.delivery.includes("MCP"))
      || (filter === "apps" && connection.delivery === "Codex App")
      || (filter === "attention" && ["Setup required", "Needs login", "Disabled"].includes(connection.status));
    return matchesQuery && matchesFilter;
  });
  const configured = data.catalogConnections.filter((connection) => isReadyStatus(connection.status)).length;
  const attention = data.catalogConnections.length - configured;

  return <div className="page-stack">
    <section className="inventory-summary-grid">
      <article className="inventory-stat"><span>⊞</span><div><strong>{data.catalogConnections.length}</strong><small>Detected capabilities</small></div></article>
      <article className="inventory-stat"><span>✓</span><div><strong>{configured}</strong><small>Installed or enabled</small></div></article>
      <article className="inventory-stat"><span>!</span><div><strong>{attention}</strong><small>Need attention or login</small></div></article>
      <article className="inventory-stat wide"><span>◎</span><div><strong>Secrets excluded</strong><small>No MCP URLs, tokens, environment values, or local credentials were copied.</small></div></article>
    </section>
    <section className="card inventory-controls">
      <div><span className="eyebrow">Current Codex inventory</span><h3>Search and assign connections</h3><p>Click a role button on any card to add or remove that capability from its onboarding template.</p></div>
      <label className="inventory-search"><span>Search</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find Gmail, MCP, PDF…" /></label>
      <div className="filter-row" aria-label="Connection filters">{(["all", "plugins", "mcps", "apps", "attention"] as const).map((option) => <button key={option} className={filter === option ? "active" : ""} onClick={() => setFilter(option)}>{option === "all" ? "All" : option === "mcps" ? "MCPs" : option[0].toUpperCase() + option.slice(1)}</button>)}</div>
    </section>
    <section className="catalog-grid" aria-label="Codex connection catalog">{filtered.map((connection) => <article className="catalog-card" key={connection.key}>
      <div className="catalog-card-top"><span className="provider-logo large" style={{ background: connection.color }}>{connection.initials}</span><span className={`status ${statusClass(connection.status)}`}><i />{connection.status}</span></div>
      <div className="catalog-copy"><span className="delivery-label">{connection.delivery}</span><h3>{connection.name}</h3><p>{connection.description}</p></div>
      <div className="catalog-detail">{connection.statusDetail}</div>
      <div className="assignment-list"><span>Role templates</span>{data.roles.map((role) => {
        const assigned = connection.assignedRoles.includes(role.key);
        const protectedAdminHub = role.key === "connection-admin" && connection.key === "agm-onboarding-hub";
        const actionKey = `connection-${connection.key}-${role.key}`;
        return <button key={role.key} className={assigned ? "assigned" : ""} disabled={busy === actionKey || protectedAdminHub} aria-label={`${assigned ? "Remove" : "Assign"} ${connection.name} ${role.name}`} onClick={() => mutate({ action: "set-role-connection", roleKey: role.key, connectionKey: connection.key, assigned: !assigned }, actionKey, `${connection.name} was ${assigned ? "removed from" : "added to"} ${role.name}.`)}><span>{assigned ? "✓" : "+"}</span>{role.name}</button>;
      })}</div>
    </article>)}</section>
    {filtered.length === 0 ? <section className="card empty-state"><span>⌕</span><h3>No matching connections</h3><p>Try another search or filter.</p></section> : null}
  </div>;
}

function Team({ data, busy, mutate }: { data: Snapshot; busy: string | null; mutate: (body: Record<string, unknown>, key: string, success: string) => Promise<void> }) {
  return <section className="card table-card"><div className="card-heading"><div><span className="eyebrow">Invited staff</span><h3>{data.members.length} pilot members</h3></div><span className="helper-text">Disabled members immediately lose dashboard, API, and MCP access</span></div><div className="table-scroll"><table><thead><tr><th>Person</th><th>Template</th><th>Access</th><th>Control</th></tr></thead><tbody>{data.members.map((member) => <tr key={member.id}><td><div className="person-cell"><span className="avatar">{member.initials}</span><span><strong>{member.name}</strong><small>{member.email}</small></span></div></td><td><select value={member.roleKey} disabled={busy === `role-${member.id}`} onChange={(event) => mutate({ action: "assign-role", memberId: member.id, roleKey: event.target.value }, `role-${member.id}`, `${member.name}'s onboarding template was updated.`)}>{data.roles.map((role) => <option key={role.key} value={role.key}>{role.name}</option>)}</select></td><td><span className={`status ${statusClass(member.status)}`}><i />{member.status}</span></td><td><button className={member.status === "Active" ? "danger-link" : "restore-link"} disabled={member.isAdmin || busy === `status-${member.id}`} onClick={() => mutate({ action: "set-member-status", memberId: member.id, status: member.status === "Active" ? "Disabled" : "Active" }, `status-${member.id}`, `${member.name}'s hub access was ${member.status === "Active" ? "revoked" : "restored"}.`)}>{member.isAdmin ? "Protected admin" : member.status === "Active" ? "Revoke" : "Restore"}</button></td></tr>)}</tbody></table></div></section>;
}

function Templates({ data }: { data: Snapshot }) {
  return <div className="role-grid">{data.roles.map((role, index) => <article className="role-card" key={role.key}><div className={`role-banner role-${index + 1}`}><span>{index === 0 ? "A" : "ST"}</span><small>Pilot template</small></div><div className="role-body"><div className="role-title"><div><h3>{role.name}</h3><p>{data.members.filter((member) => member.roleKey === role.key).length} assigned</p></div></div><p>{role.description}</p><div className="chip-list">{role.connections.map((connection) => <span key={connection}>{data.connections.find((item) => item.key === connection)?.name ?? connection}</span>)}</div></div></article>)}</div>;
}

function Requests({ data, busy, mutate }: { data: Snapshot; busy: string | null; mutate: (body: Record<string, unknown>, key: string, success: string) => Promise<void> }) {
  const pending = data.requests.filter((request) => request.status === "Pending");
  const [connectionKey, setConnectionKey] = useState(data.availableConnections[0]?.key ?? "google-drive");
  const [reason, setReason] = useState("");
  return <div className="page-stack">{!data.viewer.isAdmin ? <section className="card request-form"><div><span className="eyebrow">Need another capability?</span><h3>Request a connection</h3><p>Your Connection Hub admin will review the application and account scope before anything is installed.</p></div><label>Connection<select value={connectionKey} onChange={(event) => setConnectionKey(event.target.value)}>{data.availableConnections.map((connection) => <option key={connection.key} value={connection.key}>{connection.name} · {connection.delivery}</option>)}</select></label><label>Why do you need it?<textarea value={reason} maxLength={500} onChange={(event) => setReason(event.target.value)} placeholder="What work will this connection support?" /></label><button className="primary-button" disabled={busy === "request" || !connectionKey} onClick={() => mutate({ action: "request-connection", connectionKey, reason }, "request", "Your request was sent to the Connection Hub administrator.").then(() => setReason(""))}>Send request</button></section> : <section className="approval-intro"><span>✓</span><div><h2>Connection approvals</h2><p>Review requested capabilities before they become part of a staff member’s onboarding template.</p></div></section>}
    <section className="card approval-card"><div className="card-heading"><div><span className="eyebrow">Request queue</span><h3>{pending.length} pending</h3></div></div>{data.requests.length === 0 ? <EmptyState /> : <div className="approval-list">{data.requests.map((request) => <article key={request.id}><div className="approval-avatar">{initials(request.requester)}</div><div className="approval-copy"><span className="risk-tag">{request.status}</span><h3>{request.connectionName}</h3><p>{request.reason}</p><small>{request.requester} · {formatTime(request.createdAt)}</small></div>{data.viewer.isAdmin && request.status === "Pending" ? <div className="approval-actions"><button disabled={busy === `request-${request.id}`} onClick={() => mutate({ action: "decide-request", requestId: request.id, decision: "Denied" }, `request-${request.id}`, "The connection request was denied.")}>Deny</button><button className="approve" disabled={busy === `request-${request.id}`} onClick={() => mutate({ action: "decide-request", requestId: request.id, decision: "Approved" }, `request-${request.id}`, "The connection request was approved.")}>Approve</button></div> : <span className={`status ${statusClass(request.status)}`}><i />{request.status}</span>}</article>)}</div>}</section>
  </div>;
}

function Activity({ data }: { data: Snapshot }) {
  return <div className="page-stack"><section className="card table-card"><div className="card-heading"><div><span className="eyebrow">Security trail</span><h3>Administrator and onboarding activity</h3></div></div><div className="table-scroll"><table><thead><tr><th>Actor</th><th>Event</th><th>Target</th><th>Result</th><th>Time</th></tr></thead><tbody>{data.auditEvents.map((event) => <tr key={event.id}><td><strong>{event.actor}</strong></td><td>{event.event}</td><td className="muted">{event.target}</td><td><span className={`status ${statusClass(event.result)}`}><i />{event.result}</span></td><td className="muted">{formatTime(event.createdAt)}</td></tr>)}</tbody></table></div></section>{data.installationReports.length > 0 ? <section className="card table-card"><div className="card-heading"><h3>Installation reports</h3></div><ReportTable reports={data.installationReports} /></section> : null}</div>;
}

function ReportTable({ reports }: { reports: Snapshot["installationReports"] }) {
  return <div className="table-scroll"><table><thead><tr><th>Member</th><th>Connection</th><th>Computer</th><th>Status</th><th>Time</th></tr></thead><tbody>{reports.map((report) => <tr key={report.id}><td>{report.memberEmail}</td><td>{report.connectionKey}</td><td>{report.operatingSystem}</td><td><span className={`status ${statusClass(report.status)}`}><i />{report.status}</span></td><td className="muted">{formatTime(report.createdAt)}</td></tr>)}</tbody></table></div>;
}

function EmptyState() { return <div className="empty-state"><span>✓</span><h3>No connection requests yet</h3><p>New staff requests will appear here.</p></div>; }
function LoadingState() { return <div className="loading-grid"><span /><span /><span /><span /></div>; }
function initials(value: string) { return value.split(/\s+/).filter(Boolean).map((part) => part[0]).join("").slice(0, 2).toUpperCase(); }
function authLabel(value: string) { return ({ shared_brokered: "AGM shared connection", personal_oauth: "Personal OAuth", local_cli: "Local device login", codex_plugin: "No separate login", local_mcp: "Local configuration", platform_mcp: "MCP authentication" } as Record<string, string>)[value] ?? value; }
function isReadyStatus(status: string) { return ["Ready", "Active", "Approved", "Verified", "Saved", "Installed", "Enabled", "Available"].includes(status); }
function statusClass(status: string) { if (isReadyStatus(status)) return "good"; if (["Setup required", "Needs login", "Pending", "Available on request", "Reported"].includes(status)) return "warn"; if (["Denied", "Disabled", "Failed", "Revoked"].includes(status)) return "bad"; return "neutral"; }
function formatTime(value: string) { const date = new Date(value); return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(date); }
function heading(view: View, admin: boolean) { return ({ setup: admin ? "Your onboarding control" : "Your Codex setup", connections: "Codex connections", team: "Staff onboarding", templates: "Connection templates", requests: "Connection requests", activity: "Onboarding activity" })[view]; }
function subheading(view: View, admin: boolean) { return ({ setup: admin ? "Configure the pilot and verify the same setup staff will receive." : "Install your assigned capabilities and verify each connection.", connections: "Search the detected inventory and change role assignments directly.", team: "Assign reusable templates and revoke access in one place.", templates: "Package approved plugins, MCPs, CLIs, APIs, and account scopes by role.", requests: admin ? "Approve only the connections staff need for their work." : "Ask for an additional application without setting it up manually.", activity: "Review access changes and installation evidence without storing credentials." })[view]; }
