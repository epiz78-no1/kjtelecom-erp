ALTER TABLE "inventory_items" ADD COLUMN "type" text DEFAULT 'general' NOT NULL;
ALTER TABLE "inventory_items" ADD COLUMN "attributes" text;
--> statement-breakpoint
ALTER TABLE "incoming_records" ADD COLUMN "type" text DEFAULT 'general' NOT NULL;
ALTER TABLE "incoming_records" ADD COLUMN "attributes" text;
--> statement-breakpoint
ALTER TABLE "outgoing_records" ADD COLUMN "type" text DEFAULT 'general' NOT NULL;
ALTER TABLE "outgoing_records" ADD COLUMN "attributes" text;
--> statement-breakpoint
ALTER TABLE "material_usage_records" ADD COLUMN "type" text DEFAULT 'general' NOT NULL;
ALTER TABLE "material_usage_records" ADD COLUMN "attributes" text;
