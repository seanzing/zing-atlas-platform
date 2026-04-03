-- CreateTable
CREATE TABLE "product_task_templates" (
    "id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "task_type" TEXT NOT NULL,
    "task_name" TEXT NOT NULL,
    "task_order" INTEGER NOT NULL,
    "owner_role" TEXT,
    "days_offset" INTEGER NOT NULL DEFAULT 14,
    "is_conditional" BOOLEAN NOT NULL DEFAULT false,
    "status_options" JSONB,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_task_templates_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "product_task_templates" ADD CONSTRAINT "product_task_templates_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
