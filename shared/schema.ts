import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const divisions = pgTable("divisions", {
  id: varchar("id").primaryKey(),
  name: text("name").notNull(),
});

export const insertDivisionSchema = createInsertSchema(divisions);
export type InsertDivision = z.infer<typeof insertDivisionSchema>;
export type Division = typeof divisions.$inferSelect;

export const teams = pgTable("teams", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  divisionId: varchar("division_id").notNull(),
  memberCount: integer("member_count").notNull().default(0),
  materialCount: integer("material_count").notNull().default(0),
  lastActivity: text("last_activity"),
  isActive: boolean("is_active").notNull().default(true),
});

export const insertTeamSchema = createInsertSchema(teams).omit({ id: true });
export type InsertTeam = z.infer<typeof insertTeamSchema>;
export type Team = typeof teams.$inferSelect;

export const inventoryItems = pgTable("inventory_items", {
  id: serial("id").primaryKey(),
  division: text("division").notNull().default("SKT"),
  category: text("category").notNull(),
  productName: text("product_name").notNull(),
  specification: text("specification").notNull(),
  carriedOver: integer("carried_over").notNull().default(0),
  incoming: integer("incoming").notNull().default(0),
  outgoing: integer("outgoing").notNull().default(0),
  remaining: integer("remaining").notNull().default(0),
  unitPrice: integer("unit_price").notNull().default(0),
  totalAmount: integer("total_amount").notNull().default(0),
});

export const insertInventoryItemSchema = createInsertSchema(inventoryItems).omit({ id: true });
export type InsertInventoryItem = z.infer<typeof insertInventoryItemSchema>;
export type InventoryItem = typeof inventoryItems.$inferSelect;

export const outgoingRecords = pgTable("outgoing_records", {
  id: serial("id").primaryKey(),
  date: text("date").notNull(),
  division: text("division").notNull(),
  teamCategory: text("team_category").notNull(),
  projectName: text("project_name").notNull(),
  productName: text("product_name").notNull(),
  specification: text("specification").notNull(),
  quantity: integer("quantity").notNull().default(0),
  recipient: text("recipient").notNull(),
});

export const insertOutgoingRecordSchema = createInsertSchema(outgoingRecords).omit({ id: true });
export type InsertOutgoingRecord = z.infer<typeof insertOutgoingRecordSchema>;
export type OutgoingRecord = typeof outgoingRecords.$inferSelect;

export const materialUsageRecords = pgTable("material_usage_records", {
  id: serial("id").primaryKey(),
  date: text("date").notNull(),
  division: text("division").notNull(),
  teamCategory: text("team_category").notNull(),
  projectName: text("project_name").notNull(),
  productName: text("product_name").notNull(),
  specification: text("specification").notNull(),
  quantity: integer("quantity").notNull().default(0),
  recipient: text("recipient").notNull(),
});

export const insertMaterialUsageRecordSchema = createInsertSchema(materialUsageRecords).omit({ id: true });
export type InsertMaterialUsageRecord = z.infer<typeof insertMaterialUsageRecordSchema>;
export type MaterialUsageRecord = typeof materialUsageRecords.$inferSelect;
