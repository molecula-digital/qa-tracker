CREATE TYPE "public"."activity_action" AS ENUM('created', 'updated', 'deleted', 'checked', 'unchecked');--> statement-breakpoint
CREATE TYPE "public"."activity_entity" AS ENUM('section', 'item', 'note', 'tag');--> statement-breakpoint
CREATE TABLE "activity" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"actor_id" text NOT NULL,
	"actor_name" text NOT NULL,
	"action" "activity_action" NOT NULL,
	"entity" "activity_entity" NOT NULL,
	"entity_id" text NOT NULL,
	"description" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_link" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"title" text NOT NULL,
	"url" text NOT NULL,
	"icon" text DEFAULT 'link',
	"order" integer DEFAULT 0 NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "activity" ADD CONSTRAINT "activity_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_link" ADD CONSTRAINT "project_link_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;