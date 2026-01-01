CREATE TABLE "categories" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" varchar NOT NULL,
	"name" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "suppliers" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" varchar NOT NULL,
	"name" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "incoming_records" ADD COLUMN "division_id" varchar;--> statement-breakpoint
ALTER TABLE "incoming_records" ADD COLUMN "category_id" varchar;--> statement-breakpoint
ALTER TABLE "incoming_records" ADD COLUMN "supplier_id" varchar;--> statement-breakpoint
ALTER TABLE "inventory_items" ADD COLUMN "division_id" varchar;--> statement-breakpoint
ALTER TABLE "inventory_items" ADD COLUMN "category_id" varchar;--> statement-breakpoint
ALTER TABLE "material_usage_records" ADD COLUMN "team_id" varchar;--> statement-breakpoint
ALTER TABLE "material_usage_records" ADD COLUMN "division_id" varchar;--> statement-breakpoint
ALTER TABLE "material_usage_records" ADD COLUMN "category_id" varchar;--> statement-breakpoint
ALTER TABLE "outgoing_records" ADD COLUMN "team_id" varchar;--> statement-breakpoint
ALTER TABLE "outgoing_records" ADD COLUMN "division_id" varchar;--> statement-breakpoint
ALTER TABLE "outgoing_records" ADD COLUMN "category_id" varchar;--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incoming_records" ADD CONSTRAINT "incoming_records_division_id_divisions_id_fk" FOREIGN KEY ("division_id") REFERENCES "public"."divisions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incoming_records" ADD CONSTRAINT "incoming_records_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incoming_records" ADD CONSTRAINT "incoming_records_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_division_id_divisions_id_fk" FOREIGN KEY ("division_id") REFERENCES "public"."divisions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "material_usage_records" ADD CONSTRAINT "material_usage_records_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "material_usage_records" ADD CONSTRAINT "material_usage_records_division_id_divisions_id_fk" FOREIGN KEY ("division_id") REFERENCES "public"."divisions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "material_usage_records" ADD CONSTRAINT "material_usage_records_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outgoing_records" ADD CONSTRAINT "outgoing_records_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outgoing_records" ADD CONSTRAINT "outgoing_records_division_id_divisions_id_fk" FOREIGN KEY ("division_id") REFERENCES "public"."divisions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outgoing_records" ADD CONSTRAINT "outgoing_records_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;