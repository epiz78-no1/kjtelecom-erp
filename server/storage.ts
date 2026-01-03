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
  type OpticalCable, type InsertOpticalCable,
  type OpticalCableLog, type InsertOpticalCableLog,
  users, divisions, teams, inventoryItems, outgoingRecords, materialUsageRecords, incomingRecords,
  positions, invitations, userTenants, opticalCables, opticalCableLogs
} from "../shared/schema.js";
import { db, withTenant } from "./db.js";
import { eq, and, inArray, sql, count, desc, asc, getTableColumns } from "drizzle-orm";
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
  syncInventoryItems(items: InsertInventoryItem[], tenantId: string): Promise<InventoryItem[]>;

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
  calculateInventoryStats(tenantId: string, productName: string, specification: string, division: string): Promise<{ totalIncoming: number; totalSentToTeam: number; totalUsage: number }>;
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

  // Optical Cables
  getOpticalCables(tenantId: string): Promise<(OpticalCable & { logs: OpticalCableLog[] })[]>;
  getOpticalCable(id: string, tenantId: string): Promise<OpticalCable | undefined>;
  createOpticalCable(cable: InsertOpticalCable, tenantId: string): Promise<OpticalCable>;
  updateOpticalCable(id: string, updates: Partial<InsertOpticalCable>, tenantId: string): Promise<OpticalCable | undefined>;
  deleteOpticalCable(id: string, tenantId: string): Promise<boolean>;

  createOpticalCableLog(log: InsertOpticalCableLog, tenantId: string): Promise<OpticalCable>;
  getOpticalCableLogs(cableId: string, tenantId: string): Promise<OpticalCableLog[]>;
}

export class DatabaseStorage implements IStorage {
  // User methods - accessed globally, no RLS needed
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

  // RLS-enabled methods - wrapped in withTenant

  async getPositions(tenantId: string): Promise<Position[]> {
    return withTenant(tenantId, (tx) =>
      tx.select().from(positions).where(eq(positions.tenantId, tenantId)).orderBy(positions.rankOrder)
    );
  }

  async getPosition(id: string, tenantId: string): Promise<Position | undefined> {
    return withTenant(tenantId, async (tx) => {
      const [position] = await tx.select().from(positions).where(eq(positions.id, id));
      return position;
    });
  }

  async createPosition(position: InsertPosition): Promise<Position> {
    return withTenant(position.tenantId, async (tx) => {
      const [newPosition] = await tx.insert(positions).values({
        id: randomUUID(),
        ...position
      }).returning();
      return newPosition;
    });
  }

  async updatePosition(id: string, updates: Partial<InsertPosition>, tenantId: string): Promise<Position | undefined> {
    return withTenant(tenantId, async (tx) => {
      const [updated] = await tx.update(positions).set(updates).where(eq(positions.id, id)).returning();
      return updated;
    });
  }

  async deletePosition(id: string, tenantId: string): Promise<boolean> {
    return withTenant(tenantId, async (tx) => {
      const result = await tx.delete(positions).where(eq(positions.id, id)).returning();
      return result.length > 0;
    });
  }

  async getMembers(tenantId: string): Promise<any[]> {
    // Note: accessing userTenants, users, positions, divisions, teams
    // Users table is global (no RLS)
    // Other tables have RLS
    // userTenants: currently NO RLS in enable_rls.sql (Exempt)
    return withTenant(tenantId, (tx) =>
      tx.select({
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
        .where(
          and(
            eq(userTenants.tenantId, tenantId),
            sql`${users.username} != 'admin'`
          )
        ) // Hide superadmin from list, filter by tenant explicitly
    );
  }

  async updateMember(userId: string, tenantId: string, updates: Partial<InsertUserTenant> & { name?: string; phoneNumber?: string }): Promise<UserTenant | undefined> {
    const { name, phoneNumber, ...tenantUpdates } = updates;
    console.log("[STORAGE] updateMember called:", { userId, tenantId, updates, tenantUpdates });

    return withTenant(tenantId, async (tx) => {
      // 1. Update userTenants if there are tenant-specific updates
      let updatedTenant;
      if (Object.keys(tenantUpdates).length > 0) {
        console.log("[STORAGE] Updating userTenants with:", tenantUpdates);
        [updatedTenant] = await tx
          .update(userTenants)
          .set(tenantUpdates as any)
          .where(and(eq(userTenants.userId, userId), eq(userTenants.tenantId, tenantId)))
          .returning();
        console.log("[STORAGE] Updated tenant:", updatedTenant);
      } else {
        // Just verify existence if no tenant updates
        [updatedTenant] = await tx
          .select()
          .from(userTenants)
          .where(and(eq(userTenants.userId, userId), eq(userTenants.tenantId, tenantId)));
      }

      if (!updatedTenant) return undefined;

      // 2. Update users table if name or phoneNumber is provided
      // Users table has NO RLS, so we can update it freely (assuming app logic allows it)
      if (name !== undefined || phoneNumber !== undefined) {
        console.log("[STORAGE] Updating users table:", { name, phoneNumber });
        await tx
          .update(users)
          .set({
            ...(name !== undefined ? { name } : {}),
            ...(phoneNumber !== undefined ? { phoneNumber } : {})
          })
          .where(eq(users.id, userId));
      }

      console.log("[STORAGE] Final updatedTenant:", updatedTenant);
      return updatedTenant;
    });
  }

  async deleteMember(userId: string, tenantId: string): Promise<boolean> {
    return withTenant(tenantId, async (tx) => {
      const result = await tx.delete(userTenants).where(and(eq(userTenants.userId, userId), eq(userTenants.tenantId, tenantId))).returning();
      return result.length > 0;
    });
  }

  async getInvitations(tenantId: string): Promise<Invitation[]> {
    return withTenant(tenantId, (tx) =>
      tx.select().from(invitations).where(eq(invitations.tenantId, tenantId))
    );
  }

  // Tokens are unique globally, so finding by token doesn't need tenantId initially
  async getInvitationByToken(token: string): Promise<Invitation | undefined> {
    const [inv] = await db.select().from(invitations).where(eq(invitations.token, token));
    return inv;
  }

  async createInvitation(invitation: InsertInvitation): Promise<Invitation> {
    return withTenant(invitation.tenantId, async (tx) => {
      const [newInv] = await tx.insert(invitations).values({
        id: randomUUID(),
        ...invitation
      }).returning();
      return newInv;
    });
  }

  async updateInvitationStatus(id: string, status: string): Promise<void> {
    await db.update(invitations).set({ status }).where(eq(invitations.id, id));
  }

  async deleteInvitation(id: string, tenantId: string): Promise<boolean> {
    return withTenant(tenantId, async (tx) => {
      const result = await tx.delete(invitations).where(eq(invitations.id, id)).returning();
      return result.length > 0;
    });
  }

  async getDivisions(tenantId: string): Promise<Division[]> {
    return withTenant(tenantId, (tx) =>
      tx.select().from(divisions).where(eq(divisions.tenantId, tenantId))
    );
  }

  async getDivision(id: string, tenantId: string): Promise<Division | undefined> {
    return withTenant(tenantId, async (tx) => {
      const [division] = await tx.select().from(divisions).where(eq(divisions.id, id));
      return division;
    });
  }

  async createDivision(name: string, tenantId: string): Promise<Division> {
    return withTenant(tenantId, async (tx) => {
      const id = `div${Date.now()}`;
      const [division] = await tx.insert(divisions).values({ id, name, tenantId }).returning();
      return division;
    });
  }

  async updateDivision(id: string, name: string, tenantId: string): Promise<Division | undefined> {
    return withTenant(tenantId, async (tx) => {
      const [division] = await tx
        .update(divisions)
        .set({ name })
        .where(eq(divisions.id, id))
        .returning();
      return division;
    });
  }

  async deleteDivision(id: string, tenantId: string): Promise<boolean> {
    return withTenant(tenantId, async (tx) => {
      const result = await tx.delete(divisions).where(eq(divisions.id, id)).returning();
      return result.length > 0;
    });
  }

  async initializeDivisions(): Promise<void> {
  }

  async getTeams(tenantId: string): Promise<Team[]> {
    return withTenant(tenantId, async (tx) => {
      const result = await tx.select({
        ...getTableColumns(teams),
        memberCount: count(userTenants.id)
      })
        .from(teams)
        .leftJoin(userTenants, eq(teams.id, userTenants.teamId))
        .where(eq(teams.tenantId, tenantId))
        .groupBy(teams.id)
        .orderBy(sql`${teams.lastActivity} DESC NULLS LAST`);

      return result.map((t: any) => ({ ...t, memberCount: Number(t.memberCount) }));
    });
  }

  async getTeamsByDivision(divisionId: string, tenantId: string): Promise<Team[]> {
    return withTenant(tenantId, async (tx) => {
      const result = await tx.select({
        ...getTableColumns(teams),
        memberCount: count(userTenants.id)
      })
        .from(teams)
        .leftJoin(userTenants, eq(teams.id, userTenants.teamId))
        .where(and(
          eq(teams.divisionId, divisionId),
          eq(teams.tenantId, tenantId)
        ))
        .groupBy(teams.id)
        .orderBy(sql`${teams.lastActivity} DESC NULLS LAST`);

      return result.map((t: any) => ({ ...t, memberCount: Number(t.memberCount) }));
    });
  }

  async getTeam(id: string, tenantId: string): Promise<Team | undefined> {
    return withTenant(tenantId, async (tx) => {
      const [team] = await tx.select().from(teams).where(eq(teams.id, id));
      return team;
    });
  }

  async createTeam(team: InsertTeam, memberIds?: string[]): Promise<Team> {
    return withTenant(team.tenantId, async (tx) => {
      const [newTeam] = await tx.insert(teams).values({
        id: randomUUID(),
        ...team,
        memberCount: memberIds ? memberIds.length : (team.memberCount || 0)
      }).returning();

      if (memberIds && memberIds.length > 0) {
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
    return withTenant(tenantId, async (tx) => {
      const [team] = await tx
        .update(teams)
        .set({
          ...updates,
          memberCount: memberIds ? memberIds.length : updates.memberCount
        })
        .where(eq(teams.id, id))
        .returning();

      if (!team) return undefined;

      if (memberIds) {
        await tx.update(userTenants)
          .set({ teamId: null })
          .where(and(
            eq(userTenants.teamId, id),
            eq(userTenants.tenantId, tenantId)
          ));

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
    return withTenant(tenantId, async (tx) => {
      const result = await tx.delete(teams).where(eq(teams.id, id)).returning();
      return result.length > 0;
    });
  }

  async initializeTeams(): Promise<void> {
  }

  async getInventoryItems(tenantId: string): Promise<InventoryItem[]> {
    return withTenant(tenantId, (tx) =>
      tx.select().from(inventoryItems).where(eq(inventoryItems.tenantId, tenantId)).orderBy(asc(inventoryItems.productName))
    );
  }

  async getInventoryItem(id: number, tenantId: string): Promise<InventoryItem | undefined> {
    return withTenant(tenantId, async (tx) => {
      const [item] = await tx.select().from(inventoryItems).where(eq(inventoryItems.id, id));
      return item;
    });
  }

  async createInventoryItem(item: InsertInventoryItem): Promise<InventoryItem> {
    return withTenant(item.tenantId, async (tx) => {
      const [existing] = await tx
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

      const [newItem] = await tx.insert(inventoryItems).values(item).returning();
      return newItem;
    });
  }

  async updateInventoryItem(id: number, updates: Partial<InsertInventoryItem>, tenantId: string): Promise<InventoryItem | undefined> {
    return withTenant(tenantId, async (tx) => {
      const [item] = await tx
        .update(inventoryItems)
        .set(updates)
        .where(eq(inventoryItems.id, id))
        .returning();
      return item;
    });
  }

  async deleteInventoryItem(id: number, tenantId: string): Promise<boolean> {
    return withTenant(tenantId, async (tx) => {
      const result = await tx.delete(inventoryItems).where(eq(inventoryItems.id, id)).returning();
      return result.length > 0;
    });
  }

  async bulkDeleteInventoryItems(ids: number[], tenantId: string): Promise<number> {
    if (ids.length === 0) return 0;
    return withTenant(tenantId, async (tx) => {
      const result = await tx.delete(inventoryItems).where(inArray(inventoryItems.id, ids)).returning();
      return result.length;
    });
  }

  async clearInventoryItems(tenantId: string): Promise<void> {
    return withTenant(tenantId, async (tx) => {
      await tx.delete(inventoryItems);
    });
  }

  async bulkCreateInventoryItems(items: InsertInventoryItem[]): Promise<InventoryItem[]> {
    if (items.length === 0) return [];
    // Assuming all items belong to same tenant. Pick first one's tenantId.
    const tenantId = items[0].tenantId;
    return withTenant(tenantId, async (tx) => {
      const result = await tx.insert(inventoryItems).values(items).returning();
      return result;
    });
  }

  async getOutgoingRecords(tenantId: string): Promise<OutgoingRecord[]> {
    return withTenant(tenantId, (tx) =>
      tx.select({
        id: outgoingRecords.id,
        tenantId: outgoingRecords.tenantId,
        date: outgoingRecords.date,
        division: outgoingRecords.division,
        category: outgoingRecords.category,
        teamCategory: outgoingRecords.teamCategory,
        productName: outgoingRecords.productName,
        specification: outgoingRecords.specification,
        attributes: outgoingRecords.attributes,
        quantity: outgoingRecords.quantity,
        recipient: outgoingRecords.recipient,
        remark: outgoingRecords.remark,
        inventoryItemId: outgoingRecords.inventoryItemId,
        createdBy: outgoingRecords.createdBy,
        createdByName: users.name,
      })
        .from(outgoingRecords)
        .leftJoin(users, eq(outgoingRecords.createdBy, users.id))
        .where(eq(outgoingRecords.tenantId, tenantId))
    );
  }

  async getOutgoingRecord(id: number, tenantId: string): Promise<OutgoingRecord | undefined> {
    return withTenant(tenantId, async (tx) => {
      const [record] = await tx.select().from(outgoingRecords).where(eq(outgoingRecords.id, id));
      return record;
    });
  }

  async createOutgoingRecord(record: InsertOutgoingRecord): Promise<OutgoingRecord> {
    return withTenant(record.tenantId, async (tx) => {
      const [newRecord] = await tx.insert(outgoingRecords).values(record).returning();
      return newRecord;
    });
  }

  async updateOutgoingRecord(id: number, updates: Partial<InsertOutgoingRecord>, tenantId: string): Promise<OutgoingRecord | undefined> {
    return withTenant(tenantId, async (tx) => {
      const [record] = await tx
        .update(outgoingRecords)
        .set(updates)
        .where(eq(outgoingRecords.id, id))
        .returning();
      return record;
    });
  }

  async deleteOutgoingRecord(id: number, tenantId: string): Promise<boolean> {
    return withTenant(tenantId, async (tx) => {
      const result = await tx.delete(outgoingRecords).where(eq(outgoingRecords.id, id)).returning();
      return result.length > 0;
    });
  }

  async bulkDeleteOutgoingRecords(ids: number[], tenantId: string): Promise<number> {
    if (ids.length === 0) return 0;
    return withTenant(tenantId, async (tx) => {
      const result = await tx.delete(outgoingRecords).where(inArray(outgoingRecords.id, ids)).returning();
      return result.length;
    });
  }

  async clearOutgoingRecords(tenantId: string): Promise<void> {
    return withTenant(tenantId, async (tx) => {
      await tx.delete(outgoingRecords);
    });
  }

  async initializeOutgoingRecords(): Promise<void> {
  }

  async getMaterialUsageRecords(tenantId: string): Promise<MaterialUsageRecord[]> {
    return withTenant(tenantId, (tx) =>
      tx.select({
        id: materialUsageRecords.id,
        tenantId: materialUsageRecords.tenantId,
        date: materialUsageRecords.date,
        division: materialUsageRecords.division,
        category: materialUsageRecords.category,
        productName: materialUsageRecords.productName,
        specification: materialUsageRecords.specification,
        attributes: materialUsageRecords.attributes,
        quantity: materialUsageRecords.quantity,
        recipient: materialUsageRecords.recipient,
        remark: materialUsageRecords.remark,
        inventoryItemId: materialUsageRecords.inventoryItemId,
        createdBy: materialUsageRecords.createdBy,
        createdByName: users.name,
      })
        .from(materialUsageRecords)
        .leftJoin(users, eq(materialUsageRecords.createdBy, users.id))
        .where(eq(materialUsageRecords.tenantId, tenantId))
    );
  }

  async getMaterialUsageRecord(id: number, tenantId: string): Promise<MaterialUsageRecord | undefined> {
    return withTenant(tenantId, async (tx) => {
      const [record] = await tx.select().from(materialUsageRecords).where(eq(materialUsageRecords.id, id));
      return record;
    });
  }

  async createMaterialUsageRecord(record: InsertMaterialUsageRecord): Promise<MaterialUsageRecord> {
    return withTenant(record.tenantId, async (tx) => {
      const [newRecord] = await tx.insert(materialUsageRecords).values(record).returning();
      return newRecord;
    });
  }

  async updateMaterialUsageRecord(id: number, updates: Partial<InsertMaterialUsageRecord>, tenantId: string): Promise<MaterialUsageRecord | undefined> {
    return withTenant(tenantId, async (tx) => {
      const [record] = await tx
        .update(materialUsageRecords)
        .set(updates)
        .where(eq(materialUsageRecords.id, id))
        .returning();
      return record;
    });
  }

  async deleteMaterialUsageRecord(id: number, tenantId: string): Promise<boolean> {
    return withTenant(tenantId, async (tx) => {
      const result = await tx.delete(materialUsageRecords).where(eq(materialUsageRecords.id, id)).returning();
      return result.length > 0;
    });
  }

  async bulkDeleteMaterialUsageRecords(ids: number[], tenantId: string): Promise<number> {
    if (ids.length === 0) return 0;
    return withTenant(tenantId, async (tx) => {
      const result = await tx.delete(materialUsageRecords).where(inArray(materialUsageRecords.id, ids)).returning();
      return result.length;
    });
  }

  async getTeamItemStock(
    tenantId: string,
    teamCategory: string,
    productName: string,
    specification: string,
    division: string
  ): Promise<number> {
    return withTenant(tenantId, async (tx) => {
      const outgoing = await tx
        .select({ quantity: outgoingRecords.quantity })
        .from(outgoingRecords)
        .where(and(
          eq(outgoingRecords.tenantId, tenantId),
          eq(outgoingRecords.teamCategory, teamCategory),
          eq(outgoingRecords.productName, productName),
          eq(outgoingRecords.specification, specification),
          eq(outgoingRecords.division, division)
        ));

      const usage = await tx
        .select({ quantity: materialUsageRecords.quantity })
        .from(materialUsageRecords)
        .where(and(
          eq(materialUsageRecords.tenantId, tenantId),
          eq(materialUsageRecords.teamCategory, teamCategory),
          eq(materialUsageRecords.productName, productName),
          eq(materialUsageRecords.specification, specification),
          eq(materialUsageRecords.division, division)
        ));

      const totalReceived = outgoing.reduce((sum: number, r: any) => sum + r.quantity, 0);
      const totalUsed = usage.reduce((sum: number, r: any) => sum + r.quantity, 0);

      return totalReceived - totalUsed;
    });
  }

  async getIncomingRecords(tenantId: string): Promise<IncomingRecord[]> {
    return withTenant(tenantId, (tx) =>
      tx.select({
        id: incomingRecords.id,
        tenantId: incomingRecords.tenantId,
        date: incomingRecords.date,
        division: incomingRecords.division,
        category: incomingRecords.category,
        supplier: incomingRecords.supplier,
        projectName: incomingRecords.projectName,
        productName: incomingRecords.productName,
        specification: incomingRecords.specification,
        attributes: incomingRecords.attributes,
        quantity: incomingRecords.quantity,
        unitPrice: incomingRecords.unitPrice,
        remark: incomingRecords.remark,
        inventoryItemId: incomingRecords.inventoryItemId,
        createdBy: incomingRecords.createdBy,
        createdByName: users.name,
      })
        .from(incomingRecords)
        .leftJoin(users, eq(incomingRecords.createdBy, users.id))
        .where(eq(incomingRecords.tenantId, tenantId))
    );
  }

  async getIncomingRecord(id: number, tenantId: string): Promise<IncomingRecord | undefined> {
    return withTenant(tenantId, async (tx) => {
      const [record] = await tx.select().from(incomingRecords).where(eq(incomingRecords.id, id));
      return record;
    });
  }

  async createIncomingRecord(record: InsertIncomingRecord): Promise<IncomingRecord> {
    return withTenant(record.tenantId, async (tx) => {
      const [newRecord] = await tx.insert(incomingRecords).values(record).returning();
      return newRecord;
    });
  }

  async updateIncomingRecord(id: number, updates: Partial<InsertIncomingRecord>, tenantId: string): Promise<IncomingRecord | undefined> {
    return withTenant(tenantId, async (tx) => {
      const [record] = await tx
        .update(incomingRecords)
        .set(updates)
        .where(eq(incomingRecords.id, id))
        .returning();
      return record;
    });
  }

  async deleteIncomingRecord(id: number, tenantId: string): Promise<boolean> {
    return withTenant(tenantId, async (tx) => {
      const result = await tx.delete(incomingRecords).where(eq(incomingRecords.id, id)).returning();
      return result.length > 0;
    });
  }

  async bulkDeleteIncomingRecords(ids: number[], tenantId: string): Promise<number> {
    if (ids.length === 0) return 0;
    return withTenant(tenantId, async (tx) => {
      const result = await tx.delete(incomingRecords).where(inArray(incomingRecords.id, ids)).returning();
      return result.length;
    });
  }

  async syncInventoryItems(items: InsertInventoryItem[], tenantId: string): Promise<InventoryItem[]> {
    return withTenant(tenantId, async (tx) => {
      const results: InventoryItem[] = [];
      for (const item of items) {
        const [existing] = await tx
          .select()
          .from(inventoryItems)
          .where(
            and(
              eq(inventoryItems.tenantId, tenantId),
              eq(inventoryItems.productName, item.productName),
              eq(inventoryItems.specification, item.specification),
              eq(inventoryItems.division, item.division || "SKT"),
            )
          );

        if (existing) {
          const [updated] = await tx
            .update(inventoryItems)
            .set(item)
            .where(eq(inventoryItems.id, existing.id))
            .returning();
          results.push(updated);
        } else {
          const [created] = await tx
            .insert(inventoryItems)
            .values({ ...item, tenantId })
            .returning();
          results.push(created);
        }
      }
      return results;
    });
  }
  async calculateInventoryStats(tenantId: string, productName: string, specification: string, division: string): Promise<{ totalIncoming: number; totalSentToTeam: number; totalUsage: number }> {
    return withTenant(tenantId, async (tx) => {
      // 1. Total Incoming
      const [incomingResult] = await tx
        .select({ sum: sql<number>`coalesce(sum(${incomingRecords.quantity}), 0)` })
        .from(incomingRecords)
        .where(and(
          eq(incomingRecords.productName, productName),
          eq(incomingRecords.specification, specification),
          eq(incomingRecords.division, division),
          eq(incomingRecords.tenantId, tenantId)
        ));

      // 2. Total Outgoing (Sent to Team)
      const [outgoingResult] = await tx
        .select({ sum: sql<number>`coalesce(sum(${outgoingRecords.quantity}), 0)` })
        .from(outgoingRecords)
        .where(and(
          eq(outgoingRecords.productName, productName),
          eq(outgoingRecords.specification, specification),
          eq(outgoingRecords.division, division),
          eq(outgoingRecords.tenantId, tenantId)
        ));

      // 3. Total Usage
      const [usageResult] = await tx
        .select({ sum: sql<number>`coalesce(sum(${materialUsageRecords.quantity}), 0)` })
        .from(materialUsageRecords)
        .where(and(
          eq(materialUsageRecords.productName, productName),
          eq(materialUsageRecords.specification, specification),
          eq(materialUsageRecords.division, division),
          eq(materialUsageRecords.tenantId, tenantId)
        ));

      return {
        totalIncoming: Number(incomingResult?.sum || 0),
        totalSentToTeam: Number(outgoingResult?.sum || 0),
        totalUsage: Number(usageResult?.sum || 0)
      };
    });
  }

  // Optical Cable Implementations
  async getOpticalCables(tenantId: string): Promise<(OpticalCable & { logs: OpticalCableLog[] })[]> {
    return await withTenant(tenantId, (tx) => {
      return tx.query.opticalCables.findMany({
        where: eq(opticalCables.tenantId, tenantId),
        with: { logs: true },
        orderBy: [desc(opticalCables.createdAt)]
      });
    });
  }

  async getOpticalCable(id: string, tenantId: string): Promise<OpticalCable | undefined> {
    const [result] = await withTenant(tenantId, (tx) => {
      return tx.select().from(opticalCables)
        .where(and(eq(opticalCables.id, id), eq(opticalCables.tenantId, tenantId)));
    }) as [OpticalCable | undefined];
    return result;
  }

  async createOpticalCable(cable: InsertOpticalCable, tenantId: string): Promise<OpticalCable> {
    return await db.transaction(async (tx) => {
      // 1. Create Cable
      const [newCable] = await tx.insert(opticalCables).values({
        ...cable,
        tenantId,
        remainingLength: Number(cable.totalLength),
        status: "in_stock",
      }).returning();

      // 2. Create 'Receive' Log
      await tx.insert(opticalCableLogs).values({
        tenantId,
        cableId: newCable.id,
        logType: 'receive',
        usageDate: newCable.receivedDate || new Date().toISOString().split('T')[0],
        workerName: 'System',
        beforeRemaining: 0,
        afterRemaining: Number(newCable.totalLength),
        usedLength: 0
      });

      return newCable;
    });
  }

  async createOpticalCablesBulk(cables: InsertOpticalCable[], tenantId: string): Promise<OpticalCable[]> {
    return await db.transaction(async (tx) => {
      const results: OpticalCable[] = [];
      for (const cable of cables) {
        // 1. Create Cable
        const [newCable] = await tx.insert(opticalCables).values({
          ...cable,
          tenantId,
          remainingLength: cable.remainingLength ?? Number(cable.totalLength),
          status: "in_stock",
        }).returning();

        // 2. Create 'Receive' Log
        await tx.insert(opticalCableLogs).values({
          tenantId,
          cableId: newCable.id,
          logType: 'receive',
          usageDate: newCable.receivedDate || new Date().toISOString().split('T')[0],
          workerName: 'System (Bulk)',
          beforeRemaining: 0,
          afterRemaining: newCable.remainingLength,
          usedLength: 0,
          createdBy: cable.createdBy
        });

        results.push(newCable);
      }
      return results;
    });
  }

  async updateOpticalCable(id: string, updates: Partial<InsertOpticalCable>, tenantId: string): Promise<OpticalCable | undefined> {
    const [result] = await withTenant(tenantId, (tx) => {
      return tx.update(opticalCables)
        .set({ ...updates, updatedAt: new Date() })
        .where(and(eq(opticalCables.id, id), eq(opticalCables.tenantId, tenantId)))
        .returning();
    }) as [OpticalCable | undefined];
    return result;
  }

  async bulkDeleteOpticalCables(ids: string[], tenantId: string): Promise<void> {
    await db.delete(opticalCables)
      .where(
        and(
          inArray(opticalCables.id, ids),
          eq(opticalCables.tenantId, tenantId)
        )
      );
  }

  async deleteOpticalCable(id: string, tenantId: string): Promise<boolean> {
    await withTenant(tenantId, async (tx) => {
      await tx.delete(opticalCables)
        .where(and(eq(opticalCables.id, id), eq(opticalCables.tenantId, tenantId)));
    });
    return true;
  }

  async bulkDeleteOpticalCableLogs(ids: string[], tenantId: string): Promise<void> {
    await db.delete(opticalCableLogs)
      .where(
        and(
          inArray(opticalCableLogs.id, ids),
          eq(opticalCableLogs.tenantId, tenantId)
        )
      );
  }

  // createOpticalCableLog has been moved to the bottom with transaction support


  async getOpticalCableLogs(cableId: string, tenantId: string): Promise<OpticalCableLog[]> {
    return await withTenant(tenantId, (tx) => {
      return tx.select().from(opticalCableLogs)
        .where(and(eq(opticalCableLogs.cableId, cableId), eq(opticalCableLogs.tenantId, tenantId)))
        .orderBy(desc(opticalCableLogs.createdAt));
    });
  }

  async getAllOpticalCableLogs(tenantId: string): Promise<(OpticalCableLog & { cable: OpticalCable | null })[]> {
    // Join with opticalCables to get cable details (drumNo, spec, etc)
    const results = await db.select({
      log: opticalCableLogs,
      cable: opticalCables
    })
      .from(opticalCableLogs)
      .leftJoin(opticalCables, eq(opticalCableLogs.cableId, opticalCables.id))
      .where(eq(opticalCableLogs.tenantId, tenantId))
      .orderBy(desc(opticalCableLogs.createdAt));

    return results.map(({ log, cable }) => ({
      ...log,
      cable: cable
    }));
  }

  async createOpticalCableLog(log: InsertOpticalCableLog, tenantId: string): Promise<OpticalCable> {
    return await db.transaction(async (tx) => {
      // 1. Get current cable
      const [cable] = await tx.select().from(opticalCables)
        .where(and(eq(opticalCables.id, log.cableId), eq(opticalCables.tenantId, tenantId)));

      if (!cable) throw new Error("Cable not found");

      let updates: Partial<typeof opticalCables.$inferInsert> = { updatedAt: new Date() };
      let finalUsed = cable.usedLength;

      // totalLength는 DB에서 text일 수 있으므로 숫자로 변환
      const totalLen = Number(cable.totalLength);
      let finalRemaining = cable.remainingLength;

      // 2. Determine updates based on log type
      if (log.logType === 'assign') {
        // 불출: 팀 할당, 상태 변경
        if (!log.teamId) throw new Error("Team ID is required for assignment");
        updates.currentTeamId = log.teamId;
        updates.status = 'assigned';
      } else if (log.logType === 'return') {
        // 반납: 팀 해제, 상태 변경 (창고)
        updates.currentTeamId = null;
        updates.status = 'in_stock';
      } else if (log.logType === 'usage') {
        // 사용: 길이 차감
        // 설치 길이와 폐기 길이를 합쳐서 총 사용량 계산
        const usageAmount = (log.installLength || 0) + (log.wasteLength || 0);
        finalUsed += usageAmount;
        finalRemaining = totalLen - finalUsed;

        updates.usedLength = finalUsed;
        updates.remainingLength = finalRemaining;

        // 잔량이 0 이하면 사용 완료 처리
        if (finalRemaining <= 0) {
          updates.status = 'used_up';
        }
      } else if (log.logType === 'waste') {
        // 폐기: 상태 변경
        updates.status = 'waste';
      }

      // 3. Update Cable
      const [updatedCable] = await tx.update(opticalCables)
        .set(updates)
        .where(eq(opticalCables.id, log.cableId))
        .returning();

      // 4. Create Log
      await tx.insert(opticalCableLogs).values({
        ...log,
        tenantId,
        // 사용(usage)인 경우에만 계산된 값 사용, 나머지는 0
        usedLength: log.logType === 'usage' ? ((log.installLength || 0) + (log.wasteLength || 0)) : 0,
        beforeRemaining: cable.remainingLength,
        afterRemaining: finalRemaining
      });

      return updatedCable;
    });
  }
}

export const storage = new DatabaseStorage();
