CREATE TABLE "deal_notes" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "deal_id" UUID NOT NULL,
  "department" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "author" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "deal_notes_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "deal_notes_deal_id_fkey" FOREIGN KEY ("deal_id") REFERENCES "deals"("id") ON DELETE CASCADE
);
