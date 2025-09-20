# PowerShell script para validacao de configuracao de producao
Write-Host "VALIDACAO DE CONFIGURACAO DE PRODUCAO" -ForegroundColor Blue
Write-Host ""

$errors = 0

# Funcao para verificar variaveis de ambiente
function Check-EnvVar {
    param($varName)
    
    if (Test-Path ".env.production") {
        $content = Get-Content ".env.production" | Where-Object { $_ -match "^$varName=" }
        if ($content) {
            $value = ($content -split "=", 2)[1]
            if ($value -and $value -ne "your_secure_password" -and $value -ne "your_domain.com") {
                Write-Host "OK $varName : Configurado" -ForegroundColor Green
                return $true
            }
        }
    }
    Write-Host "ERRO $varName : Nao configurado ou usando valor padrao" -ForegroundColor Red
    return $false
}

# 1. Verificar arquivo .env.production
Write-Host "1. Verificando arquivo .env.production..." -ForegroundColor Blue
if (-not (Test-Path ".env.production")) {
    Write-Host "ERRO: Arquivo .env.production nao encontrado!" -ForegroundColor Red
    exit 1
}
Write-Host "OK: Arquivo .env.production encontrado" -ForegroundColor Green
Write-Host ""

# 2. Verificar variaveis criticas
Write-Host "2. Verificando variaveis de ambiente criticas..." -ForegroundColor Blue

$criticalVars = @(
    "POSTGRES_USER",
    "POSTGRES_PASSWORD", 
    "JWT_SECRET",
    "API_URL",
    "CORS_ORIGIN"
)

foreach ($var in $criticalVars) {
    if (-not (Check-EnvVar $var)) {
        $errors++
    }
}

Write-Host ""

# 3. Verificar JWT Secret
Write-Host "3. Verificando JWT_SECRET..." -ForegroundColor Blue
$jwtSecret = (Get-Content ".env.production" | Where-Object { $_ -match "^JWT_SECRET=" } | ForEach-Object { ($_ -split "=", 2)[1] })
if ($jwtSecret.Length -lt 32) {
    Write-Host "ERRO: JWT_SECRET deve ter pelo menos 32 caracteres" -ForegroundColor Red
    $errors++
} else {
    Write-Host "OK: JWT_SECRET tem tamanho adequado" -ForegroundColor Green
}

Write-Host ""

# 4. Verificar docker-compose
Write-Host "4. Validando docker-compose.production.yml..." -ForegroundColor Blue
try {
    $null = docker-compose --env-file .env.production -f docker-compose.production.yml config 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "OK: Configuracao do docker-compose valida" -ForegroundColor Green
    } else {
        Write-Host "ERRO: Configuracao do docker-compose invalida" -ForegroundColor Red
        $errors++
    }
} catch {
    Write-Host "ERRO: Nao foi possivel validar docker-compose" -ForegroundColor Red
    $errors++
}

Write-Host ""

# Resumo final
Write-Host "RESUMO DA VALIDACAO" -ForegroundColor Blue
if ($errors -eq 0) {
    Write-Host "SUCESSO: TODAS AS CONFIGURACOES ESTAO CORRETAS!" -ForegroundColor Green
    Write-Host "Sistema pronto para build de producao" -ForegroundColor Green
    Write-Host ""
    Write-Host "Proximos passos:" -ForegroundColor Blue
    Write-Host "1. docker-compose -f docker-compose.production.yml build --no-cache"
    Write-Host "2. docker-compose --env-file .env.production -f docker-compose.production.yml up -d"
    exit 0
} else {
    Write-Host "ERRO: ENCONTRADOS $errors PROBLEMAS DE CONFIGURACAO" -ForegroundColor Red
    Write-Host "Corrija os problemas antes de prosseguir" -ForegroundColor Red
    exit 1
}