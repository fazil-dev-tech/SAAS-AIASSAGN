$ErrorActionPreference = "Stop"

function Add-VercelEnvProd {
    param([string]$Key, [string]$Value)
    Write-Host "Adding $Key to Production..."
    $Value | npx -y vercel env add $Key production --yes --scope fazil-dev-techs-projects
}

Add-VercelEnvProd "NVIDIA_API_KEY" "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"
Add-VercelEnvProd "SESSION_SECRET" "assignai-prod-secret-f4z1l-p4sh4-2026-enterprise-k3y"
Add-VercelEnvProd "ADMIN_EMAIL" "mohamedfazilpasha156@gmail.com"
Add-VercelEnvProd "ADMIN_PASS" "TGVINCENZO"

Write-Host "Done adding to Production!"
