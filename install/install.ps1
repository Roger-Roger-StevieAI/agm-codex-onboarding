$ErrorActionPreference = "Stop"

$MarketplaceRepo = "Roger-Roger-StevieAI/agm-codex-onboarding"
$MarketplaceName = "agm-codex-onboarding"
$PluginName = "agm-codex-onboarding"
$CodexRoot = if ($env:CODEX_HOME) { $env:CODEX_HOME } else { Join-Path $HOME ".codex" }
$Skills = @("higgsfield-generate", "higgsfield-soul-id", "higgsfield-product-photoshoot", "higgsfield-marketplace-cards")

function Stop-Onboarding([string]$Message, [int]$Code = 1) {
  Write-Error "AGM onboarding stopped: $Message"
  exit $Code
}

Write-Host "`nAGM Codex Onboarding - Windows installer`n"

if (-not (Get-Command codex -ErrorAction SilentlyContinue)) {
  Stop-Onboarding "Codex is not installed. Install the official Codex app or CLI from https://developers.openai.com/codex/ and run this installer again." 2
}

Write-Host "Adding the AGM Codex marketplace and plugin..."
codex plugin marketplace add $MarketplaceRepo --ref main
if ($LASTEXITCODE -ne 0) { Stop-Onboarding "Codex could not add the AGM marketplace." }
codex plugin marketplace upgrade $MarketplaceName
if ($LASTEXITCODE -ne 0) { Stop-Onboarding "Codex could not refresh the AGM marketplace." }
codex plugin add "$PluginName@$MarketplaceName"
if ($LASTEXITCODE -ne 0) { Stop-Onboarding "Codex could not install the AGM onboarding plugin." }

if (-not (Get-Command higgsfield -ErrorAction SilentlyContinue)) {
  if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    Stop-Onboarding "Node.js is required for the official Windows Higgsfield CLI install. Install Node.js from https://nodejs.org/ and run this installer again." 3
  }
  Write-Host "Installing the official Higgsfield CLI..."
  npm install --global @higgsfield/cli
  if ($LASTEXITCODE -ne 0) { Stop-Onboarding "The official Higgsfield CLI install failed." 3 }
}

if (-not (Get-Command higgsfield -ErrorAction SilentlyContinue)) {
  Stop-Onboarding "Higgsfield CLI did not become available. See https://github.com/higgsfield-ai/cli and rerun this installer." 3
}

Write-Host "Installing four official Higgsfield skills into durable Codex storage..."
$TempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("agm-onboarding-" + [Guid]::NewGuid())
$Archive = Join-Path $TempRoot "skills.zip"
$Expanded = Join-Path $TempRoot "expanded"
New-Item -ItemType Directory -Force -Path $TempRoot, $Expanded, (Join-Path $CodexRoot "skills") | Out-Null

try {
  Invoke-WebRequest -Uri "https://github.com/higgsfield-ai/skills/archive/refs/heads/main.zip" -OutFile $Archive
  Expand-Archive -Path $Archive -DestinationPath $Expanded -Force
  foreach ($Skill in $Skills) {
    $Source = Join-Path $Expanded "skills-main\$Skill"
    $Destination = Join-Path $CodexRoot "skills\$Skill"
    if (-not (Test-Path $Source)) { Stop-Onboarding "The official Higgsfield package did not contain $Skill." }
    if (Test-Path $Destination) { Remove-Item -Recurse -Force $Destination }
    Copy-Item -Recurse -Force $Source $Destination
  }
} finally {
  Remove-Item -Recurse -Force $TempRoot -ErrorAction SilentlyContinue
}

Write-Host "Verifying the installed package..."
$PluginList = codex plugin list | Out-String
if ($PluginList -notmatch [Regex]::Escape($PluginName)) {
  Stop-Onboarding "Codex could not verify the AGM plugin. Restart Codex and rerun the installer."
}
higgsfield --version
if ($LASTEXITCODE -ne 0) { Stop-Onboarding "The Higgsfield CLI could not be verified." 3 }

& higgsfield account status
if ($LASTEXITCODE -ne 0) {
  Write-Host "Higgsfield needs your personal login. Complete the browser step that opens next."
  & higgsfield auth login
  if ($LASTEXITCODE -ne 0) { Stop-Onboarding "Higgsfield browser login did not complete." 4 }
  & higgsfield account status
  if ($LASTEXITCODE -ne 0) { Stop-Onboarding "Higgsfield login is still incomplete. Run 'higgsfield auth login' and then 'higgsfield account status'." 4 }
}

$RunTest = Read-Host "Generate one inexpensive Higgsfield onboarding test image now? [y/N]"
if ($RunTest -match "^[Yy]$") {
  $Result = higgsfield generate create z_image --prompt "Simple blue AGM onboarding checkmark on a white background" --wait --no-color | Out-String
  if ($LASTEXITCODE -ne 0) { Stop-Onboarding "The Higgsfield test generation failed." 5 }
  Write-Host $Result
  if ($Result -notmatch "https?://") {
    Stop-Onboarding "The test finished without a result URL. Run the test again before marking Higgsfield ready." 5
  }
} else {
  Write-Host "`nRemaining Higgsfield verification:"
  Write-Host 'higgsfield generate create z_image --prompt "Simple blue AGM onboarding checkmark on a white background" --wait'
}

Write-Host "`nAGM package installed. Restart Codex, sign in as your invited AGM email, and ask: Show my AGM setup."
