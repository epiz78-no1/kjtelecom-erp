import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, serial, timestamp, jsonb } from "drizzle-orm/pg-core";
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
  phoneNumber: text("phone_number"),
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
  // Menu-level permissions
  permissions: jsonb("permissions").$type<{
    incoming: 'none' | 'read' | 'write' | 'own_only';
    outgoing: 'none' | 'read' | 'write' | 'own_only';
    usage: 'none' | 'read' | 'write' | 'own_only';
    inventory: 'none' | 'read' | 'write' | 'own_only';
  }>(),
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

export const categories = pgTable("categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
});

export const insertCategorySchema = createInsertSchema(categories).omit({ id: true });
export const apiInsertCategorySchema = z.object({
  name: z.string(),
});
export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type Category = typeof categories.$inferSelect;

export const suppliers = pgTable("suppliers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
});

export const insertSupplierSchema = createInsertSchema(suppliers).omit({ id: true });
export const apiInsertSupplierSchema = z.object({
  name: z.string(),
});
export type InsertSupplier = z.infer<typeof insertSupplierSchema>;
export type Supplier = typeof suppliers.$inferSelect;

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
  divisionId: varchar("division_id").references(() => divisions.id),
  division: text("division").notNull().default("SKT"),
  categoryId: varchar("category_id").references(() => categories.id),
  category: text("category").notNull(), // Keep for backward compatibility
  productName: text("product_name").notNull(),
  type: text("type").notNull().default("general"),
  attributes: text("attributes"),
  specification: text("specification").notNull(),
  carriedOver: integer("carried_over").notNull().default(0),
  incoming: integer("incoming").notNull().default(0),
  outgoing: integer("outgoing").notNull().default(0),
  usage: integer("usage").notNull().default(0),
  remaining: integer("remaining").notNull().default(0),
  unitPrice: integer("unit_price").notNull().default(0),
  totalAmount: integer("total_amount").notNull().default(0),
  createdBy: varchar("created_by").references(() => users.id),
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
  usage: z.number().optional(),
  remaining: z.number().optional(),
  unitPrice: z.number().optional(),
  totalAmount: z.number().optional(),
});
export type InsertInventoryItem = z.infer<typeof insertInventoryItemSchema>;
export type InventoryItem = typeof inventoryItems.$inferSelect;

export const outgoingRecords = pgTable("outgoing_records", {
  id: serial("id").primaryKey(),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  inventoryItemId: integer("inventory_item_id").references(() => inventoryItems.id),
  teamId: varchar("team_id").references(() => teams.id),
  divisionId: varchar("division_id").references(() => divisions.id),
  categoryId: varchar("category_id").references(() => categories.id),
  date: text("date").notNull(),
  division: text("division").notNull().default("SKT"),
  category: text("category").notNull().default(""), // Keep for backward compatibility
  teamCategory: text("team_category").notNull(),
  projectName: text("project_name").notNull(),
  productName: text("product_name").notNull(),
  type: text("type").notNull().default("general"),
  attributes: text("attributes"),
  specification: text("specification").notNull(),
  quantity: integer("quantity").notNull().default(0),
  recipient: text("recipient").notNull(),
  remark: text("remark"),
  createdBy: varchar("created_by").references(() => users.id),
});

export const insertOutgoingRecordSchema = createInsertSchema(outgoingRecords).omit({ id: true });
export const apiInsertOutgoingRecordSchema = z.object({
  inventoryItemId: z.number().optional(),
  teamId: z.string().optional(),
  divisionId: z.string().optional(),
  date: z.string(),
  division: z.string().optional(),
  category: z.string(),
  teamCategory: z.string(),
  projectName: z.string(),
  productName: z.string(),
  type: z.string().optional(),
  attributes: z.string().optional(),
  specification: z.string(),
  quantity: z.number(),
  recipient: z.string(),
  remark: z.string().optional(),
});
export type InsertOutgoingRecord = z.infer<typeof insertOutgoingRecordSchema>;
export type OutgoingRecord = typeof outgoingRecords.$inferSelect;

export const materialUsageRecords = pgTable("material_usage_records", {
  id: serial("id").primaryKey(),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  inventoryItemId: integer("inventory_item_id").references(() => inventoryItems.id),
  teamId: varchar("team_id").references(() => teams.id),
  divisionId: varchar("division_id").references(() => divisions.id),
  categoryId: varchar("category_id").references(() => categories.id),
  date: text("date").notNull(),
  division: text("division").notNull().default("SKT"),
  category: text("category").notNull().default(""), // Keep for backward compatibility
  teamCategory: text("team_category").notNull(),
  projectName: text("project_name").notNull(),
  productName: text("product_name").notNull(),
  type: text("type").notNull().default("general"),
  attributes: text("attributes"),
  specification: text("specification").notNull(),
  quantity: integer("quantity").notNull().default(0),
  recipient: text("recipient").notNull(),
  remark: text("remark"),
  createdBy: varchar("created_by").references(() => users.id),
});

export const insertMaterialUsageRecordSchema = createInsertSchema(materialUsageRecords).omit({ id: true });
export const apiInsertMaterialUsageRecordSchema = z.object({
  inventoryItemId: z.number().optional(),
  teamId: z.string().optional(),
  divisionId: z.string().optional(),
  date: z.string(),
  division: z.string().optional(),
  category: z.string(),
  teamCategory: z.string(),
  projectName: z.string(),
  productName: z.string(),
  type: z.string().optional(),
  attributes: z.string().optional(),
  specification: z.string(),
  quantity: z.number(),
  recipient: z.string(),
  remark: z.string().optional(),
});
export type InsertMaterialUsageRecord = z.infer<typeof insertMaterialUsageRecordSchema>;
export type MaterialUsageRecord = typeof materialUsageRecords.$inferSelect;

export const incomingRecords = pgTable("incoming_records", {
  id: serial("id").primaryKey(),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  inventoryItemId: integer("inventory_item_id").references(() => inventoryItems.id),
  divisionId: varchar("division_id").references(() => divisions.id),
  categoryId: varchar("category_id").references(() => categories.id),
  supplierId: varchar("supplier_id").references(() => suppliers.id),
  date: text("date").notNull(),
  division: text("division").notNull().default("SKT"),
  category: text("category").notNull().default(""), // Keep for backward compatibility
  supplier: text("supplier").notNull(),
  projectName: text("project_name").notNull(),
  productName: text("product_name").notNull(),
  type: text("type").notNull().default("general"),
  attributes: text("attributes"),
  specification: text("specification").notNull().default(""),
  quantity: integer("quantity").notNull().default(0),
  unitPrice: integer("unit_price").notNull().default(0),
  remark: text("remark"),
  createdBy: varchar("created_by").references(() => users.id),
});

export const insertIncomingRecordSchema = createInsertSchema(incomingRecords).omit({ id: true });
export const apiInsertIncomingRecordSchema = z.object({
  inventoryItemId: z.number().optional(),
  divisionId: z.string().optional(),
  date: z.string(),
  division: z.string().optional(),
  category: z.string(),
  supplier: z.string(),
  projectName: z.string(),
  productName: z.string(),
  type: z.string().optional(),
  attributes: z.string().optional(),
  specification: z.string().optional(),
  quantity: z.number(),
  unitPrice: z.number().optional(),
  remark: z.string().optional(),
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

export const incomingRecordsRelations = relations(incomingRecords, ({ one }) => ({
  tenant: one(tenants, {
    fields: [incomingRecords.tenantId],
    references: [tenants.id],
  }),
  inventoryItem: one(inventoryItems, {
    fields: [incomingRecords.inventoryItemId],
    references: [inventoryItems.id],
  }),
}));

export const outgoingRecordsRelations = relations(outgoingRecords, ({ one }) => ({
  tenant: one(tenants, {
    fields: [outgoingRecords.tenantId],
    references: [tenants.id],
  }),
  inventoryItem: one(inventoryItems, {
    fields: [outgoingRecords.inventoryItemId],
    references: [inventoryItems.id],
  }),
  team: one(teams, {
    fields: [outgoingRecords.teamId],
    references: [teams.id],
  }),
}));

export const materialUsageRecordsRelations = relations(materialUsageRecords, ({ one }) => ({
  tenant: one(tenants, {
    fields: [materialUsageRecords.tenantId],
    references: [tenants.id],
  }),
  inventoryItem: one(inventoryItems, {
    fields: [materialUsageRecords.inventoryItemId],
    references: [inventoryItems.id],
  }),
  team: one(teams, {
    fields: [materialUsageRecords.teamId],
    references: [teams.id],
  }),
}));


// Optical Cables Master Table
export const opticalCables = pgTable("optical_cables", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  division: text("division").notNull().default("SKT"),
  category: text("category").notNull().default(""), // For "구분"
  managementNo: text("management_no").notNull(),
  projectCode: text("project_code"),
  projectName: text("project_name"),
  receivedDate: text("received_date"),
  manufacturer: text("manufacturer"),
  manufactureYear: text("manufacture_year"),
  spec: text("spec").notNull(), // 가공, 지중, 배선
  coreCount: integer("core_count").notNull(),
  drumNo: text("drum_no").notNull(), // Unique per tenant usually
  totalLength: text("total_length").notNull(),
  usedLength: integer("used_length").notNull().default(0),
  remainingLength: integer("remaining_length").notNull(),
  wasteLength: integer("waste_length").notNull().default(0),
  status: text("status").notNull().default("in_stock"), // in_stock, assigned, used_up, returned, waste
  location: text("location"),
  remark: text("remark"),
  unitPrice: integer("unit_price").notNull().default(0),
  totalAmount: integer("total_amount").notNull().default(0),
  currentTeamId: varchar("current_team_id").references(() => teams.id), // Currently assigned team
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertOpticalCableSchema = createInsertSchema(opticalCables).omit({ id: true, createdAt: true, updatedAt: true });
export const apiInsertOpticalCableSchema = z.object({
  managementNo: z.string(),
  division: z.string().optional(),
  category: z.string().optional(),
  projectCode: z.string().optional(),
  projectName: z.string().optional(),
  receivedDate: z.string().optional(),
  manufacturer: z.string().optional(),
  manufactureYear: z.string().optional(),
  spec: z.string(),
  coreCount: z.number(),
  drumNo: z.string(),
  totalLength: z.union([z.string(), z.number().transform(String)]),
  location: z.string().optional(),
  remark: z.string().optional(),
  wasteLength: z.number().optional(),
  unitPrice: z.number().optional(),
  totalAmount: z.number().optional(),
  remainingLength: z.number().optional(),
});
export type InsertOpticalCable = z.infer<typeof insertOpticalCableSchema>;
export type OpticalCable = typeof opticalCables.$inferSelect;

// Optical Cable Logs (History) Table
export const opticalCableLogs = pgTable("optical_cable_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  cableId: varchar("cable_id").notNull().references(() => opticalCables.id, { onDelete: "cascade" }),
  teamId: varchar("team_id").references(() => teams.id), // Team involved in this log (assignee or user)
  logType: text("log_type").notNull(), // assign (불출), usage (사용), return (반납), waste (폐기)
  projectNameUsage: text("project_name_usage"), // 공사명 (사용 시)
  sectionName: text("section_name"), // 구간명
  usedLength: integer("used_length").notNull().default(0), // Total usage in this action
  installLength: integer("install_length").default(0), // Net installed
  wasteLength: integer("waste_length").default(0), // Wasted
  usageDate: text("usage_date").notNull(),
  workerName: text("worker_name"),
  beforeRemaining: integer("before_remaining"),
  afterRemaining: integer("after_remaining"),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertOpticalCableLogSchema = createInsertSchema(opticalCableLogs).omit({ id: true, createdAt: true });
export const apiInsertOpticalCableLogSchema = z.object({
  cableId: z.string(),
  teamId: z.string().optional(),
  logType: z.enum(['assign', 'usage', 'return', 'waste']),
  projectNameUsage: z.string().optional(),
  sectionName: z.string().optional(),
  installLength: z.number().optional(),
  wasteLength: z.number().optional(),
  usageDate: z.string(),
  workerName: z.string().optional(),
});
export type InsertOpticalCableLog = z.infer<typeof insertOpticalCableLogSchema>;
export type OpticalCableLog = typeof opticalCableLogs.$inferSelect;

// Relations
export const opticalCablesRelations = relations(opticalCables, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [opticalCables.tenantId],
    references: [tenants.id],
  }),
  currentTeam: one(teams, {
    fields: [opticalCables.currentTeamId],
    references: [teams.id],
  }),
  logs: many(opticalCableLogs),
}));

export const opticalCableLogsRelations = relations(opticalCableLogs, ({ one }) => ({
  tenant: one(tenants, {
    fields: [opticalCableLogs.tenantId],
    references: [tenants.id],
  }),
  cable: one(opticalCables, {
    fields: [opticalCableLogs.cableId],
    references: [opticalCables.id],
  }),
  team: one(teams, {
    fields: [opticalCableLogs.teamId],
    references: [teams.id],
  }),
}));
