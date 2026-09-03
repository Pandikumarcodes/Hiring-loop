-- Add the approved organization onboarding fields without changing existing tenant/auth data.
ALTER TABLE "Organization" ADD COLUMN "website" TEXT;
ALTER TABLE "Organization" ADD COLUMN "description" TEXT;
