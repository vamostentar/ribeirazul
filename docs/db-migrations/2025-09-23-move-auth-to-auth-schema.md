# Migration: Move auth tables from `public` to `auth`

Date: 2025-09-23

Summary
-------
This migration moves the auth-related tables that were previously created in the `public` schema into the dedicated `auth` schema. This aligns the database with the intended architecture where each service uses its own schema.

Files
-----
- `2025-09-23-move-auth-to-auth-schema.sql` — SQL script executed to move tables and `_prisma_migrations` to the `auth` schema.

What was done
-------------
- Backup: A binary dump (`ribeirazul.dump`) was created before applying changes.
- The SQL script was executed inside the running Postgres container via `docker compose --env-file .env.production exec -T db psql -U postgres -d ribeirazul`.
- Tables moved: `users`, `roles`, `sessions`, `refresh_tokens`, `login_attempts`, `token_blacklist`, `password_resets`, `email_verifications`, `audit_logs`, `api_keys`, `auth_settings`, `user_profiles`, `user_preferences`.
- `_prisma_migrations` was moved to keep Prisma migration history consistent.

Verification performed
----------------------
- Confirmed the tables are now present in schema `auth`.
- `auth.users` count: 1
- `auth.roles` count: 4
- `admin@ribeirazul.com` remains present and has role `ADMIN`.
- Auth service rebuilt and healthy; `/health` returned `200`.

Notes & follow-ups
------------------
- Prisma schema file reads `DATABASE_URL` from environment; `docker-compose.yaml` contains `?schema=auth` for the `auth` service, so Prisma will operate in the `auth` schema at runtime.
- If you prefer explicit Prisma config, consider adjusting prisma tooling and generating migrations to reflect `auth` as the target schema.
- The dump file `ribeirazul.dump` exists locally in the workspace root — do not commit it to Git; store it securely if you want to keep it.

How to rollback
---------------
1. Restore from dump: `docker compose --env-file .env.production exec -T db pg_restore -U postgres -d ribeirazul --clean --if-exists < ribeirazul.dump`
