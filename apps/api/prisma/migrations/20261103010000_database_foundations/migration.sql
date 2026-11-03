BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';

-- Existing foundation timestamps were stored as UTC without a timezone.
ALTER TABLE game."Player"
    ALTER COLUMN "id" SET DEFAULT gen_random_uuid(),
    ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(3) USING "createdAt" AT TIME ZONE 'UTC',
    ALTER COLUMN "updatedAt" TYPE TIMESTAMPTZ(3) USING "updatedAt" AT TIME ZONE 'UTC',
    ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;
-- The old client-managed updatedAt could precede the database clock slightly.
-- Repair only invalid orderings; valid historical timestamps remain unchanged.
UPDATE game."Player" SET "updatedAt" = "createdAt" WHERE "updatedAt" < "createdAt";
ALTER TABLE game."Player" ADD CONSTRAINT "Player_timestamps_check" CHECK ("updatedAt" >= "createdAt");

CREATE TABLE game."AuditEvent" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "occurredAt" TIMESTAMPTZ(3) NOT NULL DEFAULT clock_timestamp(),
    "eventType" VARCHAR(64) NOT NULL,
    "entityType" VARCHAR(64) NOT NULL,
    "entityId" UUID NOT NULL,
    "actorPlayerId" UUID,
    "data" JSONB NOT NULL DEFAULT '{}'::jsonb,
    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "AuditEvent_eventType_check" CHECK ("eventType" ~ '^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$'),
    CONSTRAINT "AuditEvent_entityType_check" CHECK ("entityType" ~ '^[a-z][a-z0-9_]*$'),
    CONSTRAINT "AuditEvent_data_check" CHECK (jsonb_typeof("data") = 'object' AND octet_length("data"::text) <= 16384)
);
CREATE INDEX "AuditEvent_entityType_entityId_occurredAt_id_idx"
    ON game."AuditEvent" ("entityType", "entityId", "occurredAt", "id");
CREATE INDEX "AuditEvent_actorPlayerId_occurredAt_id_idx"
    ON game."AuditEvent" ("actorPlayerId", "occurredAt", "id");
CREATE INDEX "AuditEvent_occurredAt_id_idx" ON game."AuditEvent" ("occurredAt", "id");

REVOKE ALL ON game."AuditEvent" FROM PUBLIC, pondbound_api;
ALTER TABLE game."AuditEvent" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT ON game."AuditEvent" TO pondbound_api;
CREATE POLICY backend_audit_read ON game."AuditEvent" FOR SELECT TO pondbound_api USING (true);
CREATE POLICY backend_audit_append ON game."AuditEvent" FOR INSERT TO pondbound_api WITH CHECK (true);

CREATE FUNCTION game.protect_player_identity() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        NEW."createdAt" := statement_timestamp();
        NEW."updatedAt" := NEW."createdAt";
        RETURN NEW;
    END IF;
    IF NEW."id" IS DISTINCT FROM OLD."id"
       OR NEW."authId" IS DISTINCT FROM OLD."authId"
       OR NEW."createdAt" IS DISTINCT FROM OLD."createdAt" THEN
        RAISE EXCEPTION 'Player identity and creation timestamp are immutable' USING ERRCODE = '23514';
    END IF;
    NEW."updatedAt" := GREATEST(OLD."updatedAt", clock_timestamp());
    RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION game.protect_player_identity() FROM PUBLIC;
CREATE TRIGGER player_identity_and_timestamp BEFORE INSERT OR UPDATE ON game."Player"
    FOR EACH ROW EXECUTE FUNCTION game.protect_player_identity();

CREATE FUNCTION game.reject_audit_mutation() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog AS $$
BEGIN
    RAISE EXCEPTION 'Audit events are append-only' USING ERRCODE = '55000';
END;
$$;
REVOKE ALL ON FUNCTION game.reject_audit_mutation() FROM PUBLIC;
CREATE TRIGGER audit_no_update_delete BEFORE UPDATE OR DELETE ON game."AuditEvent"
    FOR EACH ROW EXECUTE FUNCTION game.reject_audit_mutation();
CREATE TRIGGER audit_no_truncate BEFORE TRUNCATE ON game."AuditEvent"
    FOR EACH STATEMENT EXECUTE FUNCTION game.reject_audit_mutation();
ALTER TABLE game."AuditEvent" ENABLE ALWAYS TRIGGER audit_no_update_delete;
ALTER TABLE game."AuditEvent" ENABLE ALWAYS TRIGGER audit_no_truncate;

-- Invoker privileges: the runtime has INSERT, but no audit UPDATE/DELETE/TRUNCATE.
-- No user-controlled data, auth UUIDs or tokens are copied into lifecycle events.
CREATE FUNCTION game.audit_player_lifecycle() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO game."AuditEvent" ("eventType", "entityType", "entityId")
            VALUES ('player.created', 'player', NEW."id");
        RETURN NEW;
    END IF;
    INSERT INTO game."AuditEvent" ("eventType", "entityType", "entityId")
        VALUES ('player.deleted', 'player', OLD."id");
    RETURN OLD;
END;
$$;
REVOKE ALL ON FUNCTION game.audit_player_lifecycle() FROM PUBLIC;
CREATE TRIGGER player_lifecycle_audit AFTER INSERT OR DELETE ON game."Player"
    FOR EACH ROW EXECUTE FUNCTION game.audit_player_lifecycle();
COMMIT;
