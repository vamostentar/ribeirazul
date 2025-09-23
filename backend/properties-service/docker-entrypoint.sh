#!/bin/sh
set -euo pipefail

echo "🚀 Properties Service entrypoint: waiting for dependencies..."

if [ -n "${DATABASE_URL:-}" ]; then
  echo "🔁 Waiting for DATABASE_URL to be ready (best-effort)"
  if command -v pg_isready >/dev/null 2>&1; then
    for i in $(seq 1 30); do
      if pg_isready -q -d "$DATABASE_URL"; then
        echo "✅ Postgres is ready"
        break
      fi
      sleep 1
    done
  else
    echo "⚠️ pg_isready not available; sleeping briefly"
    sleep 3
  fi
fi

# Run migrations if available
if command -v npx >/dev/null 2>&1; then
  echo "🛠️ Running Prisma migrate deploy (properties-service)"
  npx prisma migrate deploy || echo "⚠️ prisma migrate failed (continuing)"
else
  echo "⚠️ npx not available; skipping migrations"
fi

if [ ! -f "dist/server.js" ]; then
  echo "❌ dist/server.js not found"
  ls -la dist || true
  exit 1
fi

exec "$@"
