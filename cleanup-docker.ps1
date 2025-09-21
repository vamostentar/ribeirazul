# Script para limpar completamente Docker e remover caches
Write-Host "🧹 LIMPEZA COMPLETA DO DOCKER" -ForegroundColor Blue
Write-Host ""

# Parar todos os containers
Write-Host "1. Parando todos os containers..." -ForegroundColor Yellow
docker-compose --env-file .env.production -f docker-compose.yaml down -v --remove-orphans

# Remover imagens antigas do projeto
Write-Host "2. Removendo imagens antigas..." -ForegroundColor Yellow
docker images | findstr "ribeirazul" | ForEach-Object { 
    $imageId = ($_ -split "\s+")[2]
    if ($imageId -ne "IMAGE") {
        docker rmi $imageId --force
    }
}

# Limpar cache de build
Write-Host "3. Limpando cache de build..." -ForegroundColor Yellow
docker builder prune -f

# Limpar volumes órfãos
Write-Host "4. Limpando volumes órfãos..." -ForegroundColor Yellow
docker volume prune -f

# Limpar redes órfãs
Write-Host "5. Limpando redes órfãs..." -ForegroundColor Yellow
docker network prune -f

# Limpar sistema completo
Write-Host "6. Limpeza completa do sistema Docker..." -ForegroundColor Yellow
docker system prune -a -f

Write-Host ""
Write-Host "✅ LIMPEZA COMPLETA FINALIZADA!" -ForegroundColor Green
Write-Host "Agora você pode reconstruir os containers com:" -ForegroundColor Cyan
Write-Host "docker-compose --env-file .env.production -f docker-compose.yaml up -d --build" -ForegroundColor White
