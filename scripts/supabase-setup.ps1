# Supabase Link and Push Script
# Run this from the project root after ensuring you're logged in:
#   npx supabase login
#
# You will be prompted for your database password during the link step.

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
