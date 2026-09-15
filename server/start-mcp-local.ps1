# Starts the local MCP HTTP server as a detached background process that keeps
# running after this terminal/Claude session closes. Safe to re-run - it will
# refuse to start a second copy if one is already running.
$ErrorActionPreference = "Stop"
$serverDir = $PSScriptRoot
$pidFile = Join-Path $serverDir "mcp-local.pid"

if (Test-Path $pidFile) {
    $existingPid = Get-Content $pidFile -ErrorAction SilentlyContinue
    if ($existingPid -and (Get-Process -Id $existingPid -ErrorAction SilentlyContinue)) {
        Write-Host "Already running (PID $existingPid). Use stop-mcp-local.ps1 first if you want to restart."
        exit 0
    }
}

$proc = Start-Process -FilePath "node" -ArgumentList "src/mcp/local-http-server.js" `
    -WorkingDirectory $serverDir -WindowStyle Hidden -PassThru

Set-Content -Path $pidFile -Value $proc.Id
Write-Host "Started seo-keyword-api-local MCP server (PID $($proc.Id)) on http://127.0.0.1:4100/mcp"
Write-Host "Run stop-mcp-local.ps1 to stop it."
