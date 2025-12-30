-- Add permissions column to user_tenants table
ALTER TABLE "user_tenants" ADD COLUMN "permissions" jsonb DEFAULT '{"incoming":"read","outgoing":"own_only","usage":"own_only","inventory":"read"}'::jsonb;
