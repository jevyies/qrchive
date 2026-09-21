ALTER TABLE "users" ADD COLUMN "status" varchar(50) DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "auth_position" varchar(50) DEFAULT 'ordinary' NOT NULL;