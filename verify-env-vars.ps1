# Script para verificar variáveis de ambiente que podem estar interferindo
Write-Host "VERIFICACAO DE VARIAVEIS DE AMBIENTE" -ForegroundColor Blue
Write-Host ""

# Verificar variáveis de ambiente do sistema que podem conter JWT_SECRET
Write-Host "1. Verificando variáveis de ambiente do sistema..." -ForegroundColor Yellow

$envVars = @("JWT_SECRET", "CORS_ORIGIN", "DATABASE_URL", "REDIS_PASSWORD")

foreach ($var in $envVars) {
    $value = [System.Environment]::GetEnvironmentVariable($var, "Machine")
    if ($value) {
        Write-Host "SISTEMA (Machine): $var = $($value.Substring(0, [Math]::Min(20, $value.Length)))..." -ForegroundColor Red
    }
    
    $value = [System.Environment]::GetEnvironmentVariable($var, "User")
    if ($value) {
        Write-Host "USUÁRIO (User): $var = $($value.Substring(0, [Math]::Min(20, $value.Length)))..." -ForegroundColor Red
    }
    
    $value = [System.Environment]::GetEnvironmentVariable($var, "Process")
    if ($value) {
        Write-Host "PROCESSO (Process): $var = $($value.Substring(0, [Math]::Min(20, $value.Length)))..." -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "2. Verificando arquivo .env.production..." -ForegroundColor Yellow
if (Test-Path ".env.production") {
    $content = Get-Content ".env.production"
    $jwtLine = $content | Where-Object { $_ -match "^JWT_SECRET=" }
    if ($jwtLine) {
        $jwtValue = ($jwtLine -split "=", 2)[1]
        Write-Host "ARQUIVO .env.production: JWT_SECRET = $($jwtValue.Substring(0, [Math]::Min(20, $jwtValue.Length)))..." -ForegroundColor Green
    }
} else {
    Write-Host "ERRO: Arquivo .env.production não encontrado!" -ForegroundColor Red
}

Write-Host ""
Write-Host "3. Verificando Docker Compose config..." -ForegroundColor Yellow
try {
    $dockerConfig = docker-compose --env-file .env.production -f docker-compose.yaml config 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Docker Compose config valido" -ForegroundColor Green
    } else {
        Write-Host "Erro na configuracao do Docker Compose" -ForegroundColor Red
        Write-Host $dockerConfig -ForegroundColor Red
    }
} catch {
    Write-Host "Erro ao validar Docker Compose" -ForegroundColor Red
}

Write-Host ""
Write-Host "VERIFICACAO COMPLETA!" -ForegroundColor Green
