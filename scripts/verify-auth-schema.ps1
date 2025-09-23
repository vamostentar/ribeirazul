$ComposeEnvFile = '.env.production'
Write-Host "Running auth-schema verification checks"

function DbQuery([string]$sql) {
  docker compose --env-file $ComposeEnvFile exec -T db psql -U postgres -d ribeirazul -q -t -A -c $sql
}

Write-Host "1) List tables in auth schema"
DbQuery "SELECT tablename FROM pg_tables WHERE schemaname='auth' ORDER BY tablename;"

Write-Host "`n2) Count users and roles"
$usersCount = DbQuery "SELECT COUNT(*) FROM auth.users;"
$rolesCount = DbQuery "SELECT COUNT(*) FROM auth.roles;"
Write-Host "users_count=$usersCount"
Write-Host "roles_count=$rolesCount"

Write-Host "`n3) Verify admin user and role"
DbQuery "SELECT u.email || ' | ' || u.username || ' | ' || COALESCE(r.name,'(no role)') FROM auth.users u LEFT JOIN auth.roles r ON u\"roleId\" = r.id WHERE u.email = 'admin@ribeirazul.com';"

Write-Host "`n4) Check _prisma_migrations presence"
DbQuery "SELECT tablename FROM pg_tables WHERE schemaname='auth' AND tablename = '_prisma_migrations';"

Write-Host "`n5) Check auth service health endpoint"
$code = docker compose --env-file $ComposeEnvFile exec -T auth sh -lc "curl -s -o /dev/null -w '%{http_code}' http://localhost:8084/health"
Write-Host "auth /health -> $code"
if ($code -ne '200') { Write-Error 'Healthcheck failed'; exit 2 }

Write-Host "`nAll verification checks completed. If the outputs above look correct, you're good to redeploy on Coolify."
