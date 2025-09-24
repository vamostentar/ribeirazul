#!/bin/sh
set -e

echo "🚀 Auth Service starting..."
echo "📍 Running as user: $(whoami)"
echo "📁 Working directory: $(pwd)"
echo "📦 Node version: $(node -v)"

# Log environment
echo "🔍 Environment:"
echo "   NODE_ENV=${NODE_ENV}"
echo "   DATABASE_URL=${DATABASE_URL}"
echo "   Auth schema will be used"

# Simple wait for postgres (without complex parsing)
echo "⏳ Waiting for database to be ready..."
sleep 10

# Run migrations (as root for permissions)
echo "🛠️ Running database migrations..."
if [ -f /app/node_modules/.bin/prisma ]; then
    echo "   Found Prisma at /app/node_modules/.bin/prisma"
    cd /app
    /app/node_modules/.bin/prisma migrate deploy || {
        echo "⚠️ Migration failed, retrying in 5 seconds..."
        sleep 5
        /app/node_modules/.bin/prisma migrate deploy || echo "❌ Migrations failed - continuing anyway"
    }
    
    # Run seed if in development or first run
    if [ "${NODE_ENV}" != "production" ] || [ "${SEED_DEFAULT_ADMIN}" = "true" ]; then
        echo "🌱 Running database seed..."
        /app/node_modules/.bin/prisma db seed || echo "⚠️ Seed may already exist"
    fi
else
    echo "❌ Prisma not found - skipping migrations"
fi

# Run the server directly (we're already root, security is handled by container isolation)
echo "🎯 Starting server..."
exec "$@"
