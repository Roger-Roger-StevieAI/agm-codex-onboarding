---
name: agm-onboarding
description: Set up, inspect, and verify the AGM Codex capabilities assigned to the signed-in employee. Use when an AGM staff member asks what they need, wants to install or test an assigned connection, or wants to request another connection.
---

# AGM Codex Onboarding

Use the AGM onboarding MCP as the source of truth for the signed-in employee's approved setup.

## Start here

1. Call `hub_get_my_setup` before recommending or installing a provider.
2. Act only on connections returned for the signed-in employee.
3. Never request, display, copy, log, or store provider tokens, passwords, cookies, recovery codes, or OAuth credentials.
4. If an employee is disabled or uninvited, stop and tell them to contact the AGM Connection Hub administrator.

## Meta Ads

- Meta access is server-controlled and read-only during the pilot.
- Call `hub_test_connection` with `connection_key` set to `meta-ads` before reporting it ready.
- Use `meta_list_ad_accounts` to verify accessible ad accounts.
- Use `meta_get_campaign_insights` only for a small reporting sample and only with an account returned by the list tool.
- Do not attempt campaign, budget, creative, audience, or account changes.

## Higgsfield

Higgsfield authentication stays on the employee's computer.

1. Check `higgsfield --version`.
2. Run `higgsfield account status`.
3. If signed out, ask the employee to complete `higgsfield auth login` in their browser, then repeat the status check.
4. Run one inexpensive onboarding test:
   `higgsfield generate create z_image --prompt "Simple blue AGM onboarding checkmark on a white background" --wait`
5. Require a completed result URL before calling the test successful.
6. Call `hub_test_connection` with `connection_key` set to `higgsfield`, `status` set to `Ready`, and a secret-free summary. Never send the local token to the hub.

## Requests

- Use `hub_list_assigned_connections` to explain current access.
- Use `hub_request_connection` only after the employee names the connection and reason.
- Use `hub_get_request_status` for follow-up.
- Staff can request access but cannot approve, deny, assign, or revoke it.
