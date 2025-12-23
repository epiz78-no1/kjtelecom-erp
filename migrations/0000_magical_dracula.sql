CREATE TABLE "divisions" (
	"id" varchar PRIMARY KEY NOT NULL,
	"name" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "incoming_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"date" text NOT NULL,
	"division" text NOT NULL,
	"supplier" text NOT NULL,
	"project_name" text NOT NULL,
	"product_name" text NOT NULL,
	"specification" text DEFAULT '' NOT NULL,
	"quantity" integer DEFAULT 0 NOT NULL,
	"unit_price" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inventory_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"division" text DEFAULT 'SKT' NOT NULL,
	"category" text NOT NULL,
	"product_name" text NOT NULL,
	"specification" text NOT NULL,
	"carried_over" integer DEFAULT 0 NOT NULL,
	"incoming" integer DEFAULT 0 NOT NULL,
	"outgoing" integer DEFAULT 0 NOT NULL,
	"remaining" integer DEFAULT 0 NOT NULL,
	"unit_price" integer DEFAULT 0 NOT NULL,
	"total_amount" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "material_usage_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"date" text NOT NULL,
	"division" text NOT NULL,
	"team_category" text NOT NULL,
	"project_name" text NOT NULL,
	"product_name" text NOT NULL,
	"specification" text NOT NULL,
	"quantity" integer DEFAULT 0 NOT NULL,
	"recipient" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "outgoing_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"date" text NOT NULL,
	"division" text NOT NULL,
	"team_category" text NOT NULL,
	"project_name" text NOT NULL,
	"product_name" text NOT NULL,
	"specification" text NOT NULL,
	"quantity" integer DEFAULT 0 NOT NULL,
	"recipient" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "teams" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"division_id" varchar NOT NULL,
	"team_category" text DEFAULT '외선팀' NOT NULL,
	"member_count" integer DEFAULT 0 NOT NULL,
	"material_count" integer DEFAULT 0 NOT NULL,
	"last_activity" text,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" text NOT NULL,
	"password" text NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
