-- Run as the administrator of the dedicated PondBound database before Prisma deploy.
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'pondbound_migrator') THEN
    CREATE ROLE pondbound_migrator NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'pondbound_api') THEN
    CREATE ROLE pondbound_api NOLOGIN;
  END IF;
  IF EXISTS (
    SELECT FROM pg_roles WHERE rolname IN ('pondbound_migrator', 'pondbound_api')
      AND (rolsuper OR rolreplication OR rolbypassrls)
  ) THEN
    RAISE EXCEPTION 'Existing Pondbound roles have unexpected elevated attributes; audit before provisioning';
  END IF;
  IF EXISTS (
    SELECT FROM pg_auth_members WHERE member = (SELECT oid FROM pg_roles WHERE rolname = 'pondbound_api')
  ) THEN
    RAISE EXCEPTION 'Runtime role has unexpected role memberships; audit before provisioning';
  END IF;
END $$;

-- Supabase's administrator is not a superuser. New roles have no superuser,
-- replication or bypass-RLS attributes; verify those above rather than ALTERing them.
ALTER ROLE pondbound_migrator NOCREATEDB NOCREATEROLE NOINHERIT CONNECTION LIMIT 3;
ALTER ROLE pondbound_api NOCREATEDB NOCREATEROLE NOINHERIT CONNECTION LIMIT 20;
ALTER ROLE pondbound_api SET statement_timeout = '10s';
ALTER ROLE pondbound_api SET idle_in_transaction_session_timeout = '10s';
ALTER ROLE pondbound_api SET search_path = pg_catalog, game;

GRANT pondbound_migrator TO CURRENT_USER;
CREATE SCHEMA IF NOT EXISTS game AUTHORIZATION pondbound_migrator;
DO $$
DECLARE browser_role text;
BEGIN
  IF (SELECT nspowner FROM pg_namespace WHERE nspname = 'game') <> (SELECT oid FROM pg_roles WHERE rolname = 'pondbound_migrator') THEN
    RAISE EXCEPTION 'The game schema has an unexpected owner; refusing to take ownership';
  END IF;
  EXECUTE format('GRANT CONNECT ON DATABASE %I TO pondbound_migrator, pondbound_api', current_database());
  FOR browser_role IN SELECT rolname FROM pg_roles WHERE rolname IN ('anon', 'authenticated') LOOP
    EXECUTE format('REVOKE ALL ON SCHEMA game FROM %I', browser_role);
    EXECUTE format('REVOKE ALL ON ALL TABLES IN SCHEMA game FROM %I', browser_role);
  END LOOP;
END $$;
REVOKE ALL ON SCHEMA game FROM PUBLIC;
REVOKE ALL ON ALL TABLES IN SCHEMA game FROM PUBLIC;
GRANT USAGE ON SCHEMA game TO pondbound_api;
ALTER DEFAULT PRIVILEGES FOR ROLE pondbound_migrator IN SCHEMA game REVOKE ALL ON TABLES FROM PUBLIC;
ALTER DEFAULT PRIVILEGES FOR ROLE pondbound_migrator IN SCHEMA game REVOKE ALL ON SEQUENCES FROM PUBLIC;
ALTER DEFAULT PRIVILEGES FOR ROLE pondbound_migrator IN SCHEMA game REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
-- No blanket runtime grants: each migration grants only the tables it introduces.
