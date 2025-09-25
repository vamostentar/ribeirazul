#!/bin/sh
set -e

echo "🚀 User Service entrypoint: waiting for dependencies..."
echo "🔍 Running as user: $(whoami)"

if [ -n "${DATABASE_URL:-}" ]; then
  echo "⏳ Waiting for DATABASE_URL to be ready"
  if command -v pg_isready >/dev/null 2>&1; then
    # Extract host and port from DATABASE_URL (ignore schema parameter)
    DB_HOST=$(echo "$DATABASE_URL" | sed -n 's/.*@\([^:]*\):.*/\1/p')
    DB_PORT=$(echo "$DATABASE_URL" | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
    for i in $(seq 1 30); do
      if pg_isready -q -h "$DB_HOST" -p "$DB_PORT"; then
        echo "✅ Postgres is ready"
        break
      fi
      sleep 1
    done
  else
    echo "⚠️ pg_isready not available; sleeping briefly"
    sleep 5
  fi
fi

# Run migrations using local Prisma binary (no npx)
if [ -x "/app/node_modules/.bin/prisma" ]; then
  echo "🔨 Running Prisma migrations (local binary)"
  /app/node_modules/.bin/prisma migrate deploy || {
    echo "⚠️ Migration failed, retrying in 5 seconds..."
    sleep 5
    /app/node_modules/.bin/prisma migrate deploy || echo "⚠️ Migrations failed - continuing anyway"
  }
else
  echo "❌ Prisma binary not found at /app/node_modules/.bin/prisma"
  exit 1
fi

# Check built artifact
if [ ! -f "dist/server.js" ]; then
  echo "❌ dist/server.js not found"
  ls -la dist || true
  exit 1
fi

# Switch to nodeuser for security
echo "🔄 Switching to nodeuser for runtime security..."
exec su-exec nodeuser "$@"