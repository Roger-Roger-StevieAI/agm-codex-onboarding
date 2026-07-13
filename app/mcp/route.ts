import { NextRequest, NextResponse } from "next/server";
import { getHubSnapshot } from "@/db/hub";
import { getAuthorizedHubUser } from "@/app/hub-access";

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
    name: "hub_status",
    title: "Connection Hub status",
    description: "Summarize staff setup, connected platforms, and pending approval counts.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
  },
  {
    name: "hub_list_connections",
    title: "List company connections",
    description: "List configured personal, company, and client platform connections and their readiness.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
  },
  {
    name: "hub_list_role_templates",
    title: "List role templates",
    description: "List job-based access templates and the providers each role is intended to use.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
  },
  {
    name: "hub_list_pending_approvals",
    title: "List pending approvals",
    description: "List high-impact actions waiting for an administrator decision.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
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
  if (!user) return NextResponse.json({ jsonrpc: "2.0", id: null, error: { code: -32001, message: "Sign in with an approved ChatGPT account" } }, { headers, status: 401 });

  let rpc: JsonRpcRequest;
  try {
    rpc = await request.json() as JsonRpcRequest;
  } catch {
    return failure(null, -32700, "Invalid JSON");
  }

  if (rpc.jsonrpc !== "2.0" || !rpc.method) return failure(rpc.id, -32600, "Invalid JSON-RPC request");
  if (rpc.id === undefined) return new NextResponse(null, { status: 202, headers });

  if (rpc.method === "initialize") {
    return result(rpc.id, {
      protocolVersion: rpc.params?.protocolVersion ?? "2025-03-26",
      capabilities: { tools: { listChanged: false } },
      serverInfo: { name: "agm-connection-hub", version: "0.1.0" },
      instructions: "Use this server to inspect company connection readiness and approved access policy. It never returns provider passwords or OAuth tokens.",
    });
  }

  if (rpc.method === "ping") return result(rpc.id, {});
  if (rpc.method === "tools/list") return result(rpc.id, { tools });

  if (rpc.method === "tools/call") {
    const snapshot = await getHubSnapshot();
    switch (rpc.params?.name) {
      case "hub_status": {
        const activeStaff = snapshot.staff.filter((person) => person.status === "Active").length;
        const connected = snapshot.connections.filter((connection) => connection.status === "Connected").length;
        const pending = snapshot.approvals.filter((approval) => approval.status === "Pending").length;
        return result(rpc.id, toolContent({ activeStaff, totalStaff: snapshot.staff.length, connectedPlatforms: connected, totalPlatforms: snapshot.connections.length, pendingApprovals: pending }));
      }
      case "hub_list_connections":
        return result(rpc.id, toolContent(snapshot.connections));
      case "hub_list_role_templates":
        return result(rpc.id, toolContent(snapshot.roles));
      case "hub_list_pending_approvals":
        return result(rpc.id, toolContent(snapshot.approvals.filter((approval) => approval.status === "Pending")));
      default:
        return result(rpc.id, { content: [{ type: "text", text: `Unknown Connection Hub tool: ${rpc.params?.name ?? "missing name"}` }], isError: true });
    }
  }

  return failure(rpc.id, -32601, `Method not found: ${rpc.method}`);
}

export async function GET() {
  const user = await getAuthorizedHubUser();
  if (!user) return NextResponse.json({ error: "Authentication required" }, { headers, status: 401 });
  return NextResponse.json({ name: "AGM Connection Hub MCP", version: "0.1.0", transport: "streamable-http", tools: tools.map((tool) => tool.name) }, { headers });
}

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers });
}
