import { NextRequest, NextResponse } from "next/server";
import { decideApproval, getHubSnapshot, markConnectionReady, updateStaffRole } from "../../../db/hub";
import { getChatGPTUser } from "../../chatgpt-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json(await getHubSnapshot());
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to load the hub" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const user = await getChatGPTUser();
  const actor = user?.displayName ?? "Stevie Kirk";
  const body = (await request.json()) as { action?: string; id?: number; role?: string; decision?: "Approved" | "Denied" };

  if (!body.action || !body.id) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  if (body.action === "assign-role" && body.role) await updateStaffRole(body.id, body.role, actor);
  else if (body.action === "decide-approval" && body.decision) await decideApproval(body.id, body.decision, actor);
  else if (body.action === "mark-connected") await markConnectionReady(body.id, actor);
  else return NextResponse.json({ error: "Unsupported action" }, { status: 400 });

  return NextResponse.json(await getHubSnapshot());
}
