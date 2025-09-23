#!/bin/sh
set -euo pipefail

echo "🚀 User Service entrypoint: waiting for dependencies..."

if [ -n "${DATABASE_URL:-}" ]; then
  echo "🔁 Waiting for DATABASE_URL to be ready (best-effort)"
  # Try pg_isready if available
  if command -v pg_isready >/dev/null 2>&1; then
    if ! pg_isready -q -d "$DATABASE_URL"; then
      echo "⚠️ pg_isready reports DB not ready, will retry a few times"
      for i in $(seq 1 20); do
        if pg_isready -q -d "$DATABASE_URL"; then
          echo "✅ Postgres is ready"
          break
        fi
        sleep 1
      done
    fi
  else
    echo "⚠️ pg_isready not available; sleeping briefly"
    sleep 3
  fi
fi

# Run migrations if npx available
if command -v npx >/dev/null 2>&1; then
  echo "🛠️ Running Prisma migrations (user-service)"
  npx prisma migrate deploy || echo "⚠️ prisma migrate deploy failed (continuing)"
else
  echo "⚠️ npx not available; skipping migrations"
fi

# Check built artifact
if [ ! -f "dist/server.js" ]; then
  echo "❌ dist/server.js not found"
  ls -la dist || true
  exit 1
fi

exec "$@"
