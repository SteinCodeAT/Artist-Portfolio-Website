CREATE TABLE `activity_log` (
	`id` text PRIMARY KEY NOT NULL,
	`at` text,
	`username` text,
	`display_name` text,
	`kind` text,
	`action` text,
	`title` text,
	`href` text
);
--> statement-breakpoint
CREATE INDEX `activity_log_at_idx` ON `activity_log` (`at`);--> statement-breakpoint
CREATE TABLE `posts` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text,
	`title` text,
	`description` text,
	`main_image` text,
	`blocks` text,
	`status` text,
	`published_at` text,
	`created_at` text,
	`updated_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `posts_slug_unique` ON `posts` (`slug`);--> statement-breakpoint
CREATE INDEX `posts_status_idx` ON `posts` (`status`);--> statement-breakpoint
CREATE INDEX `posts_published_at_idx` ON `posts` (`published_at`);--> statement-breakpoint
CREATE TABLE `singletons` (
	`key` text PRIMARY KEY NOT NULL,
	`schema_version` integer,
	`data` text
);
