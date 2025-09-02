ALTER TABLE "analyses" ADD COLUMN "user_sequence_number" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "analyses" ADD COLUMN "original_image_url" text;--> statement-breakpoint
ALTER TABLE "analyses" ADD COLUMN "analysis_image_url" text;