#!/bin/bash

# API Gateway Modular Build Script
# Script para build e deploy da arquitetura modular do API Gateway

set -e

echo "🚀 Starting API Gateway Modular Build Process..."

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função para log colorido
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Verifica se estamos no diretório correto
if [ ! -f "package.json" ]; then
    log_error "package.json not found. Please run from api-gateway directory."
    exit 1
fi

# Limpa build anterior
log_info "Cleaning previous build..."
rm -rf dist/
rm -rf node_modules/.cache/
log_success "Clean completed"

# Instala dependências
log_info "Installing dependencies with corepack..."
corepack yarn install --frozen-lockfile
log_success "Dependencies installed"

# Verifica tipos TypeScript
log_info "Type checking..."
if ! corepack yarn tsc --noEmit; then
    log_error "TypeScript type checking failed"
    exit 1
fi
log_success "Type checking passed"

# Executa linting
log_info "Running ESLint..."
if ! corepack yarn eslint src --ext .ts; then
    log_warning "ESLint found issues, but continuing..."
else
    log_success "ESLint passed"
fi

# Executa testes
log_info "Running tests..."
if ! corepack yarn test; then
    log_error "Tests failed"
    exit 1
fi
log_success "All tests passed"

# Build do projeto
log_info "Building project..."
if ! corepack yarn build; then
    log_error "Build failed"
    exit 1
fi
log_success "Build completed"

# Verifica se os arquivos essenciais foram criados
log_info "Verifying build artifacts..."

essential_files=(
    "dist/proxy.js"
    "dist/app.js"
    "dist/server.js"
    "dist/interfaces/stream-proxy.interface.js"
    "dist/implementations/stream-proxy.implementation.js"
    "dist/factories/stream-proxy.factory.js"
)

for file in "${essential_files[@]}"; do
    if [ ! -f "$file" ]; then
        log_error "Essential file missing: $file"
        exit 1
    fi
done

log_success "All essential build artifacts verified"

# Executa testes de integração se disponíveis
if [ -f "dist/test/stream-proxy.integration.test.js" ]; then
    log_info "Running integration tests on built artifacts..."
    if ! corepack yarn test:integration; then
        log_warning "Integration tests failed, but build is complete"
    else
        log_success "Integration tests passed"
    fi
fi

# Build da imagem Docker se solicitado
if [ "$1" = "--docker" ]; then
    log_info "Building Docker image..."
    
    # Verifica se Dockerfile existe
    if [ ! -f "Dockerfile" ]; then
        log_error "Dockerfile not found"
        exit 1
    fi
    
    # Build da imagem
    docker build -t ribeirazul/api-gateway:latest .
    
    if [ $? -eq 0 ]; then
        log_success "Docker image built successfully"
        
        # Tag com versão se fornecida
        if [ -n "$2" ]; then
            docker tag ribeirazul/api-gateway:latest ribeirazul/api-gateway:$2
            log_success "Tagged as version: $2"
        fi
    else
        log_error "Docker build failed"
        exit 1
    fi
fi

# Estatísticas do build
log_info "Build Statistics:"
echo "📊 Build artifacts:"
find dist -name "*.js" | wc -l | xargs echo "   JavaScript files:"
find dist -name "*.d.ts" | wc -l | xargs echo "   Type definition files:"
du -sh dist | cut -f1 | xargs echo "   Total size:"

echo
log_success "🎉 API Gateway modular build completed successfully!"
echo
log_info "Next steps:"
echo "   1. Test the build: corepack yarn start"
echo "   2. Run with Docker: docker run -p 8081:8081 ribeirazul/api-gateway:latest"
echo "   3. Deploy to staging/production environment"
echo

# Verifica se há atualizações de dependências disponíveis
log_info "Checking for dependency updates..."
if command -v npm-check-updates &> /dev/null; then
    ncu --format group
else
    log_warning "npm-check-updates not installed. Install with: npm install -g npm-check-updates"
fi

echo
log_info "Build process completed at $(date)"
