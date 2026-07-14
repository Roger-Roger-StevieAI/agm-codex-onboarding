# AGM Codex Onboarding

A public, credential-free Codex marketplace and protected onboarding hub for AGM staff. Administrators assign role templates; staff run one installer and receive only their approved plugins, MCPs, CLIs, APIs, account scopes, and next login steps.

## Pilot

- Administrator: Stevie (`stevie@agmagency.com`)
- Staff tester: Jean (`jean@agmagency.com`)
- Meta Ads: shared, server-brokered, read-only account listing and campaign reporting
- Higgsfield: official local CLI plus four official Codex skills, authenticated on the employee's computer
- Staff access: database-managed invitations; no shared ChatGPT Business workspace is required

## Install

Mac:

```bash
curl -fsSL https://raw.githubusercontent.com/Roger-Roger-StevieAI/agm-codex-onboarding/v0.2.2/install/install.sh | bash
```

Windows PowerShell:

```powershell
irm https://raw.githubusercontent.com/Roger-Roger-StevieAI/agm-codex-onboarding/v0.2.2/install/install.ps1 | iex
```

Both installers:

1. Detect Codex and provide the official installation path if it is missing.
2. Add the public AGM marketplace and install the AGM onboarding plugin.
3. Install the official Higgsfield CLI when needed.
4. Copy the four official Higgsfield skills into durable Codex storage.
5. Verify the plugin and CLI, complete local Higgsfield login, and offer one inexpensive test image.
6. Report success or the exact remaining login/verification step.

The scripts contain no AGM credentials. Review them before running: [Mac installer](install/install.sh) and [Windows installer](install/install.ps1).

## Operational hub

The protected dashboard now provides four working control surfaces:

- **Connections:** create definitions, choose Composio/Codex/local delivery, save safe provider identifiers, launch provider-hosted OAuth, run read-only tests, and retain sanitized diagnostic history.
- **Templates:** create and edit reusable role packages, then choose exactly which capabilities each package contains.
- **Staff:** invite an email, assign a baseline template, send or revoke an individual exception, copy the staff setup link, and disable hub access immediately.
- **Requests and activity:** employees request additional access; approval delivers it only to that employee. The audit and diagnostic tables retain the result without retaining credentials.

For Composio-backed providers, the server uses a protected `COMPOSIO_API_KEY`. OAuth credentials stay in Composio and provider tokens never pass through the dashboard. Auth configurations are auto-discovered from the saved toolkit slug, while optional IDs can be pinned by an administrator.

## MCP capabilities

Staff-facing MCP tools:

- `hub_get_my_setup`
- `hub_list_assigned_connections`
- `hub_request_connection`
- `hub_get_request_status`
- `hub_test_connection`

Read-only Meta tools:

- `meta_list_ad_accounts`
- `meta_get_campaign_insights`

Deactivated members fail every dashboard, API, and MCP authorization check immediately.

For the current test, the administrator catalog also contains a secret-free snapshot of the capabilities detected in Stevie's Codex profile: installed plugins, configured MCPs, available Codex Apps, and Higgsfield. The Connections screen supports search, filters, and direct role-template assignment. Detection never copies MCP URLs, embedded credentials, environment values, OAuth tokens, or local provider tokens into the hub.

## Required Meta activation

The code is ready, but live Meta verification requires AGM's external authorization:

1. Create an AGM Meta developer app.
2. Configure its OAuth client in a Composio Meta Ads auth configuration.
3. Authorize the AGM administrator connection and verify the expected Meta Business ad accounts.
4. Add `COMPOSIO_API_KEY` as a server-only Sites environment variable. The Connection console can then create secure Connect Links and auto-discover enabled auth configurations.
5. For the legacy read-only Meta MCP tools, also set `COMPOSIO_META_CONNECTED_ACCOUNT_ID` and optionally `COMPOSIO_META_TOOLKIT_VERSION`.
6. Use the hub's Meta test. It can only list ad accounts and retrieve a bounded campaign-insights sample.

Never put those values in this repository, an installer, a dashboard field, a log, or an MCP response.

## Local development

Node.js 22.13 or newer and pnpm are required.

```bash
pnpm install
pnpm run typecheck
pnpm run lint
pnpm test
```

The local dashboard is `http://localhost:3000`; its MCP endpoint is `http://localhost:3000/mcp`. The hosted hub is [agm-connection-hub.stevie926063.chatgpt.site](https://agm-connection-hub.stevie926063.chatgpt.site).

## Important paths

- `app/ConnectionHub.tsx` — onboarding dashboard
- `app/api/hub/route.ts` — administrator and staff actions
- `app/mcp/route.ts` — authenticated MCP gateway
- `app/composio-runtime.ts` — server-only OAuth, account status, read-only tests, and sanitized provider logs
- `app/connection-runtime.ts` — assignment-aware connection and diagnostic orchestration
- `app/meta-ads.ts` — server-only read-only Meta MCP adapter
- `db/hub.ts` — invited users, templates, individual delivery, provider state, diagnostics, requests, reports, and audit events
- `plugins/agm-codex-onboarding/` — public Codex plugin
- `.agents/plugins/marketplace.json` — public marketplace catalog
- `install/` — secret-free Mac and Windows installers
