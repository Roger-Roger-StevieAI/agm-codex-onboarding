import { NextRequest, NextResponse } from "next/server";
import { getHubSnapshot, recordInstallation, requestConnection, setConnectionStatus } from "@/db/hub";
import { getAuthorizedHubUser } from "@/app/hub-access";
import { getMetaCampaignInsights, listMetaAdAccounts } from "@/app/meta-ads";

type JsonRpcRequest = {
  jsonrpc?: "2.0";
  id?: string | number | null;
  method?: string;
  params?: { name?: string; arguments?: Record<string, unknown>; protocolVersion?: string };
};

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, OAI-Sites-Authorization, Mcp-Session-Id",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Expose-Headers": "Mcp-Session-Id",
  "Cache-Control": "no-store",
};

const tools = [
  {
    name: "hub_get_my_setup",
    title: "Get my AGM Codex setup",
    description: "Show the signed-in staff member, role template, assigned connections, installer commands, and setup status.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
  },
  {
    name: "hub_list_assigned_connections",
    title: "List my assigned connections",
    description: "List only the MCPs, CLIs, plugins, APIs, and account scopes assigned to the signed-in staff member.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
  },
  {
    name: "hub_request_connection",
    title: "Request another connection",
    description: "Create a pending request for a Connection Hub administrator to review.",
    inputSchema: { type: "object", required: ["connection_key"], properties: { connection_key: { type: "string", enum: ["meta-ads", "higgsfield", "google-drive"] }, reason: { type: "string", maxLength: 500 } }, additionalProperties: false },
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  },
  {
    name: "hub_get_request_status",
    title: "Check my connection requests",
    description: "List connection requests created by the signed-in staff member and their current decisions.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
  },
  {
    name: "hub_test_connection",
    title: "Verify an assigned connection",
    description: "Run the safe Meta account-list check or record a completed local Higgsfield verification after its CLI test succeeds.",
    inputSchema: { type: "object", required: ["connection_key"], properties: { connection_key: { type: "string", enum: ["meta-ads", "higgsfield"] }, operating_system: { type: "string", maxLength: 30 }, status: { type: "string", maxLength: 40 }, detail: { type: "string", maxLength: 500 } }, additionalProperties: false },
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
  },
  {
    name: "meta_list_ad_accounts",
    title: "List permitted Meta ad accounts",
    description: "Read the ad accounts exposed by AGM's shared, server-controlled Meta connection. This never changes Meta data.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
  },
  {
    name: "meta_get_campaign_insights",
    title: "Read Meta campaign insights",
    description: "Retrieve a read-only campaign performance sample for one permitted Meta ad account.",
    inputSchema: { type: "object", required: ["object_id"], properties: { object_id: { type: "string", pattern: "^act_[0-9]+$" }, date_preset: { type: "string", enum: ["today", "yesterday", "last_7d", "last_30d", "this_month", "last_month", "this_quarter"], default: "last_7d" } }, additionalProperties: false },
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
  },
];

function result(id: JsonRpcRequest["id"], value: unknown) {
  return NextResponse.json({ jsonrpc: "2.0", id: id ?? null, result: value }, { headers });
}

function failure(id: JsonRpcRequest["id"], code: number, message: string) {
  return NextResponse.json({ jsonrpc: "2.0", id: id ?? null, error: { code, message } }, { headers, status: 200 });
}

function toolContent(value: unknown) {
  return { content: [{ type: "text", text: typeof value === "string" ? value : JSON.stringify(value, null, 2) }], structuredContent: value };
}

export async function POST(request: NextRequest) {
  const user = await getAuthorizedHubUser();
  if (!user) return NextResponse.json({ jsonrpc: "2.0", id: null, error: { code: -32001, message: "Sign in with an invited AGM account" } }, { headers, status: 401 });

  let rpc: JsonRpcRequest;
  try {
    rpc = await request.json() as JsonRpcRequest;
  } catch {
    return failure(null, -32700, "Invalid JSON");
  }
  if (rpc.jsonrpc !== "2.0" || !rpc.method) return failure(rpc.id, -32600, "Invalid JSON-RPC request");
  if (rpc.id === undefined) return new NextResponse(null, { status: 202, headers });
  if (rpc.method === "initialize") return result(rpc.id, { protocolVersion: rpc.params?.protocolVersion ?? "2025-03-26", capabilities: { tools: { listChanged: false } }, serverInfo: { name: "agm-codex-onboarding", version: "0.2.0" }, instructions: "Use this server to finish AGM Codex onboarding. Never ask for passwords, tokens, recovery codes, or browser-session data." });
  if (rpc.method === "ping") return result(rpc.id, {});
  if (rpc.method === "tools/list") return result(rpc.id, { tools });

  if (rpc.method === "tools/call") {
    const args = rpc.params?.arguments ?? {};
    try {
      const snapshot = await getHubSnapshot(user.member);
      switch (rpc.params?.name) {
        case "hub_get_my_setup":
          return result(rpc.id, toolContent({ viewer: snapshot.viewer, role: snapshot.roles.find((role) => role.key === snapshot.viewer.roleKey), connections: snapshot.connections, installer: snapshot.installer }));
        case "hub_list_assigned_connections":
          return result(rpc.id, toolContent(snapshot.connections));
        case "hub_request_connection":
          await requestConnection(user.member, String(args.connection_key), String(args.reason ?? ""));
          return result(rpc.id, toolContent({ status: "Pending", connectionKey: args.connection_key, message: "A Connection Hub administrator can now review this request." }));
        case "hub_get_request_status":
          return result(rpc.id, toolContent(snapshot.requests));
        case "hub_test_connection": {
          const connectionKey = String(args.connection_key);
          if (!snapshot.connections.some((connection) => connection.key === connectionKey)) throw new Error("This connection is not assigned to your role");
          if (connectionKey === "meta-ads") {
            const accounts = await listMetaAdAccounts();
            await setConnectionStatus("meta-ads", "Ready", "AGM Meta OAuth is active; the account list was verified through Composio.");
            return result(rpc.id, toolContent({ connectionKey, status: "Ready", accounts }));
          }
          const status = String(args.status ?? "Reported");
          const detail = String(args.detail ?? "");
          await recordInstallation(user.member, "higgsfield", String(args.operating_system ?? "Unknown"), status, detail);
          return result(rpc.id, toolContent({ connectionKey, status, message: "The secret-free local Higgsfield verification was added to your onboarding record." }));
        }
        case "meta_list_ad_accounts":
          if (!snapshot.connections.some((connection) => connection.key === "meta-ads")) throw new Error("Meta Ads is not assigned to your role");
          return result(rpc.id, toolContent(await listMetaAdAccounts()));
        case "meta_get_campaign_insights":
          if (!snapshot.connections.some((connection) => connection.key === "meta-ads")) throw new Error("Meta Ads is not assigned to your role");
          return result(rpc.id, toolContent(await getMetaCampaignInsights(String(args.object_id), String(args.date_preset ?? "last_7d"))));
        default:
          return result(rpc.id, { content: [{ type: "text", text: `Unknown Connection Hub tool: ${rpc.params?.name ?? "missing name"}` }], isError: true });
      }
    } catch (error) {
      return result(rpc.id, { content: [{ type: "text", text: error instanceof Error ? error.message : "Connection Hub request failed" }], isError: true });
    }
  }
  return failure(rpc.id, -32601, `Method not found: ${rpc.method}`);
}

export async function GET() {
  const user = await getAuthorizedHubUser();
  if (!user) return NextResponse.json({ error: "Authentication required" }, { headers, status: 401 });
  return NextResponse.json({ name: "AGM Codex Onboarding MCP", version: "0.2.0", transport: "streamable-http", tools: tools.map((tool) => tool.name) }, { headers });
}

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers });
}
