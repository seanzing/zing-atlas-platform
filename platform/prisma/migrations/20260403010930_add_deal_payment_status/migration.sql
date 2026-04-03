-- AlterTable
ALTER TABLE "deals" ADD COLUMN     "payment_status" TEXT DEFAULT 'pending',
ADD COLUMN     "stripe_customer_id" TEXT,
ADD COLUMN     "stripe_subscription_id" TEXT;
