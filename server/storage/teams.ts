import {
    type Division, type InsertDivision,
    type Team, type InsertTeam,
    type Position, type InsertPosition,
    divisions, teams, positions, userTenants
} from "../../shared/schema.js";
import { db } from "../db.js";
import { eq, and, asc } from "drizzle-orm";

export class TeamStorage {
    // Divisions
    async getDivisions(tenantId: string): Promise<Division[]> {
        return await db.select().from(divisions).where(eq(divisions.tenantId, tenantId));
    }

    async getDivision(id: string, tenantId: string): Promise<Division | undefined> {
        const [division] = await db.select().from(divisions).where(and(eq(divisions.id, id), eq(divisions.tenantId, tenantId)));
        return division;
    }

    async createDivision(name: string, tenantId: string): Promise<Division> {
        const [division] = await db.insert(divisions).values({
            name,
            tenantId
        }).returning();
        return division;
    }

    async updateDivision(id: string, name: string, tenantId: string): Promise<Division | undefined> {
        const [division] = await db.update(divisions)
            .set({ name })
            .where(and(eq(divisions.id, id), eq(divisions.tenantId, tenantId)))
            .returning();
        return division;
    }

    async deleteDivision(id: string, tenantId: string): Promise<boolean> {
        const [deleted] = await db.delete(divisions)
            .where(and(eq(divisions.id, id), eq(divisions.tenantId, tenantId)))
            .returning();
        return !!deleted;
    }

    async initializeDivisions(): Promise<void> {
        // Legacy support
    }

    // Teams
    async getTeams(tenantId: string): Promise<Team[]> {
        return await db.select().from(teams).where(eq(teams.tenantId, tenantId));
    }

    async getTeamsByDivision(divisionId: string, tenantId: string): Promise<Team[]> {
        return await db.select().from(teams).where(and(eq(teams.divisionId, divisionId), eq(teams.tenantId, tenantId)));
    }

    async getTeam(id: string, tenantId: string): Promise<Team | undefined> {
        const [team] = await db.select().from(teams).where(and(eq(teams.id, id), eq(teams.tenantId, tenantId)));
        return team;
    }

    async createTeam(team: InsertTeam, memberIds?: string[]): Promise<Team> {
        return await db.transaction(async (tx) => {
            const [newTeam] = await tx.insert(teams).values(team).returning();

            if (memberIds && memberIds.length > 0) {
                // Update users to belong to this team
                for (const userId of memberIds) {
                    // Verify user belongs to tenant? Assuming yes.
                    await tx.update(userTenants)
                        .set({
                            teamId: newTeam.id,
                            divisionId: team.divisionId
                        })
                        .where(and(
                            eq(userTenants.userId, userId),
                            eq(userTenants.tenantId, team.tenantId!)
                        ));
                }
            }
            return newTeam;
        });
    }

    async updateTeam(id: string, updates: Partial<InsertTeam>, tenantId: string, memberIds?: string[]): Promise<Team | undefined> {
        return await db.transaction(async (tx) => {
            const [updatedTeam] = await tx.update(teams)
                .set(updates)
                .where(and(eq(teams.id, id), eq(teams.tenantId, tenantId)))
                .returning();

            if (!updatedTeam) return undefined;

            if (memberIds) {
                // 1. Clear existing members of this team for this tenant
                // Wait, members might have been removed. 
                // We set their teamId to null if they are not in new list but were in this team?
                // Logic: Set teamId=null where teamId = id AND userId NOT IN memberIds

                // However, simple approach:
                // Set all current team members to null
                await tx.update(userTenants)
                    .set({ teamId: null })
                    .where(and(
                        eq(userTenants.teamId, id),
                        eq(userTenants.tenantId, tenantId)
                    ));

                // 2. Add new members
                if (memberIds.length > 0) {
                    for (const userId of memberIds) {
                        await tx.update(userTenants)
                            .set({
                                teamId: id,
                                divisionId: updatedTeam.divisionId
                            })
                            .where(and(
                                eq(userTenants.userId, userId),
                                eq(userTenants.tenantId, tenantId)
                            ));
                    }
                }
            }
            return updatedTeam;
        });
    }

    async deleteTeam(id: string, tenantId: string): Promise<boolean> {
        const [deleted] = await db.delete(teams)
            .where(and(eq(teams.id, id), eq(teams.tenantId, tenantId)))
            .returning();
        return !!deleted;
    }

    async initializeTeams(): Promise<void> {
        // Legacy
    }

    // Admin: Positions
    async getPositions(tenantId: string): Promise<Position[]> {
        return await db.select().from(positions)
            .where(eq(positions.tenantId, tenantId))
            .orderBy(asc(positions.rankOrder));
    }

    async getPosition(id: string, tenantId: string): Promise<Position | undefined> {
        const [position] = await db.select().from(positions).where(and(eq(positions.id, id), eq(positions.tenantId, tenantId)));
        return position;
    }

    async createPosition(position: InsertPosition): Promise<Position> {
        const [newPosition] = await db.insert(positions).values(position).returning();
        return newPosition;
    }

    async updatePosition(id: string, updates: Partial<InsertPosition>, tenantId: string): Promise<Position | undefined> {
        const [updated] = await db.update(positions)
            .set(updates)
            .where(and(eq(positions.id, id), eq(positions.tenantId, tenantId)))
            .returning();
        return updated;
    }

    async deletePosition(id: string, tenantId: string): Promise<boolean> {
        const [deleted] = await db.delete(positions)
            .where(and(eq(positions.id, id), eq(positions.tenantId, tenantId)))
            .returning();
        return !!deleted;
    }
}
