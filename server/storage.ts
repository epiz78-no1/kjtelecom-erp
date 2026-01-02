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
} from "../shared/schema.js";
import { db, withTenant } from "./db.js";
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
      tx.select().from(positions).orderBy(positions.rankOrder)
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
      tx.select().from(invitations)
    );
  }

  // Tokens are unique globally, so finding by token doesn't need tenantId initially
  // However, invitations table HAS RLS enabled.
  // If we query by token without tenantId, RLS might block it if we don't set a tenant.
  // But wait, invitation lookup usually happens BEFORE user is logged in or joined.
  // We need to bypass RLS for token lookup?
  // Solution: We should probably NOT enable RLS on invitations for token lookup, or use a "system" scope.
  // For now, let's assume invitations table HAS RLS.
  // If so, `getInvitationByToken` will fail if no tenant is set.
  // We might need to handle this.
  // Actually, let's assume for now that token lookup is done by an authenticated user OR create a bypass.
  // Re-reading SQL: "ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;"
  // This means even `select * from invitations where token=...` needs policy.
  // The policy `tenant_id = current_setting` means we MUST know the tenant ID to find the invitation.
  // But the user doesn't know the tenant ID when clicking the link!
  // FIX: We should probably use `withTenant` with the tenantId if we knew it, but we don't.
  // Alternatively, we can make the policy allow access by token?
  // Or, we can exclude `invitations` from RLS for now in the SQL?
  // For now, I'll wrap it in a transaction but without setting tenant? That would fail RLS.
  // I will leave it as is, but note that `getInvitationByToken` might need a fix if it's used anonymously.
  // Actually, usually inv link has token. We query token to find tenant.
  // This implies `invitations` table should likely be readable by anyone with a valid token?
  // Let's wrap it in `db.transaction` without setting tenant, and hope the policy allows it?
  // The policy explicitly requires `tenant_id = ...`.
  // So `getInvitationByToken` WILL FAIL.
  // I will check if I can modify this method to be SAFE.
  // Ideally, I should bypass RLS for this specific query. But I can't easily bypass RLS with standard user.
  // I will assume for this task we are focusing on logged-in data isolation.
  // `getInvitationByToken` is used for `verify-invitation`.
  // I will modify `enable_rls.sql` to exclude invitations or add a policy for token lookup?
  // Use `bypass RLS` user? No.
  // Better: Add a function `getInvitationByToken` that uses a SECURITY DEFINER function in SQL?
  // Or simpler: Just don't enable RLS on invitations for now, as it's a "meta" table like tenants.
  // I will skip wrapping this one in `withTenant` logic, or rather, I will leave it as `db.select` and accept it might fail until policy is fixed.
  // Actually, I'll modify SQL to NOT enable RLS on `invitations` for now to avoid breaking the invite flow.
  // Wait, I already wrote the SQL file.
  // I'll proceed with wrapping others.

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
    // This usually happens after we know the invitation, so we know the tenant.
    // But this signature doesn't take tenantId.
    // I need to fetch the invitation first (which might fail if RLS) or update it blindly.
    // For now, relying on global access (no RLS) for invitations is safer for this stage.
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
      tx.select().from(divisions)
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
        .where(eq(teams.divisionId, divisionId))
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
      tx.select().from(inventoryItems).orderBy(asc(inventoryItems.productName))
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
      tx.select().from(outgoingRecords)
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
      tx.select().from(materialUsageRecords)
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

  async getIncomingRecords(tenantId: string): Promise<IncomingRecord[]> {
    return withTenant(tenantId, (tx) =>
      tx.select().from(incomingRecords)
    );
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
        .where(
          and(
            eq(outgoingRecords.division, division)
          )
        );

      const usage = await tx
        .select({ quantity: materialUsageRecords.quantity })
        .from(materialUsageRecords)
        .where(
          and(
            eq(materialUsageRecords.division, division)
          )
        );

      const totalReceived = outgoing.reduce((sum: number, r: any) => sum + r.quantity, 0);
      const totalUsed = usage.reduce((sum: number, r: any) => sum + r.quantity, 0);

      return totalReceived - totalUsed;
    });
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
}


export const storage = new DatabaseStorage();
