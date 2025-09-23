## Move auth tables to `auth` schema

This PR includes a migration script and documentation for moving auth-related tables from `public` to the `auth` schema.

What it contains:
- `docs/db-migrations/2025-09-23-move-auth-to-auth-schema.sql` — the SQL that was executed in the running DB to move tables and `_prisma_migrations`.
- `docs/db-migrations/2025-09-23-move-auth-to-auth-schema.md` — notes and verification results.
- `scripts/verify-auth-schema.sh` and `scripts/verify-auth-schema.ps1` — small utilities to re-run the same verification checks.

Why:
- Aligns database schema ownership with the intended architecture where each service uses a dedicated schema.
- Ensures Prisma migration history is present in the `auth` schema.

How to verify:
- Run `./scripts/verify-auth-schema.sh` (or the PowerShell equivalent) on the host where `docker compose` and `.env.production` are available.

Rollback:
- Restore the `ribeirazul.dump` produced during the operation (not checked into the repo).

Notes:
- The runtime `DATABASE_URL` in `docker-compose.yaml` for the `auth` service already contains `?schema=auth`, so no changes were necessary in code. Prisma will operate in the `auth` schema at runtime.
