#!/usr/bin/env pwsh
# This script stops the npm/vite process running on port 8080.
# Requires PowerShell.

$port = 8080
Write-Host "Searching for process on port $port..." -ForegroundColor Cyan

$process = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -First 1

if ($process) {
    $procName = (Get-Process -Id $process).ProcessName
    Write-Host "Found process ID $process ($procName) on port $port. Stopping..." -ForegroundColor Yellow
    Stop-Process -Id $process -Force -ErrorAction SilentlyContinue
    Write-Host "Successfully stopped server on port $port." -ForegroundColor Green
} else {
    Write-Host "No process found on port $port." -ForegroundColor Gray
}
