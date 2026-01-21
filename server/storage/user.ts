import {
    type User, type InsertUser,
    type Invitation, type InsertInvitation,
    type UserTenant, type InsertUserTenant,
    users, invitations, userTenants, tenants, divisions, teams, positions
} from "../../shared/schema.js";
import { db } from "../db.js";
import { eq, and } from "drizzle-orm";
import { randomUUID } from "crypto";

export class UserStorage {
    async getUser(id: string): Promise<User | undefined> {
        return await db.query.users.findFirst({
            where: eq(users.id, id),
        });
    }

    async getUserByUsername(username: string): Promise<User | undefined> {
        return await db.query.users.findFirst({
            where: eq(users.username, username),
        });
    }

    async createUser(insertUser: InsertUser): Promise<User> {
        const [user] = await db.insert(users).values(insertUser).returning();
        return user;
    }

    // Admin: Invitations
    async getInvitations(tenantId: string): Promise<Invitation[]> {
        return await db.select().from(invitations).where(eq(invitations.tenantId, tenantId));
    }

    async getInvitationByToken(token: string): Promise<Invitation | undefined> {
        return await db.query.invitations.findFirst({
            where: eq(invitations.token, token)
        });
    }

    async createInvitation(invitation: InsertInvitation): Promise<Invitation> {
        // Generate secure token if not provided
        const token = invitation.token || randomUUID();
        const [newInvitation] = await db.insert(invitations).values({
            ...invitation,
            token,
            status: 'pending'
        }).returning();
        return newInvitation;
    }

    async updateInvitationStatus(id: string, status: string): Promise<void> {
        await db.update(invitations)
            .set({ status })
            .where(eq(invitations.id, id));
    }

    async deleteInvitation(id: string, tenantId: string): Promise<boolean> {
        const [deleted] = await db.delete(invitations)
            .where(and(eq(invitations.id, id), eq(invitations.tenantId, tenantId)))
            .returning();
        return !!deleted;
    }

    // Admin: Members
    async getMembers(tenantId: string): Promise<any[]> {
        const members = await db
            .select({
                id: users.id,
                username: users.username,
                name: users.name,
                phoneNumber: users.phoneNumber,
                role: userTenants.role,
                permissions: userTenants.permissions,
                status: userTenants.status,
                lastLoginAt: users.lastLoginAt,
                createdAt: userTenants.createdAt,
                divisionId: userTenants.divisionId,
                teamId: userTenants.teamId,
                positionId: userTenants.positionId,
            })
            .from(userTenants)
            .innerJoin(users, eq(userTenants.userId, users.id))
            .where(and(
                eq(userTenants.tenantId, tenantId),
                eq(userTenants.status, 'active')
            ));

        // Fetch divisions, teams, and positions for mapping
        const allDivisions = await db.select().from(divisions).where(eq(divisions.tenantId, tenantId));
        const allTeams = await db.select().from(teams).where(eq(teams.tenantId, tenantId));
        const allPositions = await db.select().from(positions).where(eq(positions.tenantId, tenantId));

        const divisionMap = new Map(allDivisions.map(d => [d.id, d.name]));
        const teamMap = new Map(allTeams.map(t => [t.id, t.name]));
        const positionMap = new Map(allPositions.map(p => [p.id, p.name]));

        return members.map(m => ({
            ...m,
            joinDate: m.createdAt,
            divisionName: m.divisionId ? divisionMap.get(m.divisionId) : null,
            teamName: m.teamId ? teamMap.get(m.teamId) : null,
            positionName: m.positionId ? positionMap.get(m.positionId) : null,
        }));
    }

    async updateMember(userId: string, tenantId: string, updates: Partial<InsertUserTenant> & { name?: string; phoneNumber?: string }): Promise<UserTenant | undefined> {
        return await db.transaction(async (tx) => {
            // 1. Update user profile if needed
            if (updates.name || updates.phoneNumber) {
                const userUpdates: any = {};
                if (updates.name) userUpdates.name = updates.name;
                // phoneNumber is not in the users schema currently based on types, ignoring if not exists, 
                // but assuming it might be added or user wanted it. 
                // Checking schema: users has only {id, username, password, name, lastLoginAt}
                // So we only update name.
                if (updates.name) {
                    await tx.update(users)
                        .set({ name: updates.name })
                        .where(eq(users.id, userId));
                }
            }

            // 2. Update userTenant relation
            const tenantUpdates: any = {};
            if (updates.role) tenantUpdates.role = updates.role;
            if (updates.permissions) tenantUpdates.permissions = updates.permissions;
            if (updates.divisionId !== undefined) tenantUpdates.divisionId = updates.divisionId;
            if (updates.teamId !== undefined) tenantUpdates.teamId = updates.teamId;

            if (Object.keys(tenantUpdates).length > 0) {
                const [updatedUserTenant] = await tx.update(userTenants)
                    .set(tenantUpdates)
                    .where(and(
                        eq(userTenants.userId, userId),
                        eq(userTenants.tenantId, tenantId)
                    ))
                    .returning();
                return updatedUserTenant;
            }

            // If no tenant updates, fetch and return existing
            return await tx.query.userTenants.findFirst({
                where: and(eq(userTenants.userId, userId), eq(userTenants.tenantId, tenantId))
            });
        });
    }

    async deleteMember(userId: string, tenantId: string): Promise<boolean> {
        // Soft delete by setting status to 'inactive'
        const [updated] = await db.update(userTenants)
            .set({ status: 'inactive' })
            .where(and(
                eq(userTenants.userId, userId),
                eq(userTenants.tenantId, tenantId)
            ))
            .returning();

        return !!updated;
    }
}
