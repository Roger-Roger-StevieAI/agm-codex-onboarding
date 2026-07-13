CREATE TABLE `hub_audit_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`actor` text NOT NULL,
	`event` text NOT NULL,
	`target` text NOT NULL,
	`result` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `hub_connection_requests` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`member_id` integer NOT NULL,
	`connection_key` text NOT NULL,
	`reason` text NOT NULL,
	`status` text DEFAULT 'Pending' NOT NULL,
	`created_at` text NOT NULL,
	`decided_by` text
);
--> statement-breakpoint
CREATE TABLE `hub_connections` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`key` text NOT NULL,
	`name` text NOT NULL,
	`description` text NOT NULL,
	`auth_model` text NOT NULL,
	`delivery` text NOT NULL,
	`status` text NOT NULL,
	`status_detail` text NOT NULL,
	`color` text NOT NULL,
	`initials` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `hub_connections_key_unique` ON `hub_connections` (`key`);--> statement-breakpoint
CREATE TABLE `hub_installation_reports` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`member_id` integer NOT NULL,
	`connection_key` text NOT NULL,
	`operating_system` text NOT NULL,
	`status` text NOT NULL,
	`detail` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `hub_members` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`role_key` text NOT NULL,
	`status` text DEFAULT 'Active' NOT NULL,
	`is_admin` integer DEFAULT false NOT NULL,
	`initials` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `hub_members_email_unique` ON `hub_members` (`email`);--> statement-breakpoint
CREATE TABLE `hub_role_connections` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`role_key` text NOT NULL,
	`connection_key` text NOT NULL,
	`account_scope` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `hub_role_connections_role_connection_unique` ON `hub_role_connections` (`role_key`,`connection_key`);--> statement-breakpoint
CREATE TABLE `hub_role_templates` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`key` text NOT NULL,
	`name` text NOT NULL,
	`description` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `hub_role_templates_key_unique` ON `hub_role_templates` (`key`);--> statement-breakpoint
DROP TABLE `approvals`;--> statement-breakpoint
DROP TABLE `audit_events`;--> statement-breakpoint
DROP TABLE `connections`;--> statement-breakpoint
DROP TABLE `roles`;--> statement-breakpoint
DROP TABLE `staff`;