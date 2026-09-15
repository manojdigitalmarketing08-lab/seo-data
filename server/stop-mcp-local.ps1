# Stops the local MCP HTTP server started by start-mcp-local.ps1.
$ErrorActionPreference = "Stop"
$serverDir = $PSScriptRoot
$pidFile = Join-Path $serverDir "mcp-local.pid"

if (-not (Test-Path $pidFile)) {
    Write-Host "No PID file found - server doesn't look like it's running (or wasn't started with start-mcp-local.ps1)."
    exit 0
}

$targetPid = Get-Content $pidFile -ErrorAction SilentlyContinue
if ($targetPid -and (Get-Process -Id $targetPid -ErrorAction SilentlyContinue)) {
    Stop-Process -Id $targetPid -Force -Confirm:$false
    Write-Host "Stopped MCP server (PID $targetPid)."
} else {
    Write-Host "Process not running (stale PID file). Cleaning up."
}
Remove-Item $pidFile -Force -ErrorAction SilentlyContinue
