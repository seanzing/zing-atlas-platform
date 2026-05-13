-- Make contactId optional on form_submissions to support public unauthenticated form submissions
ALTER TABLE "form_submissions" ALTER COLUMN "contact_id" DROP NOT NULL;
