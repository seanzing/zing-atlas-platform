ALTER TABLE "contacts" ADD COLUMN "industry" TEXT;
ALTER TABLE "contacts" ADD COLUMN "website_url" TEXT;
ALTER TABLE "contacts" ADD COLUMN "marketing_comments" TEXT;
ALTER TABLE "contacts" ADD COLUMN "assigned_rep" TEXT;

CREATE TABLE "round_robin_state" (
  "id" INTEGER NOT NULL DEFAULT 1,
  "last_rep_index" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "round_robin_state_pkey" PRIMARY KEY ("id")
);

INSERT INTO "round_robin_state" ("id", "last_rep_index") VALUES (1, 0) ON CONFLICT DO NOTHING;
