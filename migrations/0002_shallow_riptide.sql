CREATE TABLE "demolition_material_logs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" varchar NOT NULL,
	"material_id" varchar NOT NULL,
	"team_id" varchar,
	"log_type" text NOT NULL,
	"project_code" text,
	"project_name" text,
	"used_quantity" integer DEFAULT 0 NOT NULL,
	"dispose_reason" text,
	"dispose_method" text,
	"review_decision" text,
	"review_note" text,
	"before_quantity" integer,
	"after_quantity" integer,
	"log_date" text NOT NULL,
	"worker_name" text,
	"attributes" text,
	"created_by" varchar,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "demolition_materials" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" varchar NOT NULL,
	"division" text DEFAULT 'SKT' NOT NULL,
	"category" text DEFAULT '' NOT NULL,
	"management_no" text NOT NULL,
	"project_code" text NOT NULL,
	"project_name" text NOT NULL,
	"demolition_date" text NOT NULL,
	"worker_name" text,
	"product_name" text NOT NULL,
	"specification" text NOT NULL,
	"original_quantity" integer NOT NULL,
	"used_quantity" integer DEFAULT 0 NOT NULL,
	"remaining_quantity" integer NOT NULL,
	"waste_quantity" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'pending_review' NOT NULL,
	"reusable" boolean DEFAULT false NOT NULL,
	"condition" text,
	"estimated_value" integer DEFAULT 0 NOT NULL,
	"current_team_id" varchar,
	"reviewed_by" varchar,
	"reviewed_at" timestamp,
	"review_note" text,
	"remark" text,
	"attributes" text,
	"created_by" varchar,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "optical_cable_logs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" varchar NOT NULL,
	"cable_id" varchar NOT NULL,
	"team_id" varchar,
	"log_type" text NOT NULL,
	"project_code" text,
	"section_name" text,
	"project_name_usage" text,
	"used_length" integer DEFAULT 0 NOT NULL,
	"install_length" integer DEFAULT 0,
	"waste_length" integer DEFAULT 0,
	"usage_date" text NOT NULL,
	"worker_name" text,
	"before_remaining" integer,
	"after_remaining" integer,
	"attributes" text,
	"created_by" varchar,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "optical_cables" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" varchar NOT NULL,
	"division" text DEFAULT 'SKT' NOT NULL,
	"category" text DEFAULT '' NOT NULL,
	"management_no" text NOT NULL,
	"project_code" text,
	"project_name" text,
	"received_date" text,
	"manufacturer" text,
	"manufacture_year" text,
	"spec" text NOT NULL,
	"core_count" integer NOT NULL,
	"drum_no" text NOT NULL,
	"total_length" text NOT NULL,
	"original_length" integer,
	"used_length" integer DEFAULT 0 NOT NULL,
	"remaining_length" integer NOT NULL,
	"waste_length" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'in_stock' NOT NULL,
	"location" text,
	"remark" text,
	"unit_price" integer DEFAULT 0 NOT NULL,
	"total_amount" integer DEFAULT 0 NOT NULL,
	"current_team_id" varchar,
	"attributes" text,
	"reservation_status" text DEFAULT 'none' NOT NULL,
	"reserved_for_project" text,
	"reserved_by" varchar,
	"reserved_at" timestamp,
	"return_request_status" text DEFAULT 'none' NOT NULL,
	"return_requested_by" varchar,
	"return_requested_at" timestamp,
	"return_approved_by" varchar,
	"return_approved_at" timestamp,
	"tango_registered" boolean DEFAULT true NOT NULL,
	"created_by" varchar,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "incoming_records" ADD COLUMN "created_by" varchar;--> statement-breakpoint
ALTER TABLE "incoming_records" ADD COLUMN "created_at" timestamp DEFAULT now();--> statement-breakpoint
ALTER TABLE "inventory_items" ADD COLUMN "created_by" varchar;--> statement-breakpoint
ALTER TABLE "material_usage_records" ADD COLUMN "created_by" varchar;--> statement-breakpoint
ALTER TABLE "material_usage_records" ADD COLUMN "created_at" timestamp DEFAULT now();--> statement-breakpoint
ALTER TABLE "outgoing_records" ADD COLUMN "created_by" varchar;--> statement-breakpoint
ALTER TABLE "outgoing_records" ADD COLUMN "created_at" timestamp DEFAULT now();--> statement-breakpoint
ALTER TABLE "demolition_material_logs" ADD CONSTRAINT "demolition_material_logs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "demolition_material_logs" ADD CONSTRAINT "demolition_material_logs_material_id_demolition_materials_id_fk" FOREIGN KEY ("material_id") REFERENCES "public"."demolition_materials"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "demolition_material_logs" ADD CONSTRAINT "demolition_material_logs_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "demolition_material_logs" ADD CONSTRAINT "demolition_material_logs_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "demolition_materials" ADD CONSTRAINT "demolition_materials_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "demolition_materials" ADD CONSTRAINT "demolition_materials_current_team_id_teams_id_fk" FOREIGN KEY ("current_team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "demolition_materials" ADD CONSTRAINT "demolition_materials_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "demolition_materials" ADD CONSTRAINT "demolition_materials_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "optical_cable_logs" ADD CONSTRAINT "optical_cable_logs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "optical_cable_logs" ADD CONSTRAINT "optical_cable_logs_cable_id_optical_cables_id_fk" FOREIGN KEY ("cable_id") REFERENCES "public"."optical_cables"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "optical_cable_logs" ADD CONSTRAINT "optical_cable_logs_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "optical_cable_logs" ADD CONSTRAINT "optical_cable_logs_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "optical_cables" ADD CONSTRAINT "optical_cables_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "optical_cables" ADD CONSTRAINT "optical_cables_current_team_id_teams_id_fk" FOREIGN KEY ("current_team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "optical_cables" ADD CONSTRAINT "optical_cables_reserved_by_users_id_fk" FOREIGN KEY ("reserved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "optical_cables" ADD CONSTRAINT "optical_cables_return_requested_by_users_id_fk" FOREIGN KEY ("return_requested_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "optical_cables" ADD CONSTRAINT "optical_cables_return_approved_by_users_id_fk" FOREIGN KEY ("return_approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "optical_cables" ADD CONSTRAINT "optical_cables_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "optical_cable_logs_cable_id_idx" ON "optical_cable_logs" USING btree ("cable_id");--> statement-breakpoint
ALTER TABLE "incoming_records" ADD CONSTRAINT "incoming_records_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "material_usage_records" ADD CONSTRAINT "material_usage_records_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outgoing_records" ADD CONSTRAINT "outgoing_records_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;