import {
  type User, type InsertUser,
  type Division, type InsertDivision,
  type Team, type InsertTeam,
  type InventoryItem, type InsertInventoryItem,
  type OutgoingRecord, type InsertOutgoingRecord,
  type MaterialUsageRecord, type InsertMaterialUsageRecord,
  type IncomingRecord, type InsertIncomingRecord,
  type Position, type InsertPosition,
  type Invitation, type InsertInvitation,
  type UserTenant, type InsertUserTenant,
  users, divisions, teams, inventoryItems, outgoingRecords, materialUsageRecords, incomingRecords,
  positions, invitations, userTenants
} from "@shared/schema";
import { db } from "./db";
import { eq, and, inArray } from "drizzle-orm";
import { randomUUID } from "crypto";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  getDivisions(tenantId: string): Promise<Division[]>;
  getDivision(id: string, tenantId: string): Promise<Division | undefined>;
  createDivision(name: string, tenantId: string): Promise<Division>;
  updateDivision(id: string, name: string, tenantId: string): Promise<Division | undefined>;
  deleteDivision(id: string, tenantId: string): Promise<boolean>;
  initializeDivisions(): Promise<void>;

  getTeams(tenantId: string): Promise<Team[]>;
  getTeamsByDivision(divisionId: string, tenantId: string): Promise<Team[]>;
  getTeam(id: string, tenantId: string): Promise<Team | undefined>;
  createTeam(team: InsertTeam): Promise<Team>;
  updateTeam(id: string, updates: Partial<InsertTeam>, tenantId: string): Promise<Team | undefined>;
  deleteTeam(id: string, tenantId: string): Promise<boolean>;
  initializeTeams(): Promise<void>;

  getInventoryItems(tenantId: string): Promise<InventoryItem[]>;
  getInventoryItem(id: number, tenantId: string): Promise<InventoryItem | undefined>;
  createInventoryItem(item: InsertInventoryItem): Promise<InventoryItem>;
  updateInventoryItem(id: number, updates: Partial<InsertInventoryItem>, tenantId: string): Promise<InventoryItem | undefined>;
  deleteInventoryItem(id: number, tenantId: string): Promise<boolean>;
  bulkDeleteInventoryItems(ids: number[], tenantId: string): Promise<number>;
  clearInventoryItems(tenantId: string): Promise<void>;
  bulkCreateInventoryItems(items: InsertInventoryItem[]): Promise<InventoryItem[]>;

  getOutgoingRecords(tenantId: string): Promise<OutgoingRecord[]>;
  getOutgoingRecord(id: number, tenantId: string): Promise<OutgoingRecord | undefined>;
  createOutgoingRecord(record: InsertOutgoingRecord): Promise<OutgoingRecord>;
  updateOutgoingRecord(id: number, updates: Partial<InsertOutgoingRecord>, tenantId: string): Promise<OutgoingRecord | undefined>;
  deleteOutgoingRecord(id: number, tenantId: string): Promise<boolean>;
  bulkDeleteOutgoingRecords(ids: number[], tenantId: string): Promise<number>;
  clearOutgoingRecords(tenantId: string): Promise<void>;
  initializeOutgoingRecords(): Promise<void>;

  getMaterialUsageRecords(tenantId: string): Promise<MaterialUsageRecord[]>;
  getMaterialUsageRecord(id: number, tenantId: string): Promise<MaterialUsageRecord | undefined>;
  createMaterialUsageRecord(record: InsertMaterialUsageRecord): Promise<MaterialUsageRecord>;
  updateMaterialUsageRecord(id: number, updates: Partial<InsertMaterialUsageRecord>, tenantId: string): Promise<MaterialUsageRecord | undefined>;
  deleteMaterialUsageRecord(id: number, tenantId: string): Promise<boolean>;
  bulkDeleteMaterialUsageRecords(ids: number[], tenantId: string): Promise<number>;

  getIncomingRecords(tenantId: string): Promise<IncomingRecord[]>;
  getIncomingRecord(id: number, tenantId: string): Promise<IncomingRecord | undefined>;
  createIncomingRecord(record: InsertIncomingRecord): Promise<IncomingRecord>;
  updateIncomingRecord(id: number, updates: Partial<InsertIncomingRecord>, tenantId: string): Promise<IncomingRecord | undefined>;
  deleteIncomingRecord(id: number, tenantId: string): Promise<boolean>;
  bulkDeleteIncomingRecords(ids: number[], tenantId: string): Promise<number>;

  // Admin: Positions
  getPositions(tenantId: string): Promise<Position[]>;
  getPosition(id: string, tenantId: string): Promise<Position | undefined>;
  createPosition(position: InsertPosition): Promise<Position>;
  updatePosition(id: string, updates: Partial<InsertPosition>, tenantId: string): Promise<Position | undefined>;
  deletePosition(id: string, tenantId: string): Promise<boolean>;

  // Admin: Members
  getMembers(tenantId: string): Promise<any[]>;
  updateMember(userId: string, tenantId: string, updates: Partial<InsertUserTenant>): Promise<UserTenant | undefined>;
  deleteMember(userId: string, tenantId: string): Promise<boolean>;

  // Admin: Invitations
  getInvitations(tenantId: string): Promise<Invitation[]>;
  getInvitationByToken(token: string): Promise<Invitation | undefined>;
  createInvitation(invitation: InsertInvitation): Promise<Invitation>;
  updateInvitationStatus(id: string, status: string): Promise<void>;
  deleteInvitation(id: string, tenantId: string): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  // ... (previous methods remain same, but I'll add the new ones)

  async getPositions(tenantId: string): Promise<Position[]> {
    return db.select().from(positions).where(eq(positions.tenantId, tenantId)).orderBy(positions.rankOrder);
  }

  async getPosition(id: string, tenantId: string): Promise<Position | undefined> {
    const [position] = await db.select().from(positions).where(and(eq(positions.id, id), eq(positions.tenantId, tenantId)));
    return position;
  }

  async createPosition(position: InsertPosition): Promise<Position> {
    const [newPosition] = await db.insert(positions).values({
      id: randomUUID(),
      ...position
    }).returning();
    return newPosition;
  }

  async updatePosition(id: string, updates: Partial<InsertPosition>, tenantId: string): Promise<Position | undefined> {
    const [updated] = await db.update(positions).set(updates).where(and(eq(positions.id, id), eq(positions.tenantId, tenantId))).returning();
    return updated;
  }

  async deletePosition(id: string, tenantId: string): Promise<boolean> {
    const result = await db.delete(positions).where(and(eq(positions.id, id), eq(positions.tenantId, tenantId))).returning();
    return result.length > 0;
  }

  async getMembers(tenantId: string): Promise<any[]> {
    return db
      .select({
        id: users.id,
        name: users.name,
        username: users.username,
        role: userTenants.role,
        status: userTenants.status,
        joinDate: userTenants.joinDate,
        positionName: positions.name,
        divisionName: divisions.name,
        teamName: teams.name,
      })
      .from(userTenants)
      .innerJoin(users, eq(userTenants.userId, users.id))
      .leftJoin(positions, eq(userTenants.positionId, positions.id))
      .leftJoin(divisions, eq(userTenants.divisionId, divisions.id))
      .leftJoin(teams, eq(userTenants.teamId, teams.id))
      .where(eq(userTenants.tenantId, tenantId));
  }

  async updateMember(userId: string, tenantId: string, updates: Partial<InsertUserTenant>): Promise<UserTenant | undefined> {
    const [updated] = await db
      .update(userTenants)
      .set(updates)
      .where(and(eq(userTenants.userId, userId), eq(userTenants.tenantId, tenantId)))
      .returning();
    return updated;
  }

  async deleteMember(userId: string, tenantId: string): Promise<boolean> {
    const result = await db.delete(userTenants).where(and(eq(userTenants.userId, userId), eq(userTenants.tenantId, tenantId))).returning();
    return result.length > 0;
  }

  async getInvitations(tenantId: string): Promise<Invitation[]> {
    return db.select().from(invitations).where(eq(invitations.tenantId, tenantId));
  }

  async getInvitationByToken(token: string): Promise<Invitation | undefined> {
    const [inv] = await db.select().from(invitations).where(eq(invitations.token, token));
    return inv;
  }

  async createInvitation(invitation: InsertInvitation): Promise<Invitation> {
    const [newInv] = await db.insert(invitations).values({
      id: randomUUID(),
      ...invitation
    }).returning();
    return newInv;
  }

  async updateInvitationStatus(id: string, status: string): Promise<void> {
    await db.update(invitations).set({ status }).where(eq(invitations.id, id));
  }

  async deleteInvitation(id: string, tenantId: string): Promise<boolean> {
    const result = await db.delete(invitations).where(and(eq(invitations.id, id), eq(invitations.tenantId, tenantId))).returning();
    return result.length > 0;
  }

  // Existing methods implementation (keeping original for brevity in replacement)
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

  async getDivisions(tenantId: string): Promise<Division[]> {
    return db.select().from(divisions).where(eq(divisions.tenantId, tenantId));
  }

  async getDivision(id: string, tenantId: string): Promise<Division | undefined> {
    const [division] = await db.select().from(divisions).where(and(eq(divisions.id, id), eq(divisions.tenantId, tenantId)));
    return division;
  }

  async createDivision(name: string, tenantId: string): Promise<Division> {
    const id = `div${Date.now()}`;
    const [division] = await db.insert(divisions).values({ id, name, tenantId }).returning();
    return division;
  }

  async updateDivision(id: string, name: string, tenantId: string): Promise<Division | undefined> {
    const [division] = await db
      .update(divisions)
      .set({ name })
      .where(and(eq(divisions.id, id), eq(divisions.tenantId, tenantId)))
      .returning();
    return division;
  }

  async deleteDivision(id: string, tenantId: string): Promise<boolean> {
    const result = await db.delete(divisions).where(and(eq(divisions.id, id), eq(divisions.tenantId, tenantId))).returning();
    return result.length > 0;
  }

  async initializeDivisions(): Promise<void> {
    // Initial data handled via migrations/seeds if needed
  }

  async getTeams(tenantId: string): Promise<Team[]> {
    return db.select().from(teams).where(eq(teams.tenantId, tenantId));
  }

  async getTeamsByDivision(divisionId: string, tenantId: string): Promise<Team[]> {
    return db.select().from(teams).where(and(eq(teams.divisionId, divisionId), eq(teams.tenantId, tenantId)));
  }

  async getTeam(id: string, tenantId: string): Promise<Team | undefined> {
    const [team] = await db.select().from(teams).where(and(eq(teams.id, id), eq(teams.tenantId, tenantId)));
    return team;
  }

  async createTeam(team: InsertTeam): Promise<Team> {
    const [newTeam] = await db.insert(teams).values({
      id: randomUUID(),
      ...team,
    }).returning();
    return newTeam;
  }

  async updateTeam(id: string, updates: Partial<InsertTeam>, tenantId: string): Promise<Team | undefined> {
    const [team] = await db
      .update(teams)
      .set(updates)
      .where(and(eq(teams.id, id), eq(teams.tenantId, tenantId)))
      .returning();
    return team;
  }

  async deleteTeam(id: string, tenantId: string): Promise<boolean> {
    const result = await db.delete(teams).where(and(eq(teams.id, id), eq(teams.tenantId, tenantId))).returning();
    return result.length > 0;
  }

  async initializeTeams(): Promise<void> {
    // Initial data handled via migrations/seeds if needed
  }

  async getInventoryItems(tenantId: string): Promise<InventoryItem[]> {
    return db.select().from(inventoryItems).where(eq(inventoryItems.tenantId, tenantId));
  }

  async getInventoryItem(id: number, tenantId: string): Promise<InventoryItem | undefined> {
    const [item] = await db.select().from(inventoryItems).where(and(eq(inventoryItems.id, id), eq(inventoryItems.tenantId, tenantId)));
    return item;
  }

  async createInventoryItem(item: InsertInventoryItem): Promise<InventoryItem> {
    const [newItem] = await db.insert(inventoryItems).values(item).returning();
    return newItem;
  }

  async updateInventoryItem(id: number, updates: Partial<InsertInventoryItem>, tenantId: string): Promise<InventoryItem | undefined> {
    const [item] = await db
      .update(inventoryItems)
      .set(updates)
      .where(and(eq(inventoryItems.id, id), eq(inventoryItems.tenantId, tenantId)))
      .returning();
    return item;
  }

  async deleteInventoryItem(id: number, tenantId: string): Promise<boolean> {
    const result = await db.delete(inventoryItems).where(and(eq(inventoryItems.id, id), eq(inventoryItems.tenantId, tenantId))).returning();
    return result.length > 0;
  }

  async bulkDeleteInventoryItems(ids: number[], tenantId: string): Promise<number> {
    if (ids.length === 0) return 0;
    const result = await db.delete(inventoryItems).where(and(inArray(inventoryItems.id, ids), eq(inventoryItems.tenantId, tenantId))).returning();
    return result.length;
  }

  async clearInventoryItems(tenantId: string): Promise<void> {
    await db.delete(inventoryItems).where(eq(inventoryItems.tenantId, tenantId));
  }

  async bulkCreateInventoryItems(items: InsertInventoryItem[]): Promise<InventoryItem[]> {
    if (items.length === 0) return [];
    const result = await db.insert(inventoryItems).values(items).returning();
    return result;
  }

  async getOutgoingRecords(tenantId: string): Promise<OutgoingRecord[]> {
    return db.select().from(outgoingRecords).where(eq(outgoingRecords.tenantId, tenantId));
  }

  async getOutgoingRecord(id: number, tenantId: string): Promise<OutgoingRecord | undefined> {
    const [record] = await db.select().from(outgoingRecords).where(and(eq(outgoingRecords.id, id), eq(outgoingRecords.tenantId, tenantId)));
    return record;
  }

  async createOutgoingRecord(record: InsertOutgoingRecord): Promise<OutgoingRecord> {
    const [newRecord] = await db.insert(outgoingRecords).values(record).returning();
    return newRecord;
  }

  async updateOutgoingRecord(id: number, updates: Partial<InsertOutgoingRecord>, tenantId: string): Promise<OutgoingRecord | undefined> {
    const [record] = await db
      .update(outgoingRecords)
      .set(updates)
      .where(and(eq(outgoingRecords.id, id), eq(outgoingRecords.tenantId, tenantId)))
      .returning();
    return record;
  }

  async deleteOutgoingRecord(id: number, tenantId: string): Promise<boolean> {
    const result = await db.delete(outgoingRecords).where(and(eq(outgoingRecords.id, id), eq(outgoingRecords.tenantId, tenantId))).returning();
    return result.length > 0;
  }

  async bulkDeleteOutgoingRecords(ids: number[], tenantId: string): Promise<number> {
    if (ids.length === 0) return 0;
    const result = await db.delete(outgoingRecords).where(and(inArray(outgoingRecords.id, ids), eq(outgoingRecords.tenantId, tenantId))).returning();
    return result.length;
  }

  async clearOutgoingRecords(tenantId: string): Promise<void> {
    await db.delete(outgoingRecords).where(eq(outgoingRecords.tenantId, tenantId));
  }

  async initializeOutgoingRecords(): Promise<void> {
    // Initial data handled via migrations/seeds if needed
  }

  async getMaterialUsageRecords(tenantId: string): Promise<MaterialUsageRecord[]> {
    return db.select().from(materialUsageRecords).where(eq(materialUsageRecords.tenantId, tenantId));
  }

  async getMaterialUsageRecord(id: number, tenantId: string): Promise<MaterialUsageRecord | undefined> {
    const [record] = await db.select().from(materialUsageRecords).where(and(eq(materialUsageRecords.id, id), eq(materialUsageRecords.tenantId, tenantId)));
    return record;
  }

  async createMaterialUsageRecord(record: InsertMaterialUsageRecord): Promise<MaterialUsageRecord> {
    const [newRecord] = await db.insert(materialUsageRecords).values(record).returning();
    return newRecord;
  }

  async updateMaterialUsageRecord(id: number, updates: Partial<InsertMaterialUsageRecord>, tenantId: string): Promise<MaterialUsageRecord | undefined> {
    const [record] = await db
      .update(materialUsageRecords)
      .set(updates)
      .where(and(eq(materialUsageRecords.id, id), eq(materialUsageRecords.tenantId, tenantId)))
      .returning();
    return record;
  }

  async deleteMaterialUsageRecord(id: number, tenantId: string): Promise<boolean> {
    const result = await db.delete(materialUsageRecords).where(and(eq(materialUsageRecords.id, id), eq(materialUsageRecords.tenantId, tenantId))).returning();
    return result.length > 0;
  }

  async bulkDeleteMaterialUsageRecords(ids: number[], tenantId: string): Promise<number> {
    if (ids.length === 0) return 0;
    const result = await db.delete(materialUsageRecords).where(and(inArray(materialUsageRecords.id, ids), eq(materialUsageRecords.tenantId, tenantId))).returning();
    return result.length;
  }

  async getIncomingRecords(tenantId: string): Promise<IncomingRecord[]> {
    return db.select().from(incomingRecords).where(eq(incomingRecords.tenantId, tenantId));
  }

  async getIncomingRecord(id: number, tenantId: string): Promise<IncomingRecord | undefined> {
    const [record] = await db.select().from(incomingRecords).where(and(eq(incomingRecords.id, id), eq(incomingRecords.tenantId, tenantId)));
    return record;
  }

  async createIncomingRecord(record: InsertIncomingRecord): Promise<IncomingRecord> {
    const [newRecord] = await db.insert(incomingRecords).values(record).returning();
    return newRecord;
  }

  async updateIncomingRecord(id: number, updates: Partial<InsertIncomingRecord>, tenantId: string): Promise<IncomingRecord | undefined> {
    const [record] = await db
      .update(incomingRecords)
      .set(updates)
      .where(and(eq(incomingRecords.id, id), eq(incomingRecords.tenantId, tenantId)))
      .returning();
    return record;
  }

  async deleteIncomingRecord(id: number, tenantId: string): Promise<boolean> {
    const result = await db.delete(incomingRecords).where(and(eq(incomingRecords.id, id), eq(incomingRecords.tenantId, tenantId))).returning();
    return result.length > 0;
  }

  async bulkDeleteIncomingRecords(ids: number[], tenantId: string): Promise<number> {
    if (ids.length === 0) return 0;
    const result = await db.delete(incomingRecords).where(and(inArray(incomingRecords.id, ids), eq(incomingRecords.tenantId, tenantId))).returning();
    return result.length;
  }
}

export const storage = new DatabaseStorage();
