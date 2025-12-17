import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertTeamSchema } from "@shared/schema";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  await storage.initializeDivisions();
  await storage.initializeTeams();

  app.get("/api/divisions", async (req, res) => {
    const divisions = await storage.getDivisions();
    res.json(divisions);
  });

  app.post("/api/divisions", async (req, res) => {
    const { name } = req.body;
    
    if (!name || typeof name !== "string") {
      return res.status(400).json({ error: "Name is required" });
    }

    const division = await storage.createDivision(name);
    res.status(201).json(division);
  });

  app.patch("/api/divisions/:id", async (req, res) => {
    const { id } = req.params;
    const { name } = req.body;
    
    if (!name || typeof name !== "string") {
      return res.status(400).json({ error: "Name is required" });
    }

    const division = await storage.updateDivision(id, name);
    if (!division) {
      return res.status(404).json({ error: "Division not found" });
    }
    res.json(division);
  });

  app.delete("/api/divisions/:id", async (req, res) => {
    const { id } = req.params;
    const success = await storage.deleteDivision(id);
    
    if (!success) {
      return res.status(404).json({ error: "Division not found" });
    }
    res.status(204).send();
  });

  app.get("/api/teams", async (req, res) => {
    const { divisionId } = req.query;
    let teamList;
    
    if (divisionId && typeof divisionId === "string") {
      teamList = await storage.getTeamsByDivision(divisionId);
    } else {
      teamList = await storage.getTeams();
    }
    
    const divisions = await storage.getDivisions();
    const divisionMap = new Map(divisions.map(d => [d.id, d.name]));
    
    const teamsWithDivisionName = teamList.map(team => ({
      ...team,
      divisionName: divisionMap.get(team.divisionId) || "",
    }));
    
    res.json(teamsWithDivisionName);
  });

  app.post("/api/teams", async (req, res) => {
    const parseResult = insertTeamSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: parseResult.error.message });
    }

    const team = await storage.createTeam(parseResult.data);
    const division = await storage.getDivision(team.divisionId);
    
    res.status(201).json({
      ...team,
      divisionName: division?.name || "",
    });
  });

  app.patch("/api/teams/:id", async (req, res) => {
    const { id } = req.params;
    const updates = req.body;

    const team = await storage.updateTeam(id, updates);
    if (!team) {
      return res.status(404).json({ error: "Team not found" });
    }
    
    const division = await storage.getDivision(team.divisionId);
    res.json({
      ...team,
      divisionName: division?.name || "",
    });
  });

  app.delete("/api/teams/:id", async (req, res) => {
    const { id } = req.params;
    const success = await storage.deleteTeam(id);
    
    if (!success) {
      return res.status(404).json({ error: "Team not found" });
    }
    res.status(204).send();
  });

  return httpServer;
}
