import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const staff = sqliteTable("staff", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  role: text("role").notNull(),
  status: text("status").notNull().default("Active"),
  initials: text("initials").notNull(),
});

export const roles = sqliteTable("roles", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
  description: text("description").notNull(),
  members: integer("members").notNull().default(0),
  providers: text("providers").notNull(),
  accessLevel: text("access_level").notNull(),
});

export const connections = sqliteTable("connections", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  provider: text("provider").notNull(),
  scope: text("scope").notNull(),
  ownerType: text("owner_type").notNull(),
  status: text("status").notNull(),
  coverage: text("coverage").notNull(),
  lastChecked: text("last_checked").notNull(),
  color: text("color").notNull(),
  initials: text("initials").notNull(),
});

export const approvals = sqliteTable("approvals", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  requester: text("requester").notNull(),
  action: text("action").notNull(),
  provider: text("provider").notNull(),
  resource: text("resource").notNull(),
  risk: text("risk").notNull(),
  status: text("status").notNull().default("Pending"),
  createdAt: text("created_at").notNull(),
});

export const auditEvents = sqliteTable("audit_events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  actor: text("actor").notNull(),
  event: text("event").notNull(),
  target: text("target").notNull(),
  result: text("result").notNull(),
  createdAt: text("created_at").notNull(),
});
