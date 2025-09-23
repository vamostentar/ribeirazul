#!/usr/bin/env bash
set -euo pipefail

# Usage: ./scripts/verify-auth-schema.sh
# Requires: docker compose and .env.production in the repo root

echo "Running auth-schema verification checks"

COMPOSE_ENV_FILE=.env.production
DB_CMD="docker compose --env-file ${COMPOSE_ENV_FILE} exec -T db psql -U postgres -d ribeirazul -q -t -A -c"

echo "1) List tables in auth schema"
${DB_CMD} "SELECT tablename FROM pg_tables WHERE schemaname='auth' ORDER BY tablename;"

echo "\n2) Count users and roles"
USERS_COUNT=$(${DB_CMD} "SELECT COUNT(*) FROM auth.users;")
ROLES_COUNT=$(${DB_CMD} "SELECT COUNT(*) FROM auth.roles;")
echo "users_count=${USERS_COUNT}"
echo "roles_count=${ROLES_COUNT}"

echo "\n3) Verify admin user and role"
${DB_CMD} "SELECT u.email || ' | ' || u.username || ' | ' || COALESCE(r.name,'(no role)') FROM auth.users u LEFT JOIN auth.roles r ON u\"roleId\" = r.id WHERE u.email = 'admin@ribeirazul.com';"

echo "\n4) Check _prisma_migrations presence"
${DB_CMD} "SELECT tablename FROM pg_tables WHERE schemaname='auth' AND tablename = '_prisma_migrations';"

echo "\n5) Check auth service health endpoint"
docker compose --env-file ${COMPOSE_ENV_FILE} exec -T auth sh -lc "curl -s -o /dev/null -w '%{http_code}' http://localhost:8084/health" | { read code; echo "auth /health -> $code"; if [ "$code" != "200" ]; then echo 'Healthcheck failed' >&2; exit 2; fi }

echo "\nAll verification checks completed. If the outputs above look correct, you're good to redeploy on Coolify."
