#!/bin/sh

echo "🚀 Starting Auth Service (simplified)..."

# Debug: verificar variáveis de ambiente
echo "🔍 Debug: JWT_SECRET length: $(echo -n "$JWT_SECRET" | wc -c)"
echo "🔍 Debug: JWT_SECRET value: ${JWT_SECRET:0:10}..."
echo "🔍 Debug: NODE_ENV: $NODE_ENV"

# Executar migrações Prisma
if command -v npx >/dev/null 2>&1; then
  echo "🛠️  Running Prisma migrations..."
  npx prisma migrate deploy || {
    echo "❌ Prisma migrate deploy failed";
    exit 1;
  }
else
  echo "⚠️  npx not found; skipping prisma migrate deploy"
fi

# Verificar se o arquivo existe
if [ -f "dist/server.js" ]; then
    echo "✅ dist/server.js exists"
else
    echo "❌ dist/server.js not found"
    ls -la dist/
    exit 1
fi

echo "🎯 Starting server..."
exec node dist/server.js


