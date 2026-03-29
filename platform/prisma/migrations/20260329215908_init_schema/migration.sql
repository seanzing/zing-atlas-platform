-- CreateTable
CREATE TABLE "contacts" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "secondary_email" TEXT,
    "company" TEXT,
    "phone" TEXT,
    "status" TEXT,
    "last_contact" DATE,
    "value" DECIMAL(12,2),
    "notes" TEXT,
    "lead_source" TEXT,
    "campaign_id" UUID,
    "avatar" TEXT,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deals" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "contact_id" UUID,
    "contact_name" TEXT,
    "rep" TEXT,
    "stage" TEXT,
    "probability" INTEGER,
    "priority" TEXT,
    "due_date" DATE,
    "product_id" UUID,
    "value" DECIMAL(12,2),
    "won_date" DATE,
    "delivery_date" DATE,
    "assigned_designer" TEXT,
    "deal_type" TEXT DEFAULT 'new',
    "launch_fee_amount" DECIMAL(12,2),
    "all_notes" JSONB,
    "sms_trail" JSONB,
    "email_trail" JSONB,
    "calendar_history" JSONB,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "deals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "launch_fee_payments" (
    "id" UUID NOT NULL,
    "deal_id" UUID NOT NULL,
    "amount" DECIMAL(12,2),
    "due_date" DATE,

    CONSTRAINT "launch_fee_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "description" TEXT NOT NULL,
    "price" DECIMAL(12,2) NOT NULL,
    "category" TEXT,
    "commission_type" TEXT,
    "commission_value" DECIMAL(12,2),
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaigns" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT,
    "status" TEXT,
    "contact_count" INTEGER,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_members" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "first_name" TEXT,
    "last_name" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "monthly_target" DECIMAL(12,2),
    "role" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "team_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "designers" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "team" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "designers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "onboarding" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "deal_id" UUID,
    "customer_name" TEXT,
    "business_name" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "existing_url" TEXT,
    "new_url" TEXT,
    "offshore_designer" TEXT,
    "us_designer" TEXT,
    "rep" TEXT,
    "product_id" UUID,
    "value" DECIMAL(12,2),
    "won_date" DATE,
    "status" TEXT,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "onboarding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "onboarding_items" (
    "id" UUID NOT NULL,
    "onboarding_id" UUID NOT NULL,
    "item_name" TEXT,
    "stage" TEXT,
    "owner" TEXT,
    "due_date" DATE,

    CONSTRAINT "onboarding_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "onboarding_web_owners" (
    "id" UUID NOT NULL,
    "onboarding_id" UUID NOT NULL,
    "stage_key" TEXT,
    "owner" TEXT,

    CONSTRAINT "onboarding_web_owners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tickets" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "subject" TEXT,
    "contact_id" UUID,
    "contact_name" TEXT,
    "priority" TEXT,
    "status" TEXT,
    "category" TEXT,
    "description" TEXT,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ar_accounts" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "business_name" TEXT,
    "customer_name" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "product" TEXT,
    "mrr" DECIMAL(12,2),
    "status" TEXT,
    "stripe_status" TEXT,
    "days_past_due" INTEGER,
    "amount_due" DECIMAL(12,2),
    "amount_paid" DECIMAL(12,2),
    "paid_date" DATE,
    "last_payment_date" DATE,
    "failed_date" DATE,
    "subscription_created" DATE,
    "reactivated" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ar_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ar_timeline" (
    "id" UUID NOT NULL,
    "ar_id" UUID NOT NULL,
    "date" DATE,
    "type" TEXT,
    "note" TEXT,

    CONSTRAINT "ar_timeline_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deals" ADD CONSTRAINT "deals_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deals" ADD CONSTRAINT "deals_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "launch_fee_payments" ADD CONSTRAINT "launch_fee_payments_deal_id_fkey" FOREIGN KEY ("deal_id") REFERENCES "deals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "onboarding" ADD CONSTRAINT "onboarding_deal_id_fkey" FOREIGN KEY ("deal_id") REFERENCES "deals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "onboarding" ADD CONSTRAINT "onboarding_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "onboarding_items" ADD CONSTRAINT "onboarding_items_onboarding_id_fkey" FOREIGN KEY ("onboarding_id") REFERENCES "onboarding"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "onboarding_web_owners" ADD CONSTRAINT "onboarding_web_owners_onboarding_id_fkey" FOREIGN KEY ("onboarding_id") REFERENCES "onboarding"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ar_timeline" ADD CONSTRAINT "ar_timeline_ar_id_fkey" FOREIGN KEY ("ar_id") REFERENCES "ar_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
