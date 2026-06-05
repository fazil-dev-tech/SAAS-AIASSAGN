$ErrorActionPreference = "Stop"

function Add-VercelEnv {
    param([string]$Key, [string]$Value)
    Write-Host "Adding $Key..."
    # Vercel CLI reads the value from standard input
    $Value | npx -y vercel env add $Key production --yes --scope fazil-dev-techs-projects
    $Value | npx -y vercel env add $Key preview --yes --scope fazil-dev-techs-projects
    $Value | npx -y vercel env add $Key development --yes --scope fazil-dev-techs-projects
}

Add-VercelEnv "DATABASE_URL" "postgresql://postgres:[Adil123#]@db.hricdgrdvyaowhvevxok.supabase.co:5432/postgres"
Add-VercelEnv "NVIDIA_API_KEY" "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"
Add-VercelEnv "SESSION_SECRET" "assignai-prod-secret-f4z1l-p4sh4-2026-enterprise-k3y"
Add-VercelEnv "ADMIN_EMAIL" "mohamedfazilpasha156@gmail.com"
Add-VercelEnv "ADMIN_PASS" "TGVINCENZO"

Write-Host "Done adding missing environment variables!"
