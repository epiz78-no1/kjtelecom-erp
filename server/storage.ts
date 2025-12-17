import { 
  type User, type InsertUser,
  type Division, type InsertDivision,
  type Team, type InsertTeam,
  users, divisions, teams
} from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  getDivisions(): Promise<Division[]>;
  getDivision(id: string): Promise<Division | undefined>;
  updateDivision(id: string, name: string): Promise<Division | undefined>;
  initializeDivisions(): Promise<void>;
  
  getTeams(): Promise<Team[]>;
  getTeamsByDivision(divisionId: string): Promise<Team[]>;
  getTeam(id: string): Promise<Team | undefined>;
  createTeam(team: InsertTeam): Promise<Team>;
  updateTeam(id: string, updates: Partial<InsertTeam>): Promise<Team | undefined>;
  deleteTeam(id: string): Promise<boolean>;
  initializeTeams(): Promise<void>;
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

  async updateDivision(id: string, name: string): Promise<Division | undefined> {
    const [division] = await db
      .update(divisions)
      .set({ name })
      .where(eq(divisions.id, id))
      .returning();
    return division;
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
}

export const storage = new DatabaseStorage();
