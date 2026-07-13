# AGM Connection Hub

A private control center and Codex plugin for giving staff role-based access to company and client platforms without distributing shared passwords or raw API tokens.

## What works in this MVP

- Persistent staff, role, connection, approval, and audit records in Cloudflare D1.
- Role assignment and approval decisions from the dashboard.
- Personal, company, and client connection scopes in one catalog.
- A Streamable HTTP MCP endpoint at `/mcp` with four read-only tools.
- A repo-local team marketplace and `connection-hub` Codex plugin.
- Sign in with ChatGPT identity headers when hosted through Sites.

The seeded records are demonstration data. A platform marked connected in the preview is not proof that AGM's live provider account is authorized.

## Local development

Node.js 22.13 or newer and pnpm are required.

```bash
pnpm install
pnpm run dev
pnpm run typecheck
pnpm run lint
pnpm test
```

The local dashboard runs at `http://localhost:3000`. Its MCP endpoint is `http://localhost:3000/mcp`.

## Live-provider activation

Before staff can run real Meta, Amazon, TikTok, YouTube, GHL, Drive, Egnyte, or Higgsfield actions:

1. Choose and fund the broker layer, with Composio as the default path and custom adapters only where coverage is missing.
2. Authorize the company owner and client accounts through supported OAuth or service-account flows.
3. Map staff identities to role templates and client assignments.
4. Replace demonstration connection states with health checks from the broker.
5. Add write tools only after approval policies are enforced server-side.

Never store owner passwords, browser cookies, recovery codes, or copied access tokens in this repository, the dashboard, or the plugin.

## Important paths

- `app/ConnectionHub.tsx` — dashboard UI
- `app/api/hub/route.ts` — dashboard mutations
- `app/mcp/route.ts` — Codex-facing MCP gateway
- `db/hub.ts` — D1 persistence and seed data
- `plugins/connection-hub/` — private Codex plugin
- `.agents/plugins/marketplace.json` — team marketplace catalog
