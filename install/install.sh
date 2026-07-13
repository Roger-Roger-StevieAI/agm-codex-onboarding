#!/usr/bin/env bash
set -euo pipefail

MARKETPLACE_REPO="Roger-Roger-StevieAI/agm-codex-onboarding"
MARKETPLACE_NAME="agm-codex-onboarding"
PLUGIN_NAME="agm-codex-onboarding"
CODEX_ROOT="${CODEX_HOME:-$HOME/.codex}"
SKILLS=(higgsfield-generate higgsfield-soul-id higgsfield-product-photoshoot higgsfield-marketplace-cards)

say() { printf '\n%s\n' "$1"; }
fail() { printf '\nAGM onboarding stopped: %s\n' "$1" >&2; exit "${2:-1}"; }

say "AGM Codex Onboarding — Mac installer"

if ! command -v codex >/dev/null 2>&1; then
  fail "Codex is not installed. Install the official Codex app or CLI from https://developers.openai.com/codex/ then run this installer again." 2
fi

say "Adding the AGM Codex marketplace and plugin…"
codex plugin marketplace add "$MARKETPLACE_REPO" --ref main
codex plugin add "$PLUGIN_NAME@$MARKETPLACE_NAME"

if ! command -v higgsfield >/dev/null 2>&1; then
  say "Installing the official Higgsfield CLI…"
  curl -fsSL https://raw.githubusercontent.com/higgsfield-ai/cli/main/install.sh | sh -s -- --prefix="$HOME/.local"
  export PATH="$HOME/.local/bin:$PATH"
fi

command -v higgsfield >/dev/null 2>&1 || fail "Higgsfield CLI did not become available. See https://github.com/higgsfield-ai/cli and rerun this installer." 3

say "Installing four official Higgsfield skills into durable Codex storage…"
workdir="$(mktemp -d)"
trap 'rm -rf "$workdir"' EXIT
git clone --depth 1 https://github.com/higgsfield-ai/skills.git "$workdir/higgsfield-skills" >/dev/null 2>&1
mkdir -p "$CODEX_ROOT/skills"
for skill in "${SKILLS[@]}"; do
  source_dir="$workdir/higgsfield-skills/$skill"
  [ -d "$source_dir" ] || fail "The official Higgsfield package did not contain $skill."
  rm -rf "$CODEX_ROOT/skills/$skill"
  cp -R "$source_dir" "$CODEX_ROOT/skills/$skill"
done

say "Verifying the installed package…"
codex plugin list | grep -q "$PLUGIN_NAME" || fail "Codex could not verify the AGM plugin. Restart Codex and rerun the installer."
higgsfield --version

if higgsfield account status >/dev/null 2>&1; then
  higgsfield account status
else
  say "Higgsfield needs your personal login. Complete the browser step that opens next."
  higgsfield auth login
  higgsfield account status || fail "Higgsfield login is still incomplete. Run 'higgsfield auth login' and then 'higgsfield account status'." 4
fi

run_test="n"
if [ -r /dev/tty ]; then
  printf '\nGenerate one inexpensive Higgsfield onboarding test image now? [y/N] ' >/dev/tty
  read -r run_test </dev/tty || true
fi

if [[ "$run_test" =~ ^[Yy]$ ]]; then
  result="$(higgsfield generate create z_image --prompt "Simple blue AGM onboarding checkmark on a white background" --wait --no-color)"
  printf '%s\n' "$result"
  printf '%s\n' "$result" | grep -Eq 'https?://' || fail "The test finished without a result URL. Run the test again before marking Higgsfield ready." 5
else
  say "Remaining Higgsfield verification:"
  printf '%s\n' 'higgsfield generate create z_image --prompt "Simple blue AGM onboarding checkmark on a white background" --wait'
fi

say "AGM package installed. Restart Codex, sign in as your invited AGM email, and ask: Show my AGM setup."
