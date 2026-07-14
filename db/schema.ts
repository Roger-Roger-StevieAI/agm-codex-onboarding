import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const members = sqliteTable("hub_members", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  email: text("email").notNull(),
  roleKey: text("role_key").notNull(),
  status: text("status").notNull().default("Active"),
  isAdmin: integer("is_admin", { mode: "boolean" }).notNull().default(false),
  initials: text("initials").notNull(),
}, (table) => [uniqueIndex("hub_members_email_unique").on(table.email)]);

export const roleTemplates = sqliteTable("hub_role_templates", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  key: text("key").notNull(),
  name: text("name").notNull(),
  description: text("description").notNull(),
}, (table) => [uniqueIndex("hub_role_templates_key_unique").on(table.key)]);

export const connections = sqliteTable("hub_connections", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  key: text("key").notNull(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  authModel: text("auth_model").notNull(),
  delivery: text("delivery").notNull(),
  status: text("status").notNull(),
  statusDetail: text("status_detail").notNull(),
  color: text("color").notNull(),
  initials: text("initials").notNull(),
}, (table) => [uniqueIndex("hub_connections_key_unique").on(table.key)]);

export const roleConnections = sqliteTable("hub_role_connections", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  roleKey: text("role_key").notNull(),
  connectionKey: text("connection_key").notNull(),
  accountScope: text("account_scope").notNull(),
}, (table) => [uniqueIndex("hub_role_connections_role_connection_unique").on(table.roleKey, table.connectionKey)]);

export const connectionRequests = sqliteTable("hub_connection_requests", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  memberId: integer("member_id").notNull(),
  connectionKey: text("connection_key").notNull(),
  reason: text("reason").notNull(),
  status: text("status").notNull().default("Pending"),
  createdAt: text("created_at").notNull(),
  decidedBy: text("decided_by"),
});

export const connectionConfigs = sqliteTable("hub_connection_configs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  connectionKey: text("connection_key").notNull(),
  provider: text("provider").notNull().default("manual"),
  toolkitSlug: text("toolkit_slug"),
  authConfigId: text("auth_config_id"),
  connectedAccountId: text("connected_account_id"),
  ownerUserId: text("owner_user_id"),
  testToolSlug: text("test_tool_slug"),
  testToolVersion: text("test_tool_version"),
  setupNotes: text("setup_notes").notNull().default(""),
  setupStatus: text("setup_status").notNull().default("Not configured"),
  lastSyncedAt: text("last_synced_at"),
  lastError: text("last_error"),
}, (table) => [uniqueIndex("hub_connection_configs_connection_unique").on(table.connectionKey)]);

export const memberConnections = sqliteTable("hub_member_connections", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  memberId: integer("member_id").notNull(),
  connectionKey: text("connection_key").notNull(),
  directAssignment: integer("direct_assignment", { mode: "boolean" }).notNull().default(false),
  accountScope: text("account_scope").notNull().default("Individual assignment"),
  deliveryStatus: text("delivery_status").notNull().default("Assigned"),
  authConfigId: text("auth_config_id"),
  providerAccountId: text("provider_account_id"),
  providerStatus: text("provider_status"),
  assignedBy: text("assigned_by").notNull(),
  assignedAt: text("assigned_at").notNull(),
  lastSyncedAt: text("last_synced_at"),
}, (table) => [uniqueIndex("hub_member_connections_member_connection_unique").on(table.memberId, table.connectionKey)]);

export const connectionDiagnostics = sqliteTable("hub_connection_diagnostics", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  connectionKey: text("connection_key").notNull(),
  memberId: integer("member_id"),
  actor: text("actor").notNull(),
  status: text("status").notNull(),
  stage: text("stage").notNull(),
  summary: text("summary").notNull(),
  detail: text("detail").notNull(),
  providerLogId: text("provider_log_id"),
  durationMs: integer("duration_ms").notNull().default(0),
  createdAt: text("created_at").notNull(),
});

export const installationReports = sqliteTable("hub_installation_reports", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  memberId: integer("member_id").notNull(),
  connectionKey: text("connection_key").notNull(),
  operatingSystem: text("operating_system").notNull(),
  status: text("status").notNull(),
  detail: text("detail").notNull(),
  createdAt: text("created_at").notNull(),
});

export const auditEvents = sqliteTable("hub_audit_events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  actor: text("actor").notNull(),
  event: text("event").notNull(),
  target: text("target").notNull(),
  result: text("result").notNull(),
  createdAt: text("created_at").notNull(),
});
