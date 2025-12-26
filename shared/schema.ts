import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, serial, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Tenants table - represents organizations/companies
export const tenants = pgTable("tenants", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  isActive: boolean("is_active").notNull().default(true),
  settings: text("settings"), // JSON string for tenant-specific settings
});

export const insertTenantSchema = createInsertSchema(tenants).omit({ id: true, createdAt: true, updatedAt: true });
export const apiInsertTenantSchema = insertTenantSchema.omit({}); // Already handled by insertTenantSchema omit, but for consistency
export type InsertTenant = z.infer<typeof insertTenantSchema>;
export type Tenant = typeof tenants.$inferSelect;

// Users table - updated for multi-tenancy
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  lastLoginAt: timestamp("last_login_at"),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  name: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// User-Tenant relationship table
export const userTenants = pgTable("user_tenants", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  role: text("role").notNull().default("member"), // owner, admin, member, viewer
  positionId: varchar("position_id"), // link to positions table
  divisionId: varchar("division_id"), // link to divisions table
  teamId: varchar("team_id"), // link to teams table
  status: text("status").notNull().default("active"), // active, inactive, pending
  joinDate: timestamp("join_date").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertUserTenantSchema = createInsertSchema(userTenants).omit({ id: true, createdAt: true });
export type InsertUserTenant = z.infer<typeof insertUserTenantSchema>;
export type UserTenant = typeof userTenants.$inferSelect;

// Positions (Ranks/Titles) table
export const positions = pgTable("positions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  rankOrder: integer("rank_order").notNull().default(0),
});

export const insertPositionSchema = createInsertSchema(positions).omit({ id: true });
export const apiInsertPositionSchema = z.object({
  name: z.string(),
  rankOrder: z.number().optional(),
});
export type InsertPosition = z.infer<typeof insertPositionSchema>;
export type Position = typeof positions.$inferSelect;

// Invitations table
export const invitations = pgTable("invitations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  role: text("role").notNull().default("member"),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  status: text("status").notNull().default("pending"), // pending, accepted, expired
  invitedBy: varchar("invited_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertInvitationSchema = createInsertSchema(invitations).omit({ id: true, createdAt: true });
export const apiInsertInvitationSchema = z.object({
  email: z.string().email(),
  role: z.string().optional(),
});
export type InsertInvitation = z.infer<typeof insertInvitationSchema>;
export type Invitation = typeof invitations.$inferSelect;

export const divisions = pgTable("divisions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
});

export const insertDivisionSchema = createInsertSchema(divisions).omit({ id: true });
export const apiInsertDivisionSchema = z.object({
  name: z.string(),
});
export type InsertDivision = z.infer<typeof insertDivisionSchema>;
export type Division = typeof divisions.$inferSelect;

export const teams = pgTable("teams", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  divisionId: varchar("division_id").notNull().references(() => divisions.id, { onDelete: "cascade" }),
  teamCategory: text("team_category").notNull().default("외선팀"),
  memberCount: integer("member_count").notNull().default(0),
  materialCount: integer("material_count").notNull().default(0),
  lastActivity: text("last_activity"),
  isActive: boolean("is_active").notNull().default(true),
});

export const insertTeamSchema = createInsertSchema(teams).omit({ id: true });
export const apiInsertTeamSchema = z.object({
  name: z.string(),
  divisionId: z.string(),
  teamCategory: z.string().optional(),
  isActive: z.boolean().optional(),
});
export type InsertTeam = z.infer<typeof insertTeamSchema>;
export type Team = typeof teams.$inferSelect;

export const inventoryItems = pgTable("inventory_items", {
  id: serial("id").primaryKey(),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  division: text("division").notNull().default("SKT"),
  category: text("category").notNull(),
  productName: text("product_name").notNull(),
  type: text("type").notNull().default("general"), // general or cable
  attributes: text("attributes"), // JSON string for extra attributes like drum number, length, etc.
  specification: text("specification").notNull(),
  carriedOver: integer("carried_over").notNull().default(0),
  incoming: integer("incoming").notNull().default(0),
  outgoing: integer("outgoing").notNull().default(0),
  remaining: integer("remaining").notNull().default(0),
  unitPrice: integer("unit_price").notNull().default(0),
  totalAmount: integer("total_amount").notNull().default(0),
});

export const insertInventoryItemSchema = createInsertSchema(inventoryItems).omit({ id: true });
export const apiInsertInventoryItemSchema = z.object({
  division: z.string().optional(),
  category: z.string(),
  productName: z.string(),
  type: z.string().optional(),
  attributes: z.string().optional(),
  specification: z.string(),
  carriedOver: z.number().optional(),
  incoming: z.number().optional(),
  outgoing: z.number().optional(),
  remaining: z.number().optional(),
  unitPrice: z.number().optional(),
  totalAmount: z.number().optional(),
});
export type InsertInventoryItem = z.infer<typeof insertInventoryItemSchema>;
export type InventoryItem = typeof inventoryItems.$inferSelect;

export const outgoingRecords = pgTable("outgoing_records", {
  id: serial("id").primaryKey(),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  date: text("date").notNull(),
  division: text("division").notNull(),
  teamCategory: text("team_category").notNull(),
  projectName: text("project_name").notNull(),
  productName: text("product_name").notNull(),
  type: text("type").notNull().default("general"),
  attributes: text("attributes"),
  specification: text("specification").notNull(),
  quantity: integer("quantity").notNull().default(0),
  recipient: text("recipient").notNull(),
});

export const insertOutgoingRecordSchema = createInsertSchema(outgoingRecords).omit({ id: true });
export const apiInsertOutgoingRecordSchema = z.object({
  date: z.string(),
  division: z.string(),
  teamCategory: z.string(),
  projectName: z.string(),
  productName: z.string(),
  type: z.string().optional(),
  attributes: z.string().optional(),
  specification: z.string(),
  quantity: z.number(),
  recipient: z.string(),
});
export type InsertOutgoingRecord = z.infer<typeof insertOutgoingRecordSchema>;
export type OutgoingRecord = typeof outgoingRecords.$inferSelect;

export const materialUsageRecords = pgTable("material_usage_records", {
  id: serial("id").primaryKey(),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  date: text("date").notNull(),
  division: text("division").notNull(),
  teamCategory: text("team_category").notNull(),
  projectName: text("project_name").notNull(),
  productName: text("product_name").notNull(),
  type: text("type").notNull().default("general"),
  attributes: text("attributes"),
  specification: text("specification").notNull(),
  quantity: integer("quantity").notNull().default(0),
  recipient: text("recipient").notNull(),
});

export const insertMaterialUsageRecordSchema = createInsertSchema(materialUsageRecords).omit({ id: true });
export const apiInsertMaterialUsageRecordSchema = z.object({
  date: z.string(),
  division: z.string(),
  teamCategory: z.string(),
  projectName: z.string(),
  productName: z.string(),
  type: z.string().optional(),
  attributes: z.string().optional(),
  specification: z.string(),
  quantity: z.number(),
  recipient: z.string(),
});
export type InsertMaterialUsageRecord = z.infer<typeof insertMaterialUsageRecordSchema>;
export type MaterialUsageRecord = typeof materialUsageRecords.$inferSelect;

export const incomingRecords = pgTable("incoming_records", {
  id: serial("id").primaryKey(),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  date: text("date").notNull(),
  division: text("division").notNull(),
  supplier: text("supplier").notNull(),
  projectName: text("project_name").notNull(),
  productName: text("product_name").notNull(),
  type: text("type").notNull().default("general"),
  attributes: text("attributes"),
  specification: text("specification").notNull().default(""),
  quantity: integer("quantity").notNull().default(0),
  unitPrice: integer("unit_price").notNull().default(0),
});

export const insertIncomingRecordSchema = createInsertSchema(incomingRecords).omit({ id: true });
export const apiInsertIncomingRecordSchema = z.object({
  date: z.string(),
  division: z.string(),
  supplier: z.string(),
  projectName: z.string(),
  productName: z.string(),
  type: z.string().optional(),
  attributes: z.string().optional(),
  specification: z.string().optional(),
  quantity: z.number(),
  unitPrice: z.number().optional(),
});
export type InsertIncomingRecord = z.infer<typeof insertIncomingRecordSchema>;
export type IncomingRecord = typeof incomingRecords.$inferSelect;

// Define relations for Drizzle ORM
import { relations } from "drizzle-orm";

export const tenantsRelations = relations(tenants, ({ many }) => ({
  userTenants: many(userTenants),
  inventoryItems: many(inventoryItems),
  incomingRecords: many(incomingRecords),
  outgoingRecords: many(outgoingRecords),
  materialUsageRecords: many(materialUsageRecords),
  teams: many(teams),
  divisions: many(divisions),
  positions: many(positions),
  invitations: many(invitations),
}));

export const usersRelations = relations(users, ({ many }) => ({
  userTenants: many(userTenants),
}));

export const userTenantsRelations = relations(userTenants, ({ one }) => ({
  user: one(users, {
    fields: [userTenants.userId],
    references: [users.id],
  }),
  tenant: one(tenants, {
    fields: [userTenants.tenantId],
    references: [tenants.id],
  }),
  position: one(positions, {
    fields: [userTenants.positionId],
    references: [positions.id],
  }),
  division: one(divisions, {
    fields: [userTenants.divisionId],
    references: [divisions.id],
  }),
  team: one(teams, {
    fields: [userTenants.teamId],
    references: [teams.id],
  }),
}));

export const divisionsRelations = relations(divisions, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [divisions.tenantId],
    references: [tenants.id],
  }),
  teams: many(teams),
}));

export const teamsRelations = relations(teams, ({ one }) => ({
  division: one(divisions, {
    fields: [teams.divisionId],
    references: [divisions.id],
  }),
  tenant: one(tenants, {
    fields: [teams.tenantId],
    references: [tenants.id],
  }),
}));

export const positionsRelations = relations(positions, ({ one }) => ({
  tenant: one(tenants, {
    fields: [positions.tenantId],
    references: [tenants.id],
  }),
}));

export const invitationsRelations = relations(invitations, ({ one }) => ({
  tenant: one(tenants, {
    fields: [invitations.tenantId],
    references: [tenants.id],
  }),
  invitedByUser: one(users, {
    fields: [invitations.invitedBy],
    references: [users.id],
  }),
}));

