import { NextRequest, NextResponse } from "next/server";
import { assignRole, decideConnectionRequest, getHubSnapshot, recordInstallation, requestConnection, setConnectionStatus, setMemberStatus, setRoleConnection } from "@/db/hub";
import { getAuthorizedHubUser } from "@/app/hub-access";
import { listMetaAdAccounts } from "@/app/meta-ads";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getAuthorizedHubUser();
  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  try {
    return NextResponse.json(await getHubSnapshot(user.member));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to load the hub" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const user = await getAuthorizedHubUser();
  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  try {
    const body = await request.json() as Record<string, unknown>;
    switch (body.action) {
      case "assign-role":
        await assignRole(Number(body.memberId), String(body.roleKey), user.member);
        break;
      case "set-member-status":
        await setMemberStatus(Number(body.memberId), body.status === "Disabled" ? "Disabled" : "Active", user.member);
        break;
      case "set-role-connection":
        await setRoleConnection(String(body.roleKey), String(body.connectionKey), body.assigned === true, user.member);
        break;
      case "request-connection":
        await requestConnection(user.member, String(body.connectionKey), String(body.reason ?? ""));
        break;
      case "decide-request":
        await decideConnectionRequest(Number(body.requestId), body.decision === "Denied" ? "Denied" : "Approved", user.member);
        break;
      case "record-installation":
        await recordInstallation(user.member, String(body.connectionKey), String(body.operatingSystem ?? "Unknown"), String(body.status ?? "Reported"), String(body.detail ?? ""));
        break;
      case "test-meta": {
        const accounts = await listMetaAdAccounts();
        await setConnectionStatus("meta-ads", "Ready", "AGM Meta OAuth is active; the account list was verified through Composio.");
        return NextResponse.json({ snapshot: await getHubSnapshot(user.member), testResult: accounts });
      }
      default:
        return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
    }
    return NextResponse.json({ snapshot: await getHubSnapshot(user.member) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Update failed" }, { status: 400 });
  }
}
