-- AlterTable
ALTER TABLE "onboarding_items" ADD COLUMN     "completed_at" TIMESTAMP(3),
ADD COLUMN     "current_status" TEXT,
ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "is_conditional" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "owner_role" TEXT,
ADD COLUMN     "status_options" JSONB,
ADD COLUMN     "task_type" TEXT;

-- CreateTable
CREATE TABLE "onboarding_notifications" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "onboarding_item_id" UUID NOT NULL,
    "recipient_name" TEXT,
    "recipient_role" TEXT,
    "message" TEXT,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "type" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "onboarding_notifications_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "onboarding_notifications" ADD CONSTRAINT "onboarding_notifications_onboarding_item_id_fkey" FOREIGN KEY ("onboarding_item_id") REFERENCES "onboarding_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
