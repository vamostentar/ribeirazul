# PowerShell script para criar certificados SSL auto-assinados para teste
Write-Host "🔐 Criando certificados SSL auto-assinados para teste..." -ForegroundColor Blue

# Criar diretório SSL se não existir
if (-not (Test-Path "ssl\live\www.neodras.com")) {
    New-Item -ItemType Directory -Path "ssl\live\www.neodras.com" -Force | Out-Null
    Write-Host "✅ Diretório SSL criado" -ForegroundColor Green
}

# Gerar chave privada
Write-Host "🔑 Gerando chave privada..." -ForegroundColor Blue
& openssl genrsa -out ssl\live\www.neodras.com\privkey.pem 2048

# Gerar certificado auto-assinado
Write-Host "📜 Gerando certificado auto-assinado..." -ForegroundColor Blue
& openssl req -new -x509 -key ssl\live\www.neodras.com\privkey.pem -out ssl\live\www.neodras.com\fullchain.pem -days 365 -subj "/C=PT/ST=Lisboa/L=Lisboa/O=Ribeira Azul/OU=Development/CN=www.neodras.com/subjectAltName=DNS:www.neodras.com,DNS:neodras.com,DNS:api.neodras.com"

if (Test-Path "ssl\live\www.neodras.com\fullchain.pem") {
    Write-Host "✅ Certificados SSL criados com sucesso!" -ForegroundColor Green
    Write-Host "📁 Localizados em: ssl\live\www.neodras.com\" -ForegroundColor Blue
    
    # Listar arquivos criados
    Get-ChildItem "ssl\live\www.neodras.com\" | ForEach-Object {
        Write-Host "   - $($_.Name)" -ForegroundColor Gray
    }
    
    Write-Host ""
    Write-Host "⚠️  AVISO: Estes são certificados auto-assinados para TESTE apenas!" -ForegroundColor Yellow
    Write-Host "   Para produção, use Let's Encrypt ou certificados válidos" -ForegroundColor Yellow
    
} else {
    Write-Host "❌ Falha ao criar certificados SSL" -ForegroundColor Red
    exit 1
}
