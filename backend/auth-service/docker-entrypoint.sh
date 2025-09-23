#!/bin/sh
set -euo pipefail

echo "🚀 Auth Service entrypoint: waiting for dependencies..."

# Helper: wait for a TCP host:port using pg_isready or nc fallback
wait_for_postgres() {
  local dsn="$1"
  echo "🔁 Waiting for Postgres (DATABASE_URL) to be ready"
  # Try using pg_isready if available
  if command -v pg_isready >/dev/null 2>&1; then
    for i in $(seq 1 30); do
      if pg_isready -q -d "$dsn"; then
        echo "✅ Postgres is ready"
        return 0
      fi
      sleep 1
    done
  else
    # Fallback: attempt to connect with node's tcp via curl to localhost:5432 not reliable; just sleep
    echo "⚠️ pg_isready not available; relying on time-based wait"
    sleep 5
  fi
  echo "❌ Postgres did not become ready"
  return 1
}

wait_for_redis() {
  local hostport="$1"
  echo "🔁 Waiting for Redis at ${hostport}..."
  for i in $(seq 1 30); do
    if command -v redis-cli >/dev/null 2>&1; then
      if redis-cli -h "${hostport%:*}" -p "${hostport#*:}" ping >/dev/null 2>&1; then
        echo "✅ Redis is ready"
        return 0
      fi
    fi
    sleep 1
  done
  echo "⚠️ Redis did not become ready (continuing if optional)"
  return 1
}

echo "🔍 Environment summary"
echo "  NODE_ENV=${NODE_ENV:-}
  DATABASE_URL=${DATABASE_URL:-}
  REDIS_URL=${REDIS_URL:-}
  JWT_SECRET=${JWT_SECRET:+(set)}"

# Wait for DB (best-effort)
if [ -n "${DATABASE_URL:-}" ]; then
  wait_for_postgres "$DATABASE_URL" || echo "⚠️ Proceeding despite DB not ready"
fi

# Wait for Redis if configured
if [ -n "${REDIS_URL:-}" ]; then
  # parse host:port (simple)
  REDIS_HOSTPORT=$(echo "$REDIS_URL" | sed -n 's#.*://\([^:@]*\):\?\([0-9]*\).*#\1:\2#p')
  wait_for_redis "$REDIS_HOSTPORT" || true
fi

# Run Prisma migrations with retries
if command -v npx >/dev/null 2>&1; then
  echo "🛠️ Running Prisma migrate deploy (with retries)"
  attempt=0
  until [ $attempt -ge 5 ]
  do
    if npx prisma migrate deploy; then
      echo "✅ Prisma migrations applied"
      break
    fi
    attempt=$((attempt+1))
    echo "⚠️ Prisma migrate failed; retrying ($attempt/5)"
    sleep 2
  done
  if [ $attempt -ge 5 ]; then
    echo "❌ Prisma migrate failed after retries"
    # Do not exit non-zero to allow services to start and report health; change if strict behavior desired
  fi
else
  echo "⚠️ npx not available; skipping prisma migrate"
fi

# Ensure built artifact exists
if [ ! -f "dist/server.js" ]; then
  echo "❌ dist/server.js not found; listing dist/"
  ls -la dist || true
  # fail because server can't start
  exit 1
fi

echo "🎯 Starting server"
exec "$@"


