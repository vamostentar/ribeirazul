-- Migration script: move auth tables from public to auth schema
BEGIN;

-- Ensure target schema exists
CREATE SCHEMA IF NOT EXISTS auth;

-- Move tables
ALTER TABLE public.api_keys SET SCHEMA auth;
ALTER TABLE public.audit_logs SET SCHEMA auth;
ALTER TABLE public.auth_settings SET SCHEMA auth;
ALTER TABLE public.email_verifications SET SCHEMA auth;
ALTER TABLE public.login_attempts SET SCHEMA auth;
ALTER TABLE public.password_resets SET SCHEMA auth;
ALTER TABLE public.refresh_tokens SET SCHEMA auth;
ALTER TABLE public.roles SET SCHEMA auth;
ALTER TABLE public.sessions SET SCHEMA auth;
ALTER TABLE public.token_blacklist SET SCHEMA auth;
ALTER TABLE public.user_preferences SET SCHEMA auth;
ALTER TABLE public.user_profiles SET SCHEMA auth;
ALTER TABLE public.users SET SCHEMA auth;

-- Move prisma migrations table if present
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='_prisma_migrations') THEN
    EXECUTE 'ALTER TABLE public._prisma_migrations SET SCHEMA auth';
  END IF;
END$$;

-- Move sequences that belong to moved tables (best-effort: detect by sequence name patterns)
-- This will move sequences with names like <table>_id_seq or similar; adjust if necessary.
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT sequence_schema, sequence_name FROM information_schema.sequences WHERE sequence_schema = 'public'
  LOOP
    -- If sequence name contains any of the moved table names, move it
    IF r.sequence_name ~ 'users|roles|sessions|refresh_tokens|login_attempts|token_blacklist|password_resets|email_verifications|audit_logs|api_keys|auth_settings|user_preferences|user_profiles' THEN
      EXECUTE format('ALTER SEQUENCE public.%I SET SCHEMA auth', r.sequence_name);
    END IF;
  END LOOP;
END$$;

COMMIT;
