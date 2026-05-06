-- AlterTable
ALTER TABLE "team_members" ADD COLUMN "position" TEXT;
ALTER TABLE "team_members" ADD COLUMN "supabase_user_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "team_members_supabase_user_id_key" ON "team_members"("supabase_user_id");
