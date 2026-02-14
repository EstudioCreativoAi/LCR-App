# Supabase Link and Push Script
#
# PREREQUISITES:
#   1. Set SUPABASE_PROJECT_REF in .env (or as env var). See .env.example.
#   2. Login: npm run supabase:login
#   3. Have your database password ready (from Supabase Dashboard -> Project Settings -> Database)
#
# Run from the project root.

$ErrorActionPreference = "Stop"
if (-not $env:SUPABASE_PROJECT_REF) {
    if (Test-Path .env) {
        Get-Content .env | ForEach-Object {
            if ($_ -match '^\s*SUPABASE_PROJECT_REF\s*=\s*(.+)\s*$') {
                $env:SUPABASE_PROJECT_REF = $Matches[1].Trim().Trim('"').Trim("'")
            }
        }
    }
}
if (-not $env:SUPABASE_PROJECT_REF) {
    Write-Host "SUPABASE_PROJECT_REF is not set. Add it to .env or set the environment variable." -ForegroundColor Red
    exit 1
}

Write-Host "Step 1: Linking project to Supabase ($($env:SUPABASE_PROJECT_REF))..." -ForegroundColor Cyan
npx supabase link --project-ref $env:SUPABASE_PROJECT_REF
if ($LASTEXITCODE -ne 0) {
    Write-Host "`nIf you see 'Access token not provided', run: npx supabase login" -ForegroundColor Yellow
    exit 1
}

Write-Host "`nStep 2: Pushing migrations to remote database..." -ForegroundColor Cyan
npx supabase db push
if ($LASTEXITCODE -ne 0) {
    exit 1
}

Write-Host "`nDone. Migrations pushed successfully." -ForegroundColor Green
