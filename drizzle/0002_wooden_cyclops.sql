CREATE TABLE `hub_connection_configs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`connection_key` text NOT NULL,
	`provider` text DEFAULT 'manual' NOT NULL,
	`toolkit_slug` text,
	`auth_config_id` text,
	`connected_account_id` text,
	`owner_user_id` text,
	`test_tool_slug` text,
	`test_tool_version` text,
	`setup_notes` text DEFAULT '' NOT NULL,
	`setup_status` text DEFAULT 'Not configured' NOT NULL,
	`last_synced_at` text,
	`last_error` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `hub_connection_configs_connection_unique` ON `hub_connection_configs` (`connection_key`);--> statement-breakpoint
CREATE TABLE `hub_connection_diagnostics` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`connection_key` text NOT NULL,
	`member_id` integer,
	`actor` text NOT NULL,
	`status` text NOT NULL,
	`stage` text NOT NULL,
	`summary` text NOT NULL,
	`detail` text NOT NULL,
	`provider_log_id` text,
	`duration_ms` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `hub_member_connections` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`member_id` integer NOT NULL,
	`connection_key` text NOT NULL,
	`direct_assignment` integer DEFAULT false NOT NULL,
	`account_scope` text DEFAULT 'Individual assignment' NOT NULL,
	`delivery_status` text DEFAULT 'Assigned' NOT NULL,
	`auth_config_id` text,
	`provider_account_id` text,
	`provider_status` text,
	`assigned_by` text NOT NULL,
	`assigned_at` text NOT NULL,
	`last_synced_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `hub_member_connections_member_connection_unique` ON `hub_member_connections` (`member_id`,`connection_key`);