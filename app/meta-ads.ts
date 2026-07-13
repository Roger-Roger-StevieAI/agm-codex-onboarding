import { env } from "cloudflare:workers";

type ComposioResponse = { data?: unknown; error?: unknown; successful?: boolean };

function metaConfiguration() {
  const apiKey = env.COMPOSIO_API_KEY;
  const connectedAccountId = env.COMPOSIO_META_CONNECTED_ACCOUNT_ID;
  if (!apiKey || !connectedAccountId) {
    throw new Error("Meta Ads setup is incomplete. Add the AGM Meta OAuth connection in Composio first.");
  }
  return { apiKey, connectedAccountId };
}

async function executeMetaTool(toolSlug: "METAADS_GET_AD_ACCOUNTS" | "METAADS_GET_INSIGHTS", arguments_: Record<string, unknown>) {
  const { apiKey, connectedAccountId } = metaConfiguration();
  const response = await fetch(`https://backend.composio.dev/api/v3.1/tools/execute/${toolSlug}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": apiKey },
    body: JSON.stringify({
      connected_account_id: connectedAccountId,
      user_id: "agm-connection-hub",
      version: env.COMPOSIO_META_TOOLKIT_VERSION ?? "20260703_00",
      arguments: arguments_,
    }),
  });
  const payload = await response.json() as ComposioResponse;
  if (!response.ok || payload.successful === false || payload.error) {
    throw new Error(`Meta Ads connection failed (${response.status}). Reauthorize the AGM connection in Composio.`);
  }
  return payload.data ?? payload;
}

export async function listMetaAdAccounts() {
  return executeMetaTool("METAADS_GET_AD_ACCOUNTS", { limit: 100, fields: "id,account_id,name,currency,account_status,business_name" });
}

export async function getMetaCampaignInsights(objectId: string, datePreset = "last_7d") {
  if (!/^act_\d+$/.test(objectId)) throw new Error("A Meta ad account ID beginning with act_ is required");
  const allowedPresets = new Set(["today", "yesterday", "last_7d", "last_30d", "this_month", "last_month", "this_quarter"]);
  if (!allowedPresets.has(datePreset)) throw new Error("Unsupported Meta reporting period");
  return executeMetaTool("METAADS_GET_INSIGHTS", {
    object_id: objectId,
    level: "campaign",
    date_preset: datePreset,
    limit: 100,
    fields: ["campaign_id", "campaign_name", "impressions", "clicks", "spend", "reach", "ctr", "cpc", "date_start", "date_stop"],
  });
}
