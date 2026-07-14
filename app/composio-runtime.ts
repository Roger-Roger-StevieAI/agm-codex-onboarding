import { env } from "cloudflare:workers";

type ApiErrorShape = {
  error?: { message?: string; request_id?: string; suggested_fix?: string } | string;
  message?: string;
  request_id?: string;
};

export type ComposioAuthConfig = {
  id: string;
  name: string;
  auth_scheme: string;
  toolkit: { slug: string };
  status?: string;
};

export type ComposioConnectedAccount = {
  id: string;
  status: string;
  user_id?: string;
  toolkit: { slug: string };
  auth_config?: { id: string };
};

export type ComposioProviderLog = {
  id: string;
  timestamp: string;
  status: string;
  level?: string;
  message: string;
  metadata?: { tool_slug?: string; toolkit_slug?: string; user_id?: string; connected_account_id?: string };
  metrics?: { duration_ms?: number };
};

export function composioIsConfigured() {
  return Boolean(env.COMPOSIO_API_KEY);
}

async function composioRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const apiKey = env.COMPOSIO_API_KEY;
  if (!apiKey) throw new Error("Composio gateway is not configured. Add COMPOSIO_API_KEY as a protected Sites environment variable.");
  const response = await fetch(`https://backend.composio.dev/api/v3.1${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", "x-api-key": apiKey, ...(init?.headers ?? {}) },
  });
  const payload = await response.json() as T & ApiErrorShape;
  if (!response.ok) {
    const nested = typeof payload.error === "object" ? payload.error : null;
    const message = nested?.message ?? (typeof payload.error === "string" ? payload.error : payload.message) ?? `Composio request failed (${response.status})`;
    const requestId = nested?.request_id ?? payload.request_id;
    const suggested = nested?.suggested_fix;
    throw new Error([message, suggested, requestId ? `Request ${requestId}` : ""].filter(Boolean).join(" · "));
  }
  return payload;
}

export async function listComposioAuthConfigs(toolkitSlug?: string) {
  const query = new URLSearchParams({ limit: "100", show_disabled: "false" });
  if (toolkitSlug) query.set("toolkit_slug", toolkitSlug);
  const payload = await composioRequest<{ items: ComposioAuthConfig[] }>(`/auth_configs?${query}`);
  return payload.items ?? [];
}

export async function listComposioAccounts(filters: { toolkitSlug?: string; userId?: string; authConfigId?: string; connectedAccountId?: string } = {}) {
  const query = new URLSearchParams({ limit: "100", account_type: "ALL" });
  if (filters.toolkitSlug) query.append("toolkit_slugs", filters.toolkitSlug);
  if (filters.userId) query.append("user_ids", filters.userId);
  if (filters.authConfigId) query.append("auth_config_ids", filters.authConfigId);
  if (filters.connectedAccountId) query.append("connected_account_ids", filters.connectedAccountId);
  const payload = await composioRequest<{ items: ComposioConnectedAccount[] }>(`/connected_accounts?${query}`);
  return payload.items ?? [];
}

export async function createComposioConnectLink(input: { authConfigId: string; userId: string; callbackUrl: string; alias?: string }) {
  return composioRequest<{ redirect_url: string; connected_account_id?: string; expires_at?: string }>("/connected_accounts/link", {
    method: "POST",
    body: JSON.stringify({ auth_config_id: input.authConfigId, user_id: input.userId, callback_url: input.callbackUrl, ...(input.alias ? { alias: input.alias } : {}) }),
  });
}

const safeDiagnosticTools: Record<string, { arguments: Record<string, unknown> }> = {
  GMAIL_GET_PROFILE: { arguments: {} },
  METAADS_GET_AD_ACCOUNTS: { arguments: { limit: 25, fields: "id,account_id,name,account_status,business_name" } },
};

export async function executeComposioDiagnostic(input: { toolSlug: string; connectedAccountId: string; userId: string; version?: string | null }) {
  const safeTool = safeDiagnosticTools[input.toolSlug];
  if (!safeTool) throw new Error("This diagnostic tool is not on the Connection Hub read-only allowlist.");
  const payload = await composioRequest<{ data?: unknown; error?: unknown; successful?: boolean; log_id?: string }>(`/tools/execute/${encodeURIComponent(input.toolSlug)}`, {
    method: "POST",
    body: JSON.stringify({ connected_account_id: input.connectedAccountId, user_id: input.userId, ...(input.version ? { version: input.version } : {}), arguments: safeTool.arguments }),
  });
  if (payload.successful === false || payload.error) throw new Error("The provider accepted the connection but the read-only verification tool failed.");
  return { logId: payload.log_id ?? null, data: payload.data ?? null };
}

export async function listComposioLogs(filters: { toolkitSlug?: string; userId?: string; connectedAccountId?: string }) {
  const now = Date.now();
  const filterList: Array<{ field: string; operator: "=="; value: string }> = [];
  if (filters.toolkitSlug) filterList.push({ field: "toolkit_slug", operator: "==", value: filters.toolkitSlug });
  if (filters.userId) filterList.push({ field: "user_id", operator: "==", value: filters.userId });
  if (filters.connectedAccountId) filterList.push({ field: "connected_account_id", operator: "==", value: filters.connectedAccountId });
  const payload = await composioRequest<{ logs: ComposioProviderLog[] }>("/logs/tool_execution", {
    method: "POST",
    body: JSON.stringify({ limit: 10, time_range: { from: now - 7 * 24 * 60 * 60 * 1000, to: now }, filters: filterList }),
  });
  return (payload.logs ?? []).map((log) => ({
    id: log.id,
    timestamp: log.timestamp,
    status: log.status,
    level: log.level ?? "info",
    message: String(log.message ?? "Provider event").slice(0, 300),
    toolSlug: log.metadata?.tool_slug ?? null,
    durationMs: log.metrics?.duration_ms ?? null,
  }));
}
