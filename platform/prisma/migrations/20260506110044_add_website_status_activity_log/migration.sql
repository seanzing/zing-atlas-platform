-- AlterTable
ALTER TABLE "onboarding" ADD COLUMN IF NOT EXISTS "website_status" TEXT DEFAULT 'not_started';

-- CreateTable
CREATE TABLE IF NOT EXISTS "activity_log" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "onboarding_id" UUID,
    "contact_id" UUID,
    "team_member_id" UUID,
    "type" TEXT NOT NULL,
    "subject" TEXT,
    "body" TEXT,
    "to_email" TEXT,
    "from_email" TEXT,
    "preview_url" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_log_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "activity_log" ADD CONSTRAINT "activity_log_onboarding_id_fkey" FOREIGN KEY ("onboarding_id") REFERENCES "onboarding"("id") ON DELETE SET NULL ON UPDATE CASCADE;
