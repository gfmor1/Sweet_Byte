# Windows (PowerShell) version of build-local.sh.
# Usage: scripts\build-local.ps1 [-BuildOnly]
param([switch]$BuildOnly)
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot

Push-Location "$root\backend"
.\mvnw.cmd -B -DskipTests package
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
Pop-Location

Push-Location "$root\FrontEnd"
npm ci
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
npm run build
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
Pop-Location

if ($BuildOnly) { exit 0 }

$jar = (Get-ChildItem "$root\backend\target\*.jar" | Where-Object { $_.Name -notlike "*.original" } | Select-Object -First 1).FullName
$backend = Start-Process java -ArgumentList "-jar", "`"$jar`"" -PassThru -NoNewWindow
try {
    Push-Location "$root\FrontEnd"
    npm start   # Ctrl+C stops the frontend; the backend is stopped below
} finally {
    Pop-Location
    if (-not $backend.HasExited) { Stop-Process -Id $backend.Id -Force }
}
