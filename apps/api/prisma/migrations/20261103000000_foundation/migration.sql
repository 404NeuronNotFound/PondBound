BEGIN;
-- The bootstrap owns schema creation; this role can create objects only inside game.

CREATE TABLE "game"."Player" (
    "id" UUID NOT NULL,
    "authId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Player_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Player_authId_key" ON "game"."Player"("authId");

REVOKE ALL ON SCHEMA "game" FROM PUBLIC;
REVOKE ALL ON "game"."Player" FROM PUBLIC;
ALTER TABLE "game"."Player" ENABLE ROW LEVEL SECURITY;
GRANT USAGE ON SCHEMA "game" TO "pondbound_api";
GRANT SELECT, INSERT, UPDATE, DELETE ON "game"."Player" TO "pondbound_api";
CREATE POLICY "backend_player_access" ON "game"."Player"
    TO "pondbound_api" USING (true) WITH CHECK (true);
COMMIT;
