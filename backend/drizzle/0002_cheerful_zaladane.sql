CREATE TABLE "refresh_tokens" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"user_id" bigint NOT NULL,
	"token" varchar(500) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"remember_me" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"revoked_at" timestamp with time zone,
	CONSTRAINT "refresh_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
ALTER TABLE "guest_tables" ALTER COLUMN "id" SET DATA TYPE bigserial;--> statement-breakpoint
ALTER TABLE "guest_tables" ALTER COLUMN "name" SET DATA TYPE varchar(100);--> statement-breakpoint
ALTER TABLE "guests" ALTER COLUMN "id" SET DATA TYPE bigserial;--> statement-breakpoint
ALTER TABLE "guests" ALTER COLUMN "wedding_id" SET DATA TYPE bigint;--> statement-breakpoint
ALTER TABLE "guests" ALTER COLUMN "firstname" SET DATA TYPE varchar(100);--> statement-breakpoint
ALTER TABLE "guests" ALTER COLUMN "lastname" SET DATA TYPE varchar(100);--> statement-breakpoint
ALTER TABLE "guests" ALTER COLUMN "link_id" SET DATA TYPE varchar(100);--> statement-breakpoint
ALTER TABLE "guests" ALTER COLUMN "status" SET DATA TYPE varchar(50);--> statement-breakpoint
ALTER TABLE "guests" ALTER COLUMN "status" SET DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE "guests" ALTER COLUMN "table_id" SET DATA TYPE bigint;--> statement-breakpoint
ALTER TABLE "invitations" ALTER COLUMN "id" SET DATA TYPE bigserial;--> statement-breakpoint
ALTER TABLE "invitations" ALTER COLUMN "wedding_id" SET DATA TYPE bigint;--> statement-breakpoint
ALTER TABLE "invitations" ALTER COLUMN "template_details" SET DATA TYPE jsonb;--> statement-breakpoint
ALTER TABLE "store_users" ALTER COLUMN "id" SET DATA TYPE bigserial;--> statement-breakpoint
ALTER TABLE "store_users" ALTER COLUMN "store_id" SET DATA TYPE bigint;--> statement-breakpoint
ALTER TABLE "store_users" ALTER COLUMN "user_id" SET DATA TYPE bigint;--> statement-breakpoint
ALTER TABLE "stores" ALTER COLUMN "id" SET DATA TYPE bigserial;--> statement-breakpoint
ALTER TABLE "stores" ALTER COLUMN "name" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "stores" ALTER COLUMN "email" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "stores" ALTER COLUMN "drive_details" SET DATA TYPE jsonb;--> statement-breakpoint
ALTER TABLE "stores" ALTER COLUMN "default_password" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "stores" ALTER COLUMN "date_started" SET DATA TYPE date;--> statement-breakpoint
ALTER TABLE "stores" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "stores" ALTER COLUMN "created_at" SET DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "id" SET DATA TYPE bigserial;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "firstname" SET DATA TYPE varchar(100);--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "middlename" SET DATA TYPE varchar(100);--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "lastname" SET DATA TYPE varchar(100);--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "extname" SET DATA TYPE varchar(20);--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "email" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "username" SET DATA TYPE varchar(100);--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "password" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "password" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "created_at" SET DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE "wedding_users" ALTER COLUMN "id" SET DATA TYPE bigserial;--> statement-breakpoint
ALTER TABLE "wedding_users" ALTER COLUMN "wedding_id" SET DATA TYPE bigint;--> statement-breakpoint
ALTER TABLE "wedding_users" ALTER COLUMN "user_id" SET DATA TYPE bigint;--> statement-breakpoint
ALTER TABLE "weddings" ALTER COLUMN "id" SET DATA TYPE bigserial;--> statement-breakpoint
ALTER TABLE "weddings" ALTER COLUMN "bride_firstname" SET DATA TYPE varchar(100);--> statement-breakpoint
ALTER TABLE "weddings" ALTER COLUMN "bride_lastname" SET DATA TYPE varchar(100);--> statement-breakpoint
ALTER TABLE "weddings" ALTER COLUMN "groom_firstname" SET DATA TYPE varchar(100);--> statement-breakpoint
ALTER TABLE "weddings" ALTER COLUMN "groom_lastname" SET DATA TYPE varchar(100);--> statement-breakpoint
ALTER TABLE "weddings" ALTER COLUMN "invitation_deadline" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "weddings" ALTER COLUMN "wedding_date" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "google_id" varchar(255);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "github_id" varchar(255);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "avatar_url" varchar(500);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "auth_provider" varchar(50) DEFAULT 'local' NOT NULL;--> statement-breakpoint
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_google_id_unique" UNIQUE("google_id");--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_github_id_unique" UNIQUE("github_id");