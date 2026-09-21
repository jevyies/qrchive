CREATE TABLE "guest_tables" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text
);
--> statement-breakpoint
CREATE TABLE "guests" (
	"id" serial PRIMARY KEY NOT NULL,
	"wedding_id" integer NOT NULL,
	"firstname" text NOT NULL,
	"lastname" text NOT NULL,
	"link_id" text,
	"status" text,
	"table_id" integer
);
--> statement-breakpoint
CREATE TABLE "invitations" (
	"id" serial PRIMARY KEY NOT NULL,
	"wedding_id" integer NOT NULL,
	"template_details" text
);
--> statement-breakpoint
CREATE TABLE "store_users" (
	"id" serial PRIMARY KEY NOT NULL,
	"store_id" integer NOT NULL,
	"user_id" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stores" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"email" text NOT NULL,
	"drive_details" text,
	"default_password" text,
	"date_started" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"firstname" text NOT NULL,
	"middlename" text,
	"lastname" text NOT NULL,
	"extname" text,
	"username" text NOT NULL,
	"password" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "wedding_users" (
	"id" serial PRIMARY KEY NOT NULL,
	"wedding_id" integer NOT NULL,
	"user_id" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "weddings" (
	"id" serial PRIMARY KEY NOT NULL,
	"bride_firstname" text NOT NULL,
	"bride_lastname" text NOT NULL,
	"groom_firstname" text NOT NULL,
	"groom_lastname" text NOT NULL,
	"invitation_deadline" timestamp,
	"wedding_date" timestamp
);
--> statement-breakpoint
ALTER TABLE "guests" ADD CONSTRAINT "guests_wedding_id_weddings_id_fk" FOREIGN KEY ("wedding_id") REFERENCES "public"."weddings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guests" ADD CONSTRAINT "guests_table_id_guest_tables_id_fk" FOREIGN KEY ("table_id") REFERENCES "public"."guest_tables"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_wedding_id_weddings_id_fk" FOREIGN KEY ("wedding_id") REFERENCES "public"."weddings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "store_users" ADD CONSTRAINT "store_users_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "store_users" ADD CONSTRAINT "store_users_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wedding_users" ADD CONSTRAINT "wedding_users_wedding_id_weddings_id_fk" FOREIGN KEY ("wedding_id") REFERENCES "public"."weddings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wedding_users" ADD CONSTRAINT "wedding_users_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;