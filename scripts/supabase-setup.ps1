# Supabase Link and Push Script
#
# PREREQUISITES (run these first in a regular terminal):
#   1. Login: npm run supabase:login
#      (Opens browser for OAuth - cannot run in automated/non-TTY environments)
#   2. Have your database password ready (from Supabase Dashboard -> Project Settings -> Database)
#
# Then run this script from the project root.

$ErrorActionPreference = "Stop"
$projectRef = "uhvpxkuyfuzqspjoljdj"

Write-Host "Step 1: Linking project to Supabase ($projectRef)..." -ForegroundColor Cyan
npx supabase link --project-ref $projectRef
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
