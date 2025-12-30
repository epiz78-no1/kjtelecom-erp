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
import { eq, and, inArray, sql, count, getTableColumns, asc } from "drizzle-orm";
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
  createTeam(team: InsertTeam, memberIds?: string[]): Promise<Team>;
  updateTeam(id: string, updates: Partial<InsertTeam>, tenantId: string, memberIds?: string[]): Promise<Team | undefined>;
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
  getTeamItemStock(tenantId: string, teamCategory: string, productName: string, specification: string, division: string): Promise<number>;
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
  updateMember(userId: string, tenantId: string, updates: Partial<InsertUserTenant> & { name?: string; phoneNumber?: string }): Promise<UserTenant | undefined>;
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
        phoneNumber: users.phoneNumber,
        positionName: positions.name,
        positionId: userTenants.positionId,
        divisionName: divisions.name,
        divisionId: userTenants.divisionId,
        teamName: teams.name,
        teamId: teams.id,
        permissions: userTenants.permissions,
      })
      .from(userTenants)
      .innerJoin(users, eq(userTenants.userId, users.id))
      .leftJoin(positions, eq(userTenants.positionId, positions.id))
      .leftJoin(divisions, eq(userTenants.divisionId, divisions.id))
      .leftJoin(teams, eq(userTenants.teamId, teams.id))
      .where(eq(userTenants.tenantId, tenantId));
  }

  async updateMember(userId: string, tenantId: string, updates: Partial<InsertUserTenant> & { name?: string; phoneNumber?: string }): Promise<UserTenant | undefined> {
    const { name, phoneNumber, ...tenantUpdates } = updates;
    return await db.transaction(async (tx) => {
      // 1. Update userTenants if there are tenant-specific updates
      let updatedTenant;
      if (Object.keys(tenantUpdates).length > 0) {
        [updatedTenant] = await tx
          .update(userTenants)
          .set(tenantUpdates as any)
          .where(and(eq(userTenants.userId, userId), eq(userTenants.tenantId, tenantId)))
          .returning();
      } else {
        // Just verify existence if no tenant updates
        [updatedTenant] = await tx
          .select()
          .from(userTenants)
          .where(and(eq(userTenants.userId, userId), eq(userTenants.tenantId, tenantId)));
      }

      if (!updatedTenant) return undefined;

      // 2. Update users table if name or phoneNumber is provided
      if (name !== undefined || phoneNumber !== undefined) {
        await tx
          .update(users)
          .set({
            ...(name !== undefined ? { name } : {}),
            ...(phoneNumber !== undefined ? { phoneNumber } : {})
          })
          .where(eq(users.id, userId));
      }

      return updatedTenant;
    });
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
    const result = await db.select({
      ...getTableColumns(teams),
      memberCount: count(userTenants.id)
    })
      .from(teams)
      .leftJoin(userTenants, eq(teams.id, userTenants.teamId))
      .where(eq(teams.tenantId, tenantId))
      .groupBy(teams.id);

    // Cast memberCount to number as aggregation usually returns string/number depending on driver
    return result.map(t => ({ ...t, memberCount: Number(t.memberCount) }));
  }

  async getTeamsByDivision(divisionId: string, tenantId: string): Promise<Team[]> {
    const result = await db.select({
      ...getTableColumns(teams),
      memberCount: count(userTenants.id)
    })
      .from(teams)
      .leftJoin(userTenants, eq(teams.id, userTenants.teamId))
      .where(and(eq(teams.divisionId, divisionId), eq(teams.tenantId, tenantId)))
      .groupBy(teams.id);

    return result.map(t => ({ ...t, memberCount: Number(t.memberCount) }));
  }

  async getTeam(id: string, tenantId: string): Promise<Team | undefined> {
    const [team] = await db.select().from(teams).where(and(eq(teams.id, id), eq(teams.tenantId, tenantId)));
    return team;
  }

  async createTeam(team: InsertTeam, memberIds?: string[]): Promise<Team> {
    return await db.transaction(async (tx) => {
      const [newTeam] = await tx.insert(teams).values({
        id: randomUUID(),
        ...team,
        memberCount: memberIds ? memberIds.length : (team.memberCount || 0)
      }).returning();

      if (memberIds && memberIds.length > 0) {
        // Update userTenants for these members to belong to this team
        await tx.update(userTenants)
          .set({ teamId: newTeam.id })
          .where(and(
            inArray(userTenants.userId, memberIds),
            eq(userTenants.tenantId, team.tenantId)
          ));
      }

      return newTeam;
    });
  }

  async updateTeam(id: string, updates: Partial<InsertTeam>, tenantId: string, memberIds?: string[]): Promise<Team | undefined> {
    return await db.transaction(async (tx) => {
      const [team] = await tx
        .update(teams)
        .set({
          ...updates,
          memberCount: memberIds ? memberIds.length : updates.memberCount
        })
        .where(and(eq(teams.id, id), eq(teams.tenantId, tenantId)))
        .returning();

      if (!team) return undefined;

      if (memberIds) {
        // 1. Remove all current members from this team
        await tx.update(userTenants)
          .set({ teamId: null })
          .where(and(
            eq(userTenants.teamId, id),
            eq(userTenants.tenantId, tenantId)
          ));

        // 2. Add selected members to this team
        if (memberIds.length > 0) {
          await tx.update(userTenants)
            .set({ teamId: id })
            .where(and(
              inArray(userTenants.userId, memberIds),
              eq(userTenants.tenantId, tenantId)
            ));
        }
      }

      return team;
    });
  }

  async deleteTeam(id: string, tenantId: string): Promise<boolean> {
    const result = await db.delete(teams).where(and(eq(teams.id, id), eq(teams.tenantId, tenantId))).returning();
    return result.length > 0;
  }

  async initializeTeams(): Promise<void> {
    // Initial data handled via migrations/seeds if needed
  }

  async getInventoryItems(tenantId: string): Promise<InventoryItem[]> {
    return db.select().from(inventoryItems).where(eq(inventoryItems.tenantId, tenantId)).orderBy(asc(inventoryItems.productName));
  }

  async getInventoryItem(id: number, tenantId: string): Promise<InventoryItem | undefined> {
    const [item] = await db.select().from(inventoryItems).where(and(eq(inventoryItems.id, id), eq(inventoryItems.tenantId, tenantId)));
    return item;
  }

  async createInventoryItem(item: InsertInventoryItem): Promise<InventoryItem> {
    const [existing] = await db
      .select()
      .from(inventoryItems)
      .where(
        and(
          eq(inventoryItems.tenantId, item.tenantId),
          eq(inventoryItems.productName, item.productName),
          eq(inventoryItems.specification, item.specification),
          eq(inventoryItems.division, item.division || "SKT"),
        )
      );

    if (existing) {
      throw new Error("Item already exists");
    }

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

  async syncInventoryItems(items: InsertInventoryItem[], tenantId: string): Promise<InventoryItem[]> {
    // 1. Get all existing items
    const existingItems = await this.getInventoryItems(tenantId);
    const existingMap = new Map<string, InventoryItem>();

    existingItems.forEach(item => {
      // Key: division|productName|specification
      const key = `${item.division}|${item.productName}|${item.specification}`;
      existingMap.set(key, item);
    });

    const results: InventoryItem[] = [];
    const processedIds = new Set<number>();

    // 2. Upsert (Update existing, Insert new)
    for (const newItem of items) {
      const key = `${newItem.division || "SKT"}|${newItem.productName}|${newItem.specification}`;
      const existing = existingMap.get(key);

      if (existing) {
        // Update
        processedIds.add(existing.id);
        const [updated] = await db
          .update(inventoryItems)
          .set({
            ...newItem,
            // Preserve keys that shouldn't change if not provided?
            // But bulk upload provides full state usually.
            // We definitely want to update stock counts.
          })
          .where(eq(inventoryItems.id, existing.id))
          .returning();
        if (updated) results.push(updated);
      } else {
        // Insert
        const [inserted] = await db.insert(inventoryItems).values(newItem).returning();
        if (inserted) results.push(inserted);
      }
    }

    // 3. Optional: Delete items that were not in the upload
    // Only attempt to delete if they are NOT in processedIds
    const itemsToDelete = existingItems.filter(item => !processedIds.has(item.id));

    for (const item of itemsToDelete) {
      try {
        await db.delete(inventoryItems).where(eq(inventoryItems.id, item.id));
      } catch (e) {
        // Ignore FK constraint violations - simply keep the item if it has history
        console.warn(`Could not delete inventory item ${item.id} (${item.productName}) due to dependencies.`);
      }
    }

    return results;
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

  async getTeamItemStock(
    tenantId: string,
    teamCategory: string,
    productName: string,
    specification: string,
    division: string
  ): Promise<number> {
    const outgoing = await db
      .select({ quantity: outgoingRecords.quantity })
      .from(outgoingRecords)
      .where(
        and(
          eq(outgoingRecords.tenantId, tenantId),
          eq(outgoingRecords.teamCategory, teamCategory),
          eq(outgoingRecords.productName, productName),
          eq(outgoingRecords.specification, specification),
          eq(outgoingRecords.division, division)
        )
      );

    const usage = await db
      .select({ quantity: materialUsageRecords.quantity })
      .from(materialUsageRecords)
      .where(
        and(
          eq(materialUsageRecords.tenantId, tenantId),
          eq(materialUsageRecords.teamCategory, teamCategory),
          eq(materialUsageRecords.productName, productName),
          eq(materialUsageRecords.specification, specification),
          eq(materialUsageRecords.division, division)
        )
      );

    const totalReceived = outgoing.reduce((sum, r) => sum + r.quantity, 0);
    const totalUsed = usage.reduce((sum, r) => sum + r.quantity, 0);

    return totalReceived - totalUsed;
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
