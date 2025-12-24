import {
  type User, type InsertUser,
  type Division, type InsertDivision,
  type Team, type InsertTeam,
  type InventoryItem, type InsertInventoryItem,
  type OutgoingRecord, type InsertOutgoingRecord,
  type MaterialUsageRecord, type InsertMaterialUsageRecord,
  type IncomingRecord, type InsertIncomingRecord,
  users, divisions, teams, inventoryItems, outgoingRecords, materialUsageRecords, incomingRecords
} from "@shared/schema";
import { db } from "./db";
import { eq, inArray } from "drizzle-orm";
import { randomUUID } from "crypto";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  getDivisions(): Promise<Division[]>;
  getDivision(id: string): Promise<Division | undefined>;
  createDivision(name: string): Promise<Division>;
  updateDivision(id: string, name: string): Promise<Division | undefined>;
  deleteDivision(id: string): Promise<boolean>;
  initializeDivisions(): Promise<void>;

  getTeams(): Promise<Team[]>;
  getTeamsByDivision(divisionId: string): Promise<Team[]>;
  getTeam(id: string): Promise<Team | undefined>;
  createTeam(team: InsertTeam): Promise<Team>;
  updateTeam(id: string, updates: Partial<InsertTeam>): Promise<Team | undefined>;
  deleteTeam(id: string): Promise<boolean>;
  initializeTeams(): Promise<void>;

  getInventoryItems(): Promise<InventoryItem[]>;
  getInventoryItem(id: number): Promise<InventoryItem | undefined>;
  createInventoryItem(item: InsertInventoryItem): Promise<InventoryItem>;
  updateInventoryItem(id: number, updates: Partial<InsertInventoryItem>): Promise<InventoryItem | undefined>;
  deleteInventoryItem(id: number): Promise<boolean>;
  bulkDeleteInventoryItems(ids: number[]): Promise<number>;
  clearInventoryItems(): Promise<void>;
  bulkCreateInventoryItems(items: InsertInventoryItem[]): Promise<InventoryItem[]>;

  getOutgoingRecords(): Promise<OutgoingRecord[]>;
  getOutgoingRecord(id: number): Promise<OutgoingRecord | undefined>;
  createOutgoingRecord(record: InsertOutgoingRecord): Promise<OutgoingRecord>;
  updateOutgoingRecord(id: number, updates: Partial<InsertOutgoingRecord>): Promise<OutgoingRecord | undefined>;
  deleteOutgoingRecord(id: number): Promise<boolean>;
  bulkDeleteOutgoingRecords(ids: number[]): Promise<number>;
  clearOutgoingRecords(): Promise<void>;
  initializeOutgoingRecords(): Promise<void>;

  getMaterialUsageRecords(): Promise<MaterialUsageRecord[]>;
  getMaterialUsageRecord(id: number): Promise<MaterialUsageRecord | undefined>;
  createMaterialUsageRecord(record: InsertMaterialUsageRecord): Promise<MaterialUsageRecord>;
  updateMaterialUsageRecord(id: number, updates: Partial<InsertMaterialUsageRecord>): Promise<MaterialUsageRecord | undefined>;
  deleteMaterialUsageRecord(id: number): Promise<boolean>;
  bulkDeleteMaterialUsageRecords(ids: number[]): Promise<number>;

  getIncomingRecords(): Promise<IncomingRecord[]>;
  getIncomingRecord(id: number): Promise<IncomingRecord | undefined>;
  createIncomingRecord(record: InsertIncomingRecord): Promise<IncomingRecord>;
  updateIncomingRecord(id: number, updates: Partial<InsertIncomingRecord>): Promise<IncomingRecord | undefined>;
  deleteIncomingRecord(id: number): Promise<boolean>;
  bulkDeleteIncomingRecords(ids: number[]): Promise<number>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getDivisions(): Promise<Division[]> {
    return db.select().from(divisions);
  }

  async getDivision(id: string): Promise<Division | undefined> {
    const [division] = await db.select().from(divisions).where(eq(divisions.id, id));
    return division;
  }

  async createDivision(name: string): Promise<Division> {
    const id = `div${Date.now()}`;
    const [division] = await db.insert(divisions).values({ id, name }).returning();
    return division;
  }

  async updateDivision(id: string, name: string): Promise<Division | undefined> {
    const [division] = await db
      .update(divisions)
      .set({ name })
      .where(eq(divisions.id, id))
      .returning();
    return division;
  }

  async deleteDivision(id: string): Promise<boolean> {
    const result = await db.delete(divisions).where(eq(divisions.id, id)).returning();
    return result.length > 0;
  }

  async initializeDivisions(): Promise<void> {
    const existing = await db.select().from(divisions);
    if (existing.length === 0) {
      await db.insert(divisions).values([
        { id: "div1", name: "사업부 1" },
        { id: "div2", name: "사업부 2" },
      ]);
    }
  }

  async getTeams(): Promise<Team[]> {
    return db.select().from(teams);
  }

  async getTeamsByDivision(divisionId: string): Promise<Team[]> {
    return db.select().from(teams).where(eq(teams.divisionId, divisionId));
  }

  async getTeam(id: string): Promise<Team | undefined> {
    const [team] = await db.select().from(teams).where(eq(teams.id, id));
    return team;
  }

  async createTeam(team: InsertTeam): Promise<Team> {
    const [newTeam] = await db.insert(teams).values({
      id: randomUUID(),
      ...team,
    }).returning();
    return newTeam;
  }

  async updateTeam(id: string, updates: Partial<InsertTeam>): Promise<Team | undefined> {
    const [team] = await db
      .update(teams)
      .set(updates)
      .where(eq(teams.id, id))
      .returning();
    return team;
  }

  async deleteTeam(id: string): Promise<boolean> {
    const result = await db.delete(teams).where(eq(teams.id, id)).returning();
    return result.length > 0;
  }

  async initializeTeams(): Promise<void> {
    const existing = await db.select().from(teams);
    if (existing.length === 0) {
      await db.insert(teams).values([
        { id: randomUUID(), name: "강남 1팀", divisionId: "div1", memberCount: 5, materialCount: 12, lastActivity: "2024-12-15", isActive: true },
        { id: randomUUID(), name: "서초 2팀", divisionId: "div1", memberCount: 4, materialCount: 8, lastActivity: "2024-12-14", isActive: true },
        { id: randomUUID(), name: "강서 1팀", divisionId: "div1", memberCount: 6, materialCount: 10, lastActivity: "2024-12-12", isActive: true },
        { id: randomUUID(), name: "송파 1팀", divisionId: "div2", memberCount: 6, materialCount: 15, lastActivity: "2024-12-13", isActive: true },
        { id: randomUUID(), name: "강동 1팀", divisionId: "div2", memberCount: 3, materialCount: 6, lastActivity: "2024-12-10", isActive: false },
        { id: randomUUID(), name: "광진 1팀", divisionId: "div2", memberCount: 5, materialCount: 9, lastActivity: "2024-12-11", isActive: true },
      ]);
    }
  }

  async getInventoryItems(): Promise<InventoryItem[]> {
    return db.select().from(inventoryItems);
  }

  async getInventoryItem(id: number): Promise<InventoryItem | undefined> {
    const [item] = await db.select().from(inventoryItems).where(eq(inventoryItems.id, id));
    return item;
  }

  async createInventoryItem(item: InsertInventoryItem): Promise<InventoryItem> {
    const [newItem] = await db.insert(inventoryItems).values(item).returning();
    return newItem;
  }

  async updateInventoryItem(id: number, updates: Partial<InsertInventoryItem>): Promise<InventoryItem | undefined> {
    const [item] = await db
      .update(inventoryItems)
      .set(updates)
      .where(eq(inventoryItems.id, id))
      .returning();
    return item;
  }

  async deleteInventoryItem(id: number): Promise<boolean> {
    const result = await db.delete(inventoryItems).where(eq(inventoryItems.id, id)).returning();
    return result.length > 0;
  }

  async bulkDeleteInventoryItems(ids: number[]): Promise<number> {
    if (ids.length === 0) return 0;
    const result = await db.delete(inventoryItems).where(inArray(inventoryItems.id, ids)).returning();
    return result.length;
  }

  async clearInventoryItems(): Promise<void> {
    await db.delete(inventoryItems);
  }

  async bulkCreateInventoryItems(items: InsertInventoryItem[]): Promise<InventoryItem[]> {
    if (items.length === 0) return [];
    const result = await db.insert(inventoryItems).values(items).returning();
    return result;
  }

  async getOutgoingRecords(): Promise<OutgoingRecord[]> {
    return db.select().from(outgoingRecords);
  }

  async getOutgoingRecord(id: number): Promise<OutgoingRecord | undefined> {
    const [record] = await db.select().from(outgoingRecords).where(eq(outgoingRecords.id, id));
    return record;
  }

  async createOutgoingRecord(record: InsertOutgoingRecord): Promise<OutgoingRecord> {
    const [newRecord] = await db.insert(outgoingRecords).values(record).returning();
    return newRecord;
  }

  async updateOutgoingRecord(id: number, updates: Partial<InsertOutgoingRecord>): Promise<OutgoingRecord | undefined> {
    const [record] = await db
      .update(outgoingRecords)
      .set(updates)
      .where(eq(outgoingRecords.id, id))
      .returning();
    return record;
  }

  async deleteOutgoingRecord(id: number): Promise<boolean> {
    const result = await db.delete(outgoingRecords).where(eq(outgoingRecords.id, id)).returning();
    return result.length > 0;
  }

  async bulkDeleteOutgoingRecords(ids: number[]): Promise<number> {
    if (ids.length === 0) return 0;
    const result = await db.delete(outgoingRecords).where(inArray(outgoingRecords.id, ids)).returning();
    return result.length;
  }

  async clearOutgoingRecords(): Promise<void> {
    await db.delete(outgoingRecords);
  }

  async initializeOutgoingRecords(): Promise<void> {
    // Sample data initialization removed
  }

  async getMaterialUsageRecords(): Promise<MaterialUsageRecord[]> {
    return db.select().from(materialUsageRecords);
  }

  async getMaterialUsageRecord(id: number): Promise<MaterialUsageRecord | undefined> {
    const [record] = await db.select().from(materialUsageRecords).where(eq(materialUsageRecords.id, id));
    return record;
  }

  async createMaterialUsageRecord(record: InsertMaterialUsageRecord): Promise<MaterialUsageRecord> {
    const [newRecord] = await db.insert(materialUsageRecords).values(record).returning();
    return newRecord;
  }

  async updateMaterialUsageRecord(id: number, updates: Partial<InsertMaterialUsageRecord>): Promise<MaterialUsageRecord | undefined> {
    const [record] = await db
      .update(materialUsageRecords)
      .set(updates)
      .where(eq(materialUsageRecords.id, id))
      .returning();
    return record;
  }

  async deleteMaterialUsageRecord(id: number): Promise<boolean> {
    const result = await db.delete(materialUsageRecords).where(eq(materialUsageRecords.id, id)).returning();
    return result.length > 0;
  }

  async bulkDeleteMaterialUsageRecords(ids: number[]): Promise<number> {
    if (ids.length === 0) return 0;
    const result = await db.delete(materialUsageRecords).where(inArray(materialUsageRecords.id, ids)).returning();
    return result.length;
  }

  async getIncomingRecords(): Promise<IncomingRecord[]> {
    return db.select().from(incomingRecords);
  }

  async getIncomingRecord(id: number): Promise<IncomingRecord | undefined> {
    const [record] = await db.select().from(incomingRecords).where(eq(incomingRecords.id, id));
    return record;
  }

  async createIncomingRecord(record: InsertIncomingRecord): Promise<IncomingRecord> {
    const [newRecord] = await db.insert(incomingRecords).values(record).returning();
    return newRecord;
  }

  async updateIncomingRecord(id: number, updates: Partial<InsertIncomingRecord>): Promise<IncomingRecord | undefined> {
    const [record] = await db
      .update(incomingRecords)
      .set(updates)
      .where(eq(incomingRecords.id, id))
      .returning();
    return record;
  }

  async deleteIncomingRecord(id: number): Promise<boolean> {
    const result = await db.delete(incomingRecords).where(eq(incomingRecords.id, id)).returning();
    return result.length > 0;
  }

  async bulkDeleteIncomingRecords(ids: number[]): Promise<number> {
    if (ids.length === 0) return 0;
    const result = await db.delete(incomingRecords).where(inArray(incomingRecords.id, ids)).returning();
    return result.length;
  }
}

export const storage = new DatabaseStorage();
