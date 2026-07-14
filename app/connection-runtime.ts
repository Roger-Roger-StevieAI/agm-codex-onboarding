import type { HubMember } from "@/db/hub";
import { getConnectionConfig, getHubSnapshot, getMemberById, recordDiagnostic, saveMemberProviderState, setConnectionStatus, updateConnectionRuntime } from "@/db/hub";
import { composioIsConfigured, createComposioConnectLink, executeComposioDiagnostic, listComposioAccounts, listComposioAuthConfigs, listComposioLogs } from "./composio-runtime";

function safeDetail(error: unknown) {
  return (error instanceof Error ? error.message : "Unknown provider error").replace(/(token|secret|password|authorization|api[_-]?key)\s*[:=]\s*\S+/gi, "$1=[redacted]").slice(0, 1000);
}

async function targetMember(memberId: number | undefined, actor: HubMember) {
  if (!memberId || memberId === actor.id) return actor;
  if (!actor.isAdmin) throw new Error("You can only manage your own connection");
  const target = await getMemberById(memberId);
  if (!target || target.status !== "Active") throw new Error("Choose an active staff member");
  return target;
}

async function ensureAssigned(connectionKey: string, member: HubMember) {
  const snapshot = await getHubSnapshot(member);
  const connection = snapshot.connections.find((item) => item.key === connectionKey);
  if (!connection) throw new Error("Send this connection to the staff member or add it to their template first");
  return connection;
}

async function resolveAuthConfig(connectionKey: string) {
  const config = await getConnectionConfig(connectionKey);
  if (!config) throw new Error("Configure this connection before starting authentication");
  if (config.provider !== "composio") throw new Error("This connection uses local or Codex-managed authentication");
  if (!config.toolkitSlug) throw new Error("Add the Composio toolkit slug in connection setup");
  if (config.authConfigId) return config;
  const authConfigs = await listComposioAuthConfigs(config.toolkitSlug);
  const authConfig = authConfigs.find((item) => item.status !== "DISABLED") ?? authConfigs[0];
  if (!authConfig) throw new Error(`No enabled Composio auth configuration was found for ${config.toolkitSlug}`);
  const updated = { ...config, authConfigId: authConfig.id, setupStatus: "Auth config ready" };
  await updateConnectionRuntime({ connectionKey, setupStatus: "Auth config ready", authConfigId: authConfig.id, lastError: null });
  return updated;
}

export async function beginConnection(input: { connectionKey: string; memberId?: number; callbackUrl: string }, actor: HubMember) {
  const member = await targetMember(input.memberId, actor);
  const connection = await ensureAssigned(input.connectionKey, member);
  const config = await resolveAuthConfig(input.connectionKey);
  const shared = connection.authModel === "shared_brokered";
  const userId = shared ? (config.ownerUserId || actor.email) : member.email;
  const link = await createComposioConnectLink({ authConfigId: config.authConfigId!, userId, callbackUrl: input.callbackUrl });
  if (shared) {
    await updateConnectionRuntime({ connectionKey: input.connectionKey, setupStatus: "Authorization started", connectedAccountId: link.connected_account_id ?? null, authConfigId: config.authConfigId, ownerUserId: userId, lastError: null });
  } else {
    await saveMemberProviderState({ memberId: member.id, connectionKey: input.connectionKey, authConfigId: config.authConfigId, providerAccountId: link.connected_account_id ?? null, providerStatus: "AUTHORIZING" }, actor);
  }
  return { redirectUrl: link.redirect_url, expiresAt: link.expires_at ?? null, member: { id: member.id, name: member.name, email: member.email } };
}

export async function runConnectionDiagnostic(input: { connectionKey: string; memberId?: number }, actor: HubMember) {
  const started = Date.now();
  const member = await targetMember(input.memberId, actor);
  const connection = await ensureAssigned(input.connectionKey, member);
  const config = await getConnectionConfig(input.connectionKey);
  const shared = connection.authModel === "shared_brokered";
  const base = { connectionKey: input.connectionKey, memberId: member.id, actor: actor.name };
  try {
    if (!config || config.provider !== "composio") {
      const good = ["Ready", "Active", "Verified", "Installed", "Enabled", "Available"].includes(connection.status);
      const summary = good ? "The assigned local or Codex-managed capability is available." : "This capability still needs a local login or setup step.";
      await recordDiagnostic({ ...base, status: good ? "Passed" : "Needs action", stage: "Local capability", summary, detail: connection.statusDetail, providerLogId: null, durationMs: Date.now() - started });
      return { status: good ? "Passed" : "Needs action", stage: "Local capability", summary, details: [connection.statusDetail], providerLogs: [] };
    }
    if (!composioIsConfigured()) throw new Error("Composio gateway is not configured. Add COMPOSIO_API_KEY as a protected Sites environment variable.");
    if (!config.toolkitSlug) throw new Error("The Composio toolkit slug is missing from this connection setup.");
    const userId = shared ? (config.ownerUserId || actor.email) : member.email;
    const accounts = await listComposioAccounts({ toolkitSlug: config.toolkitSlug, userId, authConfigId: config.authConfigId ?? undefined, connectedAccountId: shared ? config.connectedAccountId ?? undefined : undefined });
    const active = accounts.find((account) => account.status === "ACTIVE") ?? accounts[0];
    if (!active) throw new Error(`No ${config.toolkitSlug} connected account exists for ${userId}. Start the secure sign-in flow first.`);
    if (active.status !== "ACTIVE") throw new Error(`The connected account is ${active.status}. Reauthorize it from the Connection Hub.`);
    let logId: string | null = null;
    const details = [`Connected account ${active.id} is ACTIVE`, `Toolkit ${active.toolkit.slug}`, `User ${userId}`];
    if (config.testToolSlug) {
      const executed = await executeComposioDiagnostic({ toolSlug: config.testToolSlug, connectedAccountId: active.id, userId, version: config.testToolVersion });
      logId = executed.logId;
      details.push(`Read-only test ${config.testToolSlug} completed`);
    }
    const providerLogs = await listComposioLogs({ toolkitSlug: config.toolkitSlug, userId, connectedAccountId: active.id }).catch(() => []);
    if (shared) {
      await updateConnectionRuntime({ connectionKey: input.connectionKey, setupStatus: "Connected", connectedAccountId: active.id, authConfigId: active.auth_config?.id ?? config.authConfigId, ownerUserId: userId, lastError: null });
      await setConnectionStatus(input.connectionKey, "Ready", `The ${config.toolkitSlug} account is active and was verified through Composio.`);
    } else {
      await saveMemberProviderState({ memberId: member.id, connectionKey: input.connectionKey, authConfigId: active.auth_config?.id ?? config.authConfigId, providerAccountId: active.id, providerStatus: active.status }, actor);
    }
    const summary = config.testToolSlug ? "Provider account and read-only test both passed." : "Provider account is active; no provider data was read.";
    await recordDiagnostic({ ...base, status: "Passed", stage: config.testToolSlug ? "Provider test" : "Account status", summary, detail: details.join(" · "), providerLogId: logId, durationMs: Date.now() - started });
    return { status: "Passed", stage: config.testToolSlug ? "Provider test" : "Account status", summary, details, providerLogs };
  } catch (error) {
    const detail = safeDetail(error);
    if (config && shared) {
      await updateConnectionRuntime({ connectionKey: input.connectionKey, setupStatus: "Needs attention", lastError: detail });
    } else if (config?.provider === "composio") {
      await saveMemberProviderState({ memberId: member.id, connectionKey: input.connectionKey, authConfigId: config.authConfigId, providerStatus: "FAILED" }, actor);
    }
    await recordDiagnostic({ ...base, status: "Failed", stage: "Provider check", summary: "The connection could not be verified.", detail, providerLogId: null, durationMs: Date.now() - started });
    return { status: "Failed", stage: "Provider check", summary: "The connection could not be verified.", details: [detail], providerLogs: [] };
  }
}
