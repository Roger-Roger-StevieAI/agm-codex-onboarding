import { NextRequest, NextResponse } from "next/server";
import { assignRole, createConnection, createRoleTemplate, decideConnectionRequest, deleteRoleTemplate, getHubSnapshot, inviteMember, recordInstallation, requestConnection, saveConnectionConfig, setConnectionStatus, setMemberConnection, setMemberStatus, setRoleConnection, updateRoleTemplate, type HubConnection } from "@/db/hub";
import { getAuthorizedHubUser } from "@/app/hub-access";
import { listMetaAdAccounts } from "@/app/meta-ads";
import { beginConnection, runConnectionDiagnostic } from "@/app/connection-runtime";

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
      case "create-template":
        await createRoleTemplate({ name: String(body.name ?? ""), description: String(body.description ?? "") }, user.member);
        break;
      case "update-template":
        await updateRoleTemplate({ roleKey: String(body.roleKey), name: String(body.name ?? ""), description: String(body.description ?? "") }, user.member);
        break;
      case "delete-template":
        await deleteRoleTemplate(String(body.roleKey), user.member);
        break;
      case "invite-member":
        await inviteMember({ name: String(body.name ?? ""), email: String(body.email ?? ""), roleKey: String(body.roleKey ?? "staff-tester"), connectionKeys: Array.isArray(body.connectionKeys) ? body.connectionKeys.map(String) : [] }, user.member);
        break;
      case "set-member-connection":
        await setMemberConnection({ memberId: Number(body.memberId), connectionKey: String(body.connectionKey), assigned: body.assigned === true, accountScope: String(body.accountScope ?? "") }, user.member);
        break;
      case "create-connection":
        await createConnection({ name: String(body.name ?? ""), description: String(body.description ?? ""), authModel: String(body.authModel ?? "personal_oauth") as HubConnection["authModel"], delivery: String(body.delivery ?? "Managed connection"), provider: String(body.provider ?? "manual"), toolkitSlug: String(body.toolkitSlug ?? "") }, user.member);
        break;
      case "save-connection-config":
        await saveConnectionConfig({ connectionKey: String(body.connectionKey), provider: String(body.provider ?? "manual"), toolkitSlug: body.toolkitSlug ? String(body.toolkitSlug) : null, authConfigId: body.authConfigId ? String(body.authConfigId) : null, connectedAccountId: body.connectedAccountId ? String(body.connectedAccountId) : null, ownerUserId: body.ownerUserId ? String(body.ownerUserId) : null, testToolSlug: body.testToolSlug ? String(body.testToolSlug) : null, testToolVersion: body.testToolVersion ? String(body.testToolVersion) : null, setupNotes: String(body.setupNotes ?? ""), setupStatus: String(body.setupStatus ?? "Configured") }, user.member);
        break;
      case "begin-connection": {
        const connection = await beginConnection({ connectionKey: String(body.connectionKey), memberId: body.memberId ? Number(body.memberId) : undefined, callbackUrl: `${request.nextUrl.origin}/` }, user.member);
        return NextResponse.json({ snapshot: await getHubSnapshot(user.member), connection });
      }
      case "run-diagnostic": {
        const diagnosticResult = await runConnectionDiagnostic({ connectionKey: String(body.connectionKey), memberId: body.memberId ? Number(body.memberId) : undefined }, user.member);
        return NextResponse.json({ snapshot: await getHubSnapshot(user.member), diagnosticResult });
      }
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
