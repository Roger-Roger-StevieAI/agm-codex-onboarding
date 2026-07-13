---
name: company-connections
description: Use when AGM staff ask what company or client platforms are connected, what their role permits, or which consequential actions are waiting for approval.
---

# Company connections

Use the Connection Hub as the source of truth for connection readiness and role-based access.

## Operating rules

- Start with `hub_status` when the user asks a broad connection or setup question.
- Use `hub_list_connections` for provider coverage and readiness.
- Use `hub_list_role_templates` for job-based permissions.
- Use `hub_list_pending_approvals` only for the approval queue.
- Never ask a staff member to paste passwords, API keys, access tokens, recovery codes, or owner browser-session data into Codex.
- Never claim that a provider is live when the hub reports setup required or attention.
- These first-release tools are read-only. Explain that live write actions require an approved provider connector and the relevant human approval policy.
- Keep the answer short and state the specific platform, scope, and blocker when something is not ready.
