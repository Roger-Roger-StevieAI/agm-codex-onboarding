"use client";

import { useEffect, useMemo, useState } from "react";

type View = "overview" | "people" | "roles" | "connections" | "approvals" | "audit";
type HubSnapshot = {
  staff: Array<{ id: number; name: string; email: string; role: string; status: string; initials: string }>;
  roles: Array<{ id: number; name: string; description: string; members: number; providers: string[]; accessLevel: string }>;
  connections: Array<{ id: number; provider: string; scope: string; ownerType: string; status: string; coverage: string; lastChecked: string; color: string; initials: string }>;
  approvals: Array<{ id: number; requester: string; action: string; provider: string; resource: string; risk: string; status: string; createdAt: string }>;
  auditEvents: Array<{ id: number; actor: string; event: string; target: string; result: string; createdAt: string }>;
};

const nav: Array<{ id: View; label: string; symbol: string }> = [
  { id: "overview", label: "Overview", symbol: "⌂" },
  { id: "people", label: "People", symbol: "◎" },
  { id: "roles", label: "Role templates", symbol: "◇" },
  { id: "connections", label: "Connections", symbol: "↗" },
  { id: "approvals", label: "Approvals", symbol: "✓" },
  { id: "audit", label: "Audit log", symbol: "≡" },
];

export function ConnectionHub({ viewer }: { viewer: { name: string; email: string } }) {
  const [view, setView] = useState<View>("overview");
  const [data, setData] = useState<HubSnapshot | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [panel, setPanel] = useState<{ type: "connection" | "invite"; id?: number } | null>(null);

  useEffect(() => {
    fetch("/api/hub")
      .then((response) => response.json())
      .then((payload) => setData(payload as HubSnapshot))
      .catch(() => setNotice("The hub could not load. Refresh to try again."));
  }, []);

  async function mutate(body: Record<string, unknown>, key: string, success: string) {
    setBusy(key);
    setNotice(null);
    try {
      const response = await fetch("/api/hub", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = await response.json() as HubSnapshot & { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Update failed");
      setData(payload);
      setNotice(success);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Update failed");
    } finally {
      setBusy(null);
    }
  }

  const pending = data?.approvals.filter((item) => item.status === "Pending").length ?? 0;
  const connected = data?.connections.filter((item) => item.status === "Connected").length ?? 0;
  const filteredPeople = useMemo(() => {
    if (!data) return [];
    const normalized = query.trim().toLowerCase();
    if (!normalized) return data.staff;
    return data.staff.filter((person) => `${person.name} ${person.email} ${person.role}`.toLowerCase().includes(normalized));
  }, [data, query]);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark"><i /><i /><i /></span>
          <span>Connection Hub</span>
        </div>

        <nav className="main-nav" aria-label="Main navigation">
          <p className="nav-eyebrow">Workspace</p>
          {nav.map((item) => (
            <button key={item.id} className={view === item.id ? "nav-item active" : "nav-item"} onClick={() => setView(item.id)}>
              <span className="nav-symbol">{item.symbol}</span>
              <span>{item.label}</span>
              {item.id === "approvals" && pending > 0 ? <span className="nav-count">{pending}</span> : null}
            </button>
          ))}
        </nav>

        <div className="sidebar-callout">
          <span className="callout-icon">✦</span>
          <strong>Codex plugin</strong>
          <p>One private plugin gives staff the tools their role permits.</p>
          <span className="plugin-state"><i /> Ready to install</span>
        </div>

        <div className="profile">
          <span className="avatar admin">{initials(viewer.name)}</span>
          <span><strong>{viewer.name}</strong><small>Workspace admin</small></span>
          <button aria-label="Account menu">•••</button>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div>
            <p className="mobile-brand">Connection Hub</p>
            <h1>{heading(view)}</h1>
            <p>{subheading(view)}</p>
          </div>
          <div className="top-actions">
            {view === "people" ? (
              <label className="search"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search people" /></label>
            ) : null}
            <button className="icon-button" aria-label="Notifications">♢<span /></button>
            <button className="primary-button" onClick={() => setPanel({ type: view === "connections" ? "connection" : "invite" })}>
              <span>+</span>{view === "connections" ? "Add connection" : "Invite staff"}
            </button>
          </div>
        </header>

        <div className="mobile-nav" aria-label="Mobile navigation">
          {nav.map((item) => <button key={item.id} className={view === item.id ? "active" : ""} onClick={() => setView(item.id)}>{item.label}</button>)}
        </div>

        {notice ? <div className="notice" role="status"><span>✓</span>{notice}<button onClick={() => setNotice(null)}>×</button></div> : null}

        {!data ? <LoadingState /> : (
          <>
            {view === "overview" ? <Overview data={data} pending={pending} connected={connected} setView={setView} /> : null}
            {view === "people" ? <People data={data} people={filteredPeople} busy={busy} mutate={mutate} /> : null}
            {view === "roles" ? <Roles data={data} /> : null}
            {view === "connections" ? <Connections data={data} busy={busy} setPanel={setPanel} mutate={mutate} /> : null}
            {view === "approvals" ? <Approvals data={data} busy={busy} mutate={mutate} /> : null}
            {view === "audit" ? <Audit data={data} /> : null}
          </>
        )}
      </main>

      {panel ? <SidePanel panel={panel} connections={data?.connections ?? []} onClose={() => setPanel(null)} onDone={(message) => { setPanel(null); setNotice(message); }} /> : null}
    </div>
  );
}

function Overview({ data, pending, connected, setView }: { data: HubSnapshot; pending: number; connected: number; setView: (view: View) => void }) {
  const activeStaff = data.staff.filter((person) => person.status === "Active").length;
  const attention = data.connections.filter((item) => item.status !== "Connected");
  return (
    <div className="page-stack">
      <section className="hero-strip">
        <div>
          <span className="eyebrow">Company access at a glance</span>
          <h2>One secure front door<br />for every connection.</h2>
          <p>Staff get exactly the tools their role allows—without shared passwords, copied tokens, or manual setup.</p>
          <div className="hero-actions"><button className="dark-button" onClick={() => setView("connections")}>Review connections</button><button className="text-button" onClick={() => setView("roles")}>View role templates <span>→</span></button></div>
        </div>
        <div className="orbit-card" aria-hidden="true">
          <span className="orbit-center"><i /><i /><i /></span>
          <span className="orbit orbit-one"><b style={{ background: "#3766e8" }}>M</b></span>
          <span className="orbit orbit-two"><b style={{ background: "#f2b705" }}>G</b></span>
          <span className="orbit orbit-three"><b style={{ background: "#18181b" }}>H</b></span>
          <span className="orbit orbit-four"><b style={{ background: "#15a374" }}>G</b></span>
          <span className="orbit-ring one" /><span className="orbit-ring two" />
        </div>
      </section>

      <section className="metric-grid">
        <Metric label="Active staff" value={String(activeStaff)} detail={`${data.staff.length} configured in this preview`} tone="mint" symbol="◎" />
        <Metric label="Connected platforms" value={`${connected}/${data.connections.length}`} detail="Live or ready for staff" tone="blue" symbol="↗" />
        <Metric label="Client ad accounts" value="20" detail="All Meta accounts mapped" tone="gold" symbol="◇" />
        <Metric label="Waiting for approval" value={String(pending)} detail="High-impact staff requests" tone="violet" symbol="✓" />
      </section>

      <section className="split-grid">
        <div className="card connections-card">
          <div className="card-heading"><div><span className="eyebrow">Connection health</span><h3>Company platforms</h3></div><button onClick={() => setView("connections")}>View all</button></div>
          <div className="connection-list">
            {data.connections.slice(0, 6).map((connection) => <ConnectionRow key={connection.id} connection={connection} compact />)}
          </div>
        </div>
        <div className="card attention-card">
          <div className="card-heading"><div><span className="eyebrow">Needs attention</span><h3>Finish these next</h3></div><span className="soft-count">{attention.length}</span></div>
          <div className="attention-list">
            {attention.map((item) => (
              <button key={item.id} onClick={() => setView("connections")}>
                <span className="provider-logo" style={{ background: item.color }}>{item.initials}</span>
                <span><strong>{item.provider}</strong><small>{item.coverage}</small></span>
                <span className="chevron">›</span>
              </button>
            ))}
          </div>
          <div className="security-note"><span>⌾</span><div><strong>Security rule</strong><p>Shared passwords and owner browser sessions are never stored in the hub.</p></div></div>
        </div>
      </section>
    </div>
  );
}

function Metric({ label, value, detail, tone, symbol }: { label: string; value: string; detail: string; tone: string; symbol: string }) {
  return <div className="metric-card"><span className={`metric-icon ${tone}`}>{symbol}</span><p>{label}</p><strong>{value}</strong><small><i />{detail}</small></div>;
}

function People({ data, people, busy, mutate }: { data: HubSnapshot; people: HubSnapshot["staff"]; busy: string | null; mutate: (body: Record<string, unknown>, key: string, success: string) => Promise<void> }) {
  return (
    <section className="card table-card">
      <div className="card-heading"><div><span className="eyebrow">Directory</span><h3>{people.length} team members</h3></div><span className="helper-text">Roles control tools and client accounts automatically</span></div>
      <div className="table-scroll"><table><thead><tr><th>Person</th><th>Role template</th><th>Account state</th><th>Access summary</th></tr></thead><tbody>
        {people.map((person) => (
          <tr key={person.id}>
            <td><div className="person-cell"><span className="avatar">{person.initials}</span><span><strong>{person.name}</strong><small>{person.email}</small></span></div></td>
            <td><select aria-label={`Role for ${person.name}`} value={person.role} disabled={busy === `role-${person.id}`} onChange={(event) => mutate({ action: "assign-role", id: person.id, role: event.target.value }, `role-${person.id}`, `${person.name}'s role was updated.`)}>{data.roles.map((role) => <option key={role.id}>{role.name}</option>)}</select></td>
            <td><span className={`status ${statusClass(person.status)}`}><i />{person.status}</span></td>
            <td className="muted">{data.roles.find((role) => role.name === person.role)?.providers.length ?? 0} provider groups</td>
          </tr>
        ))}
      </tbody></table></div>
    </section>
  );
}

function Roles({ data }: { data: HubSnapshot }) {
  return <div className="role-grid">{data.roles.map((role, index) => (
    <article className="role-card" key={role.id}>
      <div className={`role-banner role-${index + 1}`}><span>{index === 0 ? "BM" : index === 1 ? "$" : "A"}</span><small>Template {String(index + 1).padStart(2, "0")}</small></div>
      <div className="role-body"><div className="role-title"><div><h3>{role.name}</h3><p>{role.members} members</p></div><button aria-label={`More options for ${role.name}`}>•••</button></div><p>{role.description}</p><div className="access-label"><span>Access policy</span><strong>{role.accessLevel}</strong></div><div className="chip-list">{role.providers.map((provider) => <span key={provider}>{provider}</span>)}</div><button className="outline-button">Edit template</button></div>
    </article>
  ))}</div>;
}

function Connections({ data, busy, setPanel, mutate }: { data: HubSnapshot; busy: string | null; setPanel: (panel: { type: "connection"; id?: number }) => void; mutate: (body: Record<string, unknown>, key: string, success: string) => Promise<void> }) {
  return <section className="card table-card"><div className="card-heading"><div><span className="eyebrow">Provider catalog</span><h3>{data.connections.length} configured platforms</h3></div><span className="helper-text">Credentials stay with the connection provider</span></div><div className="connection-grid">
    {data.connections.map((connection) => <article className="connection-tile" key={connection.id}><div className="tile-top"><span className="provider-logo large" style={{ background: connection.color }}>{connection.initials}</span><span className={`status ${statusClass(connection.status)}`}><i />{connection.status}</span></div><h3>{connection.provider}</h3><p>{connection.scope}</p><dl><div><dt>Owner</dt><dd>{connection.ownerType}</dd></div><div><dt>Coverage</dt><dd>{connection.coverage}</dd></div><div><dt>Checked</dt><dd>{connection.lastChecked}</dd></div></dl><div className="tile-actions"><button className="outline-button" onClick={() => setPanel({ type: "connection", id: connection.id })}>Review</button>{connection.status !== "Connected" ? <button className="mini-primary" disabled={busy === `connection-${connection.id}`} onClick={() => mutate({ action: "mark-connected", id: connection.id }, `connection-${connection.id}`, `${connection.provider} was marked connected for this preview.`)}>{busy === `connection-${connection.id}` ? "Saving…" : "Mark ready"}</button> : null}</div></article>)}
  </div></section>;
}

function Approvals({ data, busy, mutate }: { data: HubSnapshot; busy: string | null; mutate: (body: Record<string, unknown>, key: string, success: string) => Promise<void> }) {
  const pending = data.approvals.filter((item) => item.status === "Pending");
  const decided = data.approvals.filter((item) => item.status !== "Pending");
  return <div className="page-stack"><section className="approval-intro"><span>✓</span><div><h2>Human approval stays in control.</h2><p>Budget changes, publishing, permissions, deletion, and other high-impact actions stop here before reaching a client account.</p></div></section><section className="card approval-card"><div className="card-heading"><div><span className="eyebrow">Review queue</span><h3>{pending.length} pending requests</h3></div></div>{pending.length === 0 ? <EmptyState /> : <div className="approval-list">{pending.map((item) => <article key={item.id}><div className="approval-avatar">{initials(item.requester)}</div><div className="approval-copy"><span className="risk-tag">{item.risk}</span><h3>{item.action}</h3><p>{item.provider} · {item.resource}</p><small>Requested by {item.requester} · {item.createdAt}</small></div><div className="approval-actions"><button disabled={busy === `approval-${item.id}`} onClick={() => mutate({ action: "decide-approval", id: item.id, decision: "Denied" }, `approval-${item.id}`, "The request was denied and logged.")}>Deny</button><button className="approve" disabled={busy === `approval-${item.id}`} onClick={() => mutate({ action: "decide-approval", id: item.id, decision: "Approved" }, `approval-${item.id}`, "The request was approved and logged.")}>Approve</button></div></article>)}</div>}</section>{decided.length > 0 ? <section className="card table-card"><div className="card-heading"><h3>Recently decided</h3></div>{decided.map((item) => <div className="decided-row" key={item.id}><span>{item.action}</span><span className={`status ${statusClass(item.status)}`}><i />{item.status}</span></div>)}</section> : null}</div>;
}

function Audit({ data }: { data: HubSnapshot }) {
  return <section className="card table-card"><div className="card-heading"><div><span className="eyebrow">Traceability</span><h3>Recent company activity</h3></div><button>Export CSV</button></div><div className="table-scroll"><table><thead><tr><th>Actor</th><th>Event</th><th>Target</th><th>Result</th><th>Time</th></tr></thead><tbody>{data.auditEvents.map((event) => <tr key={event.id}><td><strong>{event.actor}</strong></td><td>{event.event}</td><td className="muted">{event.target}</td><td><span className={`status ${statusClass(event.result)}`}><i />{event.result}</span></td><td className="muted">{event.createdAt}</td></tr>)}</tbody></table></div></section>;
}

function ConnectionRow({ connection, compact = false }: { connection: HubSnapshot["connections"][number]; compact?: boolean }) {
  return <div className="connection-row"><span className="provider-logo" style={{ background: connection.color }}>{connection.initials}</span><span className="connection-name"><strong>{connection.provider}</strong><small>{compact ? connection.coverage : connection.scope}</small></span><span className={`status ${statusClass(connection.status)}`}><i />{connection.status}</span><small className="checked">{connection.lastChecked}</small></div>;
}

function SidePanel({ panel, connections, onClose, onDone }: { panel: { type: "connection" | "invite"; id?: number }; connections: HubSnapshot["connections"]; onClose: () => void; onDone: (message: string) => void }) {
  const connection = connections.find((item) => item.id === panel.id);
  return <div className="panel-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><aside className="side-panel" role="dialog" aria-modal="true" aria-label={panel.type === "invite" ? "Invite staff" : "Connection details"}><button className="panel-close" onClick={onClose} aria-label="Close">×</button>{panel.type === "invite" ? <><span className="eyebrow">New team member</span><h2>Invite staff</h2><p>They will receive the tools assigned to their role template after signing in.</p><label>Work email<input placeholder="name@agmagency.com" /></label><label>Role template<select><option>Brand Manager</option><option>Accountant</option><option>Administrator</option></select></label><div className="panel-note"><span>◎</span><p>Personal connections remain private. Company and client connections are granted by policy.</p></div><button className="primary-button full" onClick={() => onDone("The invitation is ready. Email delivery will activate when company SSO is connected.")}>Create invitation</button></> : <><span className="eyebrow">Connection details</span><div className="panel-provider"><span className="provider-logo large" style={{ background: connection?.color }}>{connection?.initials ?? "+"}</span><div><h2>{connection?.provider ?? "Add provider"}</h2><p>{connection?.scope ?? "Choose a company platform"}</p></div></div>{connection ? <><div className="detail-list"><div><span>Status</span><strong>{connection.status}</strong></div><div><span>Credential owner</span><strong>{connection.ownerType}</strong></div><div><span>Current coverage</span><strong>{connection.coverage}</strong></div><div><span>Last verified</span><strong>{connection.lastChecked}</strong></div></div><div className="panel-note"><span>⌾</span><p>Raw passwords and tokens are never shown to staff or stored inside the Codex plugin.</p></div><button className="primary-button full" onClick={() => onDone(`${connection.provider} connection settings were reviewed.`)}>Done reviewing</button></> : <><label>Platform<select><option>Meta Ads</option><option>Amazon Seller + Ads</option><option>TikTok Ads</option><option>YouTube</option><option>GHL</option><option>Egnyte</option><option>Higgsfield</option></select></label><label>Connection owner<select><option>Company</option><option>Client</option><option>Personal</option></select></label><div className="panel-note"><span>↗</span><p>The live authorization screen opens only after the provider application has been approved.</p></div><button className="primary-button full" onClick={() => onDone("The provider was added to the setup queue.")}>Add to setup queue</button></>}</>}</aside></div>;
}

function LoadingState() { return <div className="loading-grid"><span /><span /><span /><span /></div>; }
function EmptyState() { return <div className="empty-state"><span>✓</span><h3>You are all caught up</h3><p>There are no high-impact actions waiting for review.</p></div>; }
function initials(value: string) { return value.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase(); }
function statusClass(status: string) { if (["Connected", "Active", "Allowed", "Approved", "Saved"].includes(status)) return "good"; if (["Attention", "Needs setup", "Pending", "Publishing", "Financial", "Connection"].includes(status)) return "warn"; if (["Denied", "Blocked"].includes(status)) return "bad"; return "neutral"; }
function heading(view: View) { return ({ overview: "Good afternoon, Stevie", people: "People & access", roles: "Role templates", connections: "Connections", approvals: "Approval center", audit: "Audit log" })[view]; }
function subheading(view: View) { return ({ overview: "Here’s how your company connections are doing today.", people: "Assign job-based access without configuring every person manually.", roles: "Reusable access packages for each position in the agency.", connections: "Personal, company, and client accounts in one secure catalog.", approvals: "Review consequential actions before they reach a client account.", audit: "A clear record of who accessed or changed what." })[view]; }
