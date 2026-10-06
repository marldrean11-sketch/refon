# Restarts the backend and frontend dev servers, then runs a Playwright command.
#
# This exists because of two operational facts about this repo that are not
# obvious from the test output.
#
# 1. `authLimiter` allows 10 auth requests per 15 minutes per IP, stored in
#    memory. `tests/global-setup.js` spends five of them (three registrations,
#    two sign-ins) before a single test runs, so two consecutive runs exhaust
#    the budget and every later run dies in global setup with a 429 that reads
#    like an application failure. Restarting the process clears the store.
# 2. "The port is listening" is not the same as "the server is serving". A
#    process can bind 4000 and then crash while starting its remaining
#    subsystems, so readiness is probed over HTTP.
#
#   .\qa\dev-run.ps1                     # restart both, run the phase 1 spec
#   .\qa\dev-run.ps1 -Grep "P1-06"       # one test
#   .\qa\dev-run.ps1 -Full               # the existing regression suite
#   .\qa\dev-run.ps1 -NoRestart          # reuse whatever is already running
param(
  [string]$Grep = "",
  [switch]$Full,
  [switch]$NoRestart,
  [string]$Reporter = "list"
)

$ErrorActionPreference = "Stop"
$repo = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$e2e = Join-Path $repo "e2e-ui"

function Stop-Port([int]$Port) {
  $pids = (Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue).OwningProcess
  foreach ($procId in $pids) {
    Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
  }
}

# Kills nodemon as well as the server. Stopping only the listener leaves nodemon
# alive, and it restarts the child into the same port, which is how a "stopped"
# backend comes back and produces a port conflict on the next launch.
function Stop-Tree([string]$Match) {
  Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" |
    Where-Object { $_.CommandLine -match $Match } |
    ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
}

function Wait-Http([string]$Url, [string]$Label) {
  for ($i = 0; $i -lt 120; $i++) {
    Start-Sleep -Seconds 1
    try {
      $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
      if ($response.StatusCode -lt 500) {
        Write-Host "[dev-run] $Label ready after ${i}s"
        return
      }
    } catch {
      $code = $_.Exception.Response.StatusCode.value__
      # 401/403 are the API answering correctly for an anonymous request.
      if ($code -and $code -lt 500) {
        Write-Host "[dev-run] $Label ready after ${i}s (answered $code)"
        return
      }
    }
  }
  throw "$Label never became ready at $Url"
}

function Start-Server([int]$Port, [string]$Label, [string]$Cwd, [string]$Url) {
  Stop-Port $Port

  # Inside the server's own directory, so each log lands beside its package.json
  # rather than in the parent.
  Start-Process -FilePath "cmd.exe" `
    -ArgumentList "/c", "npm run dev > $Label.log 2>&1" `
    -WorkingDirectory $Cwd -WindowStyle Hidden
  Wait-Http $Url $Label
}

if (-not $NoRestart) {
  Write-Host "[dev-run] stopping existing dev servers"
  Stop-Tree 'nodemon'
  Stop-Tree 'vite'
  Stop-Port 5173
  Stop-Port 4000
  Start-Sleep -Seconds 2

  Start-Server 4000 "backend-dev" (Join-Path $repo "backend") "http://localhost:4000/api/listings"
  Start-Server 5173 "frontend-dev" (Join-Path $repo "frontend") "http://localhost:5173/"
}

# The suite's database reset refuses to run without these, and it must use the
# same values as the backend or it would reset a different database than the one
# the tests are about to talk to.
Get-Content (Join-Path $repo "backend\.env") | ForEach-Object {
  if ($_ -match '^([A-Z_]+)=(.*)$') {
    [Environment]::SetEnvironmentVariable($matches[1], $matches[2].Trim('"'), 'Process')
  }
}

$pwArgs = @("playwright", "test")

if ($Full) {
  # Exclude this spec: it is the phase 1 verification, not the regression suite.
  $pwArgs += @("--grep-invert", "P1 Phase 1 foundation")
} else {
  $pwArgs += @("tests/phase1-foundation.spec.js")
}

if ($Grep) {
  $pwArgs += @("--grep", $Grep)
}

$pwArgs += @("--reporter", $Reporter)

Push-Location $e2e
try {
  & npx @pwArgs
  $code = $LASTEXITCODE
} finally {
  Pop-Location
}

Write-Host "[dev-run] playwright exit code: $code"
exit $code